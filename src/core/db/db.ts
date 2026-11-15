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

export const coreSchema = {
  core_meta: 'key',
};

export const metaTable = () => db.table<MetaEntry, string>('core_meta');
