import { gymRepo } from './hooks';
import type { AnyGymData } from './normalize';
import { upgradeGymData } from './dexieRepository';

function assertArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Copia de Gym no válida: falta "${name}"`);
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
      throw new Error(`Copia de Gym no válida: elemento sin id en "${name}"`);
    }
  }
  return value;
}

const optionalArray = (value: unknown, name: string) => (value === undefined ? undefined : assertArray(value, name));

/**
 * Comprobación mínima del formato antes de sustituir los datos.
 * Acepta copias de cualquier versión (con `sets` antiguos o con `weightLog`).
 */
export function parseGymExport(data: unknown): AnyGymData {
  if (!data || typeof data !== 'object') throw new Error('Copia de Gym no válida');
  const d = data as Record<string, unknown>;
  return {
    routines: assertArray(d.routines, 'routines') as AnyGymData['routines'],
    sections: optionalArray(d.sections, 'sections') as AnyGymData['sections'],
    exercises: assertArray(d.exercises, 'exercises') as AnyGymData['exercises'],
    workouts: assertArray(d.workouts, 'workouts') as AnyGymData['workouts'],
    weightLog: optionalArray(d.weightLog, 'weightLog') as AnyGymData['weightLog'],
    sets: optionalArray(d.sets, 'sets') as AnyGymData['sets'],
  };
}

export const gymData = {
  exportData: () => gymRepo.exportAll(),
  importData: (data: unknown) => gymRepo.importAll(parseGymExport(data)),
  seed: () => gymRepo.seed(),
  upgrade: upgradeGymData,
};
