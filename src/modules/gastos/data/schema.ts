/**
 * Tablas Dexie del módulo Gastos fijos. Prefijo obligatorio `gastos_`.
 * Si cambias algo aquí, sube DB_VERSION en src/core/db/setup.ts.
 * (El calendario de Google lee `gastos_expenses` desde Supabase: no cambies su nombre.)
 */
export const gastosSchema = {
  gastos_expenses: 'id, name',
};
