import { trabajoRepo } from './hooks';
import { upgradeTrabajoData } from './dexieRepository';
import type { TrabajoExport } from './types';

/** Comprobación mínima del formato antes de sustituir los datos. */
export function parseTrabajoExport(data: unknown): TrabajoExport {
  const shifts = (data as { shifts?: unknown } | null)?.shifts;
  if (!Array.isArray(shifts)) throw new Error('Copia de Trabajo no válida: falta "shifts"');
  for (const s of shifts) {
    const ok =
      s && typeof s === 'object' && typeof s.id === 'string' && typeof s.startAt === 'string' && typeof s.date === 'string';
    if (!ok) throw new Error('Copia de Trabajo no válida: registro incompleto');
  }
  return { shifts: shifts as TrabajoExport['shifts'] };
}

export const trabajoData = {
  exportData: () => trabajoRepo.exportAll(),
  importData: (data: unknown) => trabajoRepo.importAll(parseTrabajoExport(data)),
  upgrade: upgradeTrabajoData,
};
