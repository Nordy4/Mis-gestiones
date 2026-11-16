import { deudasRepo } from './hooks';
import type { DeudasExport } from './types';

function assertArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Copia de Deudas no válida: falta "${name}"`);
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
      throw new Error(`Copia de Deudas no válida: elemento sin id en "${name}"`);
    }
  }
  return value;
}

/** Comprobación mínima del formato antes de sustituir los datos. */
export function parseDeudasExport(data: unknown): DeudasExport {
  if (!data || typeof data !== 'object') throw new Error('Copia de Deudas no válida');
  const d = data as Record<string, unknown>;
  return {
    debtors: assertArray(d.debtors, 'debtors') as DeudasExport['debtors'],
    movements: assertArray(d.movements, 'movements') as DeudasExport['movements'],
  };
}

export const deudasData = {
  exportData: () => deudasRepo.exportAll(),
  importData: (data: unknown) => deudasRepo.importAll(parseDeudasExport(data)),
};
