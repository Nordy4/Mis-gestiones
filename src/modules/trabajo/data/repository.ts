import type { Shift, ShiftInput, TrabajoExport } from './types';

/**
 * Contrato de acceso a datos del módulo Trabajo.
 * Las pantallas no lo usan directamente: pasan por `hooks.ts`.
 */
export interface TrabajoRepository {
  /** El tramo abierto (estoy dentro), si lo hay. */
  getOpenShift(): Promise<Shift | undefined>;
  /** Fichar entrada ahora. Falla si ya hay un tramo abierto. */
  clockIn(): Promise<Shift>;
  /** Fichar salida ahora del tramo abierto. */
  clockOut(id: string): Promise<void>;

  /** Tramos con fecha entre `from` y `to` (YYYY-MM-DD, incluidas), ordenados por entrada. */
  listShifts(from: string, to: string): Promise<Shift[]>;
  /** Añadir horas a mano. */
  addShift(input: ShiftInput): Promise<Shift>;
  /** Corregir entrada, salida o nota de un tramo ya grabado. */
  updateShift(id: string, input: ShiftInput): Promise<void>;
  deleteShift(id: string): Promise<void>;

  exportAll(): Promise<TrabajoExport>;
  importAll(data: TrabajoExport): Promise<void>;
}
