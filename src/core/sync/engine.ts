import type { Session } from '@supabase/supabase-js';
import { db, metaTable, syncShadowTable } from '@/core/db/db';
import { modules } from '@/modules/registry';
import { onLocalChange, whileApplyingRemote } from './changes';
import { SYNC_TABLE, supabase } from './client';
import { hashJson, stableStringify } from './stable';

/**
 * Sincronización "primero local" con Supabase.
 *
 * - La app sigue leyendo y escribiendo solo en IndexedDB (repositorios Dexie de cada módulo).
 * - Cada registro de cada tabla de módulo se guarda en la nube como una fila de `sync_records`.
 * - Subir: se compara cada registro con su huella en `core_sync_shadow` (lo último sincronizado);
 *   los distintos se suben y los que ya no existen se marcan como borrados.
 * - Bajar: filas cambiadas en el servidor desde el último cursor (con margen) → se aplican en local.
 * - Primera vez en un dispositivo: si la cuenta está vacía se sube todo; si tiene datos,
 *   sustituyen a los de este dispositivo.
 * Si gana un cambio sobre otro, gana el último en subir (uso de una sola persona).
 */

const LAST_PULL_KEY = 'sync:lastPull';
const LAST_SYNC_KEY = 'sync:lastSyncAt';
/** Margen al bajar cambios, por si el servidor confirma escrituras fuera de orden. */
const PULL_OVERLAP_MS = 5 * 60_000;
const PAGE = 1000;
const CHUNK = 500;

interface RemoteRow {
  tbl: string;
  id: string;
  data: Record<string, unknown> | null;
  deleted: boolean;
  updated_at: string;
}

// ---------- Estado observable (para Ajustes) ----------

export interface SyncStatus {
  state: 'signed-out' | 'idle' | 'syncing' | 'error';
  email: string | null;
  lastSyncAt: string | null;
  error: string | null;
}

let status: SyncStatus = { state: 'signed-out', email: null, lastSyncAt: null, error: null };
const statusListeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  for (const fn of statusListeners) fn();
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(fn: () => void): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

// ---------- Utilidades ----------

/** Tablas que se sincronizan: todas las de los módulos registrados. */
function syncedTables(): string[] {
  return modules.flatMap((m) => Object.keys(m.data?.schema ?? {}));
}

const keyOf = (tbl: string, id: string) => `${tbl}/${id}`;

function errorText(err: unknown): string {
  if (!navigator.onLine) return 'Sin conexión. Se sincronizará al volver a tener internet.';
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

async function currentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------- Subir ----------

async function push(userId: string): Promise<number> {
  const shadow = new Map((await syncShadowTable().toArray()).map((e) => [e.key, e.hash]));
  const seen = new Set<string>();
  const changed: { key: string; hash: string; row: object }[] = [];

  for (const tbl of syncedTables()) {
    const rows = await db.table<Record<string, unknown>>(tbl).toArray();
    for (const r of rows) {
      const id = String(r.id);
      const key = keyOf(tbl, id);
      seen.add(key);
      const hash = hashJson(stableStringify(r));
      if (shadow.get(key) !== hash) changed.push({ key, hash, row: { user_id: userId, tbl, id, data: r, deleted: false } });
    }
  }
  for (const key of shadow.keys()) {
    if (seen.has(key)) continue;
    const i = key.indexOf('/');
    changed.push({
      key,
      hash: '',
      row: { user_id: userId, tbl: key.slice(0, i), id: key.slice(i + 1), data: null, deleted: true },
    });
  }

  for (let i = 0; i < changed.length; i += CHUNK) {
    const chunk = changed.slice(i, i + CHUNK);
    const { error } = await supabase.from(SYNC_TABLE).upsert(
      chunk.map((c) => c.row),
      { onConflict: 'user_id,tbl,id' },
    );
    if (error) throw error;
    const done = chunk.filter((c) => c.hash);
    await syncShadowTable().bulkPut(done.map((c) => ({ key: c.key, hash: c.hash })));
    await syncShadowTable().bulkDelete(chunk.filter((c) => !c.hash).map((c) => c.key));
  }
  return changed.length;
}

// ---------- Bajar ----------

async function fetchRemote(userId: string, since: string | null): Promise<RemoteRow[]> {
  const all: RemoteRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from(SYNC_TABLE)
      .select('tbl,id,data,deleted,updated_at')
      .eq('user_id', userId)
      .order('updated_at')
      .order('tbl')
      .order('id')
      .range(from, from + PAGE - 1);
    if (since) q = q.gte('updated_at', since);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data as RemoteRow[]));
    if (data.length < PAGE) return all;
  }
}

