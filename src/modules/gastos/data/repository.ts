import type { Expense, ExpenseInput, GastosExport } from './types';

/**
 * Contrato de acceso a datos del módulo Gastos fijos.
 * Las pantallas no lo usan directamente: pasan por `hooks.ts`.
 */
export interface GastosRepository {
  /** Gastos activos (sin archivar). */
  listExpenses(): Promise<Expense[]>;
  addExpense(input: ExpenseInput): Promise<Expense>;
  updateExpense(id: string, input: ExpenseInput): Promise<void>;
  /** Archiva el gasto (deja de contar y de salir en el calendario). */
  archiveExpense(id: string): Promise<void>;

  exportAll(): Promise<GastosExport>;
  importAll(data: GastosExport): Promise<void>;
}
