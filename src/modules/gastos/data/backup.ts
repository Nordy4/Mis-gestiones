import { gastosRepo } from './hooks';
import type { Expense, GastosExport } from './types';

/** Comprobación mínima del formato antes de sustituir los datos. */
export function parseGastosExport(data: unknown): GastosExport {
  const list = (data as { expenses?: unknown } | null)?.expenses;
  if (!Array.isArray(list)) throw new Error('Copia de Gastos fijos no válida: falta "expenses"');
  for (const e of list) {
    const ok =
      e &&
      typeof e === 'object' &&
      typeof e.id === 'string' &&
      typeof e.name === 'string' &&
      typeof e.amountCents === 'number' &&
      (e.period === 'monthly' || e.period === 'yearly') &&
      typeof e.startDate === 'string';
    if (!ok) throw new Error('Copia de Gastos fijos no válida: gasto incompleto');
  }
  return {
    expenses: (list as Expense[]).map((e) => ({ ...e, note: e.note ?? '', archivedAt: e.archivedAt ?? null })),
  };
}

export const gastosData = {
  exportData: () => gastosRepo.exportAll(),
  importData: (data: unknown) => gastosRepo.importAll(parseGastosExport(data)),
};