/** Aplica filas del servidor en local. Con `replace`, vacía antes las tablas de los módulos. */
async function applyRemote(rows: RemoteRow[], replace: boolean): Promise<number> {
  const tables = syncedTables();
  const known = new Set(tables);
  let applied = 0;

  await whileApplyingRemote(() =>
    db.transaction('rw', [...tables, 'core_sync_shadow'], async () => {
      if (replace) {
        for (const t of tables) await db.table(t).clear();
        await syncShadowTable().clear();
      }
      const shadow = new Map((await syncShadowTable().toArray()).map((e) => [e.key, e.hash]));
      for (const r of rows) {
        if (!known.has(r.tbl)) continue; // tabla de una versión más nueva de la app
        const key = keyOf(r.tbl, r.id);
        if (r.deleted || !r.data) {
          if (shadow.has(key) || (await db.table(r.tbl).get(r.id))) {
            await db.table(r.tbl).delete(r.id);
            await syncShadowTable().delete(key);
            shadow.delete(key);
            applied++;
          }
          continue;
        }
        const hash = hashJson(stableStringify(r.data));
        if (shadow.get(key) === hash) continue; // ya lo tenemos (p. ej. lo subimos nosotros)
        await db.table(r.tbl).put(r.data);
        await syncShadowTable().put({ key, hash });
        shadow.set(key, hash);
        applied++;
      }
    }),
  );
  return applied;
}

async function pull(userId: string): Promise<number> {
  const cursor = (await metaTable().get(LAST_PULL_KEY))?.value as string | undefined;
  const since = cursor ? new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString() : null;
  const rows = await fetchRemote(userId, since);
  const applied = await applyRemote(rows, false);
  const newest = rows.at(-1)?.updated_at;
  if (newest && (!cursor || newest > cursor)) await metaTable().put({ key: LAST_PULL_KEY, value: newest });
  return applied;
}

/** Primera sincronización en este dispositivo. */
async function firstSync(userId: string) {
  const { count, error } = await supabase
    .from(SYNC_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('deleted', false);
  if (error) throw error;

  if (!count) {
    // Cuenta vacía: se suben los datos de este dispositivo.
    await syncShadowTable().clear();
    await push(userId);
    await pull(userId);
    return;
  }
  // La cuenta ya tiene datos: sustituyen a los de este dispositivo.
  const rows = (await fetchRemote(userId, null)).filter((r) => !r.deleted);
  await applyRemote(rows, true);
  for (const m of modules) {
    if (m.data?.seed) await metaTable().put({ key: `seeded:${m.id}`, value: new Date().toISOString() });
  }
  const newest = rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), '');
  if (newest) await metaTable().put({ key: LAST_PULL_KEY, value: newest });
}

// ---------- Orquestación ----------

let running: Promise<void> | null = null;
let again = false;

async function runSync(): Promise<void> {
  const session = await currentSession();
  if (!session) {
    setStatus({ state: 'signed-out', email: null, error: null });
    return;
  }
  setStatus({ state: 'syncing', email: session.user.email ?? null, error: null });
  try {
    const userId = session.user.id;
    if (!(await metaTable().get(LAST_PULL_KEY))) await firstSync(userId);
    else {
      await push(userId);
      await pull(userId);
    }
    const now = new Date().toISOString();
    await metaTable().put({ key: LAST_SYNC_KEY, value: now });
    setStatus({ state: 'idle', lastSyncAt: now, error: null });
  } catch (err) {
    console.error('[sync]', err);
    setStatus({ state: 'error', error: errorText(err) });
  }
}

/** Sincroniza ya. Si hay una en curso, encadena otra al terminar. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await runSync();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

let debounce: ReturnType<typeof setTimeout> | undefined;
function scheduleSync(delayMs = 2000) {
  clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), delayMs);
}

let started = false;

/** Arranca la sincronización automática (al abrir, al cambiar datos, al volver a la app o a la red). */
export function startSync() {
  if (started) return;
  started = true;

  void (async () => {
    const last = (await metaTable().get(LAST_SYNC_KEY))?.value;
    const session = await currentSession();
    setStatus({
      state: session ? 'idle' : 'signed-out',
      email: session?.user.email ?? null,
      lastSyncAt: session && typeof last === 'string' ? last : null,
    });
    if (session) void syncNow();
  })();

  onLocalChange(() => scheduleSync());
  window.addEventListener('online', () => scheduleSync(500));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(500);
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 5 * 60_000);
}

// ---------- Sesión ----------

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message);
  }
  await syncNow();
}

/** Cierra sesión. Los datos se quedan en este dispositivo; deja de sincronizar. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
  await syncShadowTable().clear();
  await metaTable().bulkDelete([LAST_PULL_KEY, LAST_SYNC_KEY]);
  setStatus({ state: 'signed-out', email: null, lastSyncAt: null, error: null });
}
