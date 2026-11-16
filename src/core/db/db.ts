import Dexie from 'dexie';

/**
 * Instancia única de IndexedDB. Aquí NO se declaran tablas: las declara
 * `setup.ts` juntando los esquemas de todos los módulos registrados.
 *
 * Solo deben importar este archivo las capas de datos (`modules/<x>/data/*`)
 * y el propio core. Las pantallas nunca usan Dexie directamente.
 */
export const db = new Dexie('mi-vida');

export interface MetaEntry {
  key: string;
  value: unknown;
}

/** Última versión sincronizada de cada registro: `<tabla>/<id>` → huella del contenido. */
export interface SyncShadowEntry {
  key: string;
  hash: string;
}

export const coreSchema = {
  core_meta: 'key',
  core_sync_shadow: 'key',
};

export const metaTable = () => db.table<MetaEntry, string>('core_meta');
export const syncShadowTable = () => db.table<SyncShadowEntry, string>('core_sync_shadow');
