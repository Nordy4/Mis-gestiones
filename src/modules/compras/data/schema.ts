/**
 * Tablas Dexie del módulo Compras. Prefijo obligatorio `compras_`.
 * Si cambias algo aquí, sube DB_VERSION en src/core/db/setup.ts.
 */
export const comprasSchema = {
  compras_products: 'id, createdAt',
};
