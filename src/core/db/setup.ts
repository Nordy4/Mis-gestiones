import { modules } from '@/modules/registry';
import { changeNotifier } from '@/core/sync/changes';
import { coreSchema, db, metaTable } from './db';

/**
 * Versión del esquema de IndexedDB.
 * SÚBELA en 1 cada vez que cambies el `schema` de cualquier módulo
 * (tabla nueva, índice nuevo...). Dexie calcula la migración solo.
 */
// Historial: 1 = inicial · 2 = gym_sections · 3 = gym cronómetro + gym_weight_log · 4 = módulo deudas · 5 = módulo trabajo
// · 6 = trabajo: comida (breakMinutes) en registros antiguos (solo migración de datos)
// · 7 = core_sync_shadow (sincronización con Supabase) · 8 = módulo compras
// · 9 = módulo gastos fijos
export const DB_VERSION = 9;

let initialized: Promise<void> | null = null;

function buildSchema(): Record<string, string> {
  const schema: Record<string, string> = { ...coreSchema };
  for (const mod of modules) {
    for (const [table, def] of Object.entries(mod.data?.schema ?? {})) {
      if (!table.startsWith(`${mod.id}_`)) {
        throw new Error(`La tabla "${table}" del módulo "${mod.id}" debe empezar por "${mod.id}_"`);
      }
      if (table in schema) throw new Error(`Tabla duplicada: ${table}`);
      schema[table] = def;
    }
  }
  return schema;
}

/** Declara las tablas, abre la BD y carga los datos iniciales de cada módulo (una vez). */
export function initDatabase(): Promise<void> {
  initialized ??= (async () => {
    db.version(DB_VERSION)
      .stores(buildSchema())
      // Solo corre al subir de versión una BD existente. Cada módulo migra sus datos.
      .upgrade(async (tx) => {
        for (const mod of modules) await mod.data?.upgrade?.(tx);
      });
    // Avisa a la sincronización de cada escritura en las tablas de los módulos.
    db.use(changeNotifier);
    await db.open();

    for (const mod of modules) {
      if (!mod.data?.seed) continue;
      const key = `seeded:${mod.id}`;
      if (await metaTable().get(key)) continue;
      await mod.data.seed();
      await metaTable().put({ key, value: new Date().toISOString() });
    }

    // Pide al navegador que no borre los datos si falta espacio.
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* no disponible: no pasa nada */
    }
  })();
  return initialized;
}
