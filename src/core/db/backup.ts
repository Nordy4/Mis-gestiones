import { useLiveQuery } from 'dexie-react-hooks';
import { modules } from '@/modules/registry';
import { todayKey } from '@/core/lib/format';
import { nowIso } from '@/core/lib/ids';
import { metaTable } from './db';

export const BACKUP_APP = 'mi-vida';
export const BACKUP_VERSION = 1;

/** Formato del archivo de copia de seguridad. */
export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  /** Datos de cada módulo, por id de módulo (formato definido por cada módulo). */
  modules: Record<string, unknown>;
}

const LAST_EXPORT_KEY = 'lastExportAt';

export async function createBackup(): Promise<BackupFile> {
  const data: Record<string, unknown> = {};
  for (const mod of modules) {
    if (mod.data) data[mod.id] = await mod.data.exportData();
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: nowIso(), modules: data };
}

function backupToFile(backup: BackupFile): File {
  const json = JSON.stringify(backup, null, 2);
  return new File([json], `mi-vida-${todayKey()}.json`, { type: 'application/json' });
}

async function markExported() {
  await metaTable().put({ key: LAST_EXPORT_KEY, value: nowIso() });
}

/** Descarga la copia como archivo .json. */
export async function downloadBackup(): Promise<void> {
  const file = backupToFile(await createBackup());
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await markExported();
}

/** ¿Puede el navegador compartir archivos? (Android Chrome: sí → Drive, correo…) */
export function canShareFiles(): boolean {
  try {
    const probe = new File(['{}'], 'x.json', { type: 'application/json' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Abre el menú de compartir del sistema con la copia. Devuelve false si se cancela. */
export async function shareBackup(): Promise<boolean> {
  const file = backupToFile(await createBackup());
  try {
    await navigator.share({ files: [file], title: 'Copia de Mi Vida' });
    await markExported();
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    throw err;
  }
}

/** Lee y valida un archivo de copia (no escribe nada). */
/** Una copia real ocupa KB; más de esto es un archivo equivocado o malicioso. */
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export async function readBackupFile(file: File): Promise<BackupFile> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('El archivo es demasiado grande para ser una copia de Mi Vida.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const b = parsed as Partial<BackupFile>;
  if (!b || b.app !== BACKUP_APP || typeof b.modules !== 'object' || b.modules === null) {
    throw new Error('El archivo no es una copia de seguridad de Mi Vida.');
  }
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new Error('La copia es de una versión más nueva de la app. Actualiza la app primero.');
  }
  return b as BackupFile;
}

/**
 * Sustituye los datos de cada módulo presente en la copia.
 * Los módulos que no aparecen en la copia no se tocan.
 */
export async function restoreBackup(backup: BackupFile): Promise<string[]> {
  const restored: string[] = [];
  for (const mod of modules) {
    if (!mod.data || !(mod.id in backup.modules)) continue;
    await mod.data.importData(backup.modules[mod.id]);
    // Evita que el seed vuelva a ejecutarse sobre los datos restaurados.
    await metaTable().put({ key: `seeded:${mod.id}`, value: nowIso() });
    restored.push(mod.name);
  }
  return restored;
}

/** Fecha ISO de la última exportación (null si nunca; undefined mientras carga). */
export function useLastExportDate(): string | null | undefined {
  return useLiveQuery(async () => {
    const entry = await metaTable().get(LAST_EXPORT_KEY);
    return typeof entry?.value === 'string' ? entry.value : null;
  }, []);
}
