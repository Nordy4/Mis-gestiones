import type { Debtor, DebtorSummary, DeudasExport, Movement, MovementInput } from './types';

/**
 * Contrato de acceso a datos del módulo Deudas.
 * Las pantallas no lo usan directamente: pasan por `hooks.ts`.
 */
export interface DeudasRepository {
  /** Personas visibles con su saldo, de mayor a menor deuda. */
  listSummaries(): Promise<DebtorSummary[]>;
  getDebtor(id: string): Promise<Debtor | undefined>;
  /** Crea la persona y, si se indica, su primera deuda. */
  createDebtor(name: string, firstDebt?: MovementInput): Promise<Debtor>;
  renameDebtor(id: string, name: string): Promise<void>;
  /** Oculta la persona (sus movimientos se conservan en la copia de seguridad). */
  archiveDebtor(id: string): Promise<void>;

  /** Movimientos de una persona, del más reciente al más antiguo. */
  listMovements(debtorId: string): Promise<Movement[]>;
  addMovement(debtorId: string, input: MovementInput): Promise<Movement>;
  updateMovement(id: string, input: MovementInput): Promise<void>;
  deleteMovement(id: string): Promise<void>;

  exportAll(): Promise<DeudasExport>;
  importAll(data: DeudasExport): Promise<void>;
}
