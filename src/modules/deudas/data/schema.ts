/**
 * Tablas Dexie del módulo Deudas (prefijo obligatorio `deudas_`).
 * Si cambias algo aquí, sube DB_VERSION en src/core/db/setup.ts.
 */
export const deudasSchema = {
  deudas_debtors: 'id, name',
  deudas_movements: 'id, debtorId, [debtorId+date]',
};
