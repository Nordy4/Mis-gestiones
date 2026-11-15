import { gymRepo } from './hooks';
import type { GymExport } from './types';

function assertArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Copia de Gym no válida: falta "${name}"`);
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
      throw new Error(`Copia de Gym no válida: elemento sin id en "${name}"`);
    }
  }
  return value;
}

/** Comprobación mínima del formato antes de sustituir los datos. */
export function parseGymExport(data: unknown): GymExport {
  if (!data || typeof data !== 'object') throw new Error('Copia de Gym no válida');
  const d = data as Record<string, unknown>;
  return {
    routines: assertArray(d.routines, 'routines') as GymExport['routines'],
    exercises: assertArray(d.exercises, 'exercises') as GymExport['exercises'],
    workouts: assertArray(d.workouts, 'workouts') as GymExport['workouts'],
    sets: assertArray(d.sets, 'sets') as GymExport['sets'],
  };
}

export const gymData = {
  exportData: () => gymRepo.exportAll(),
  importData: (data: unknown) => gymRepo.importAll(parseGymExport(data)),
  seed: () => gymRepo.seed(),
};
