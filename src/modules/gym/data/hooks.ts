import { useLiveQuery } from 'dexie-react-hooks';
import { dexieGymRepository } from './dexieRepository';
import type { GymRepository } from './repository';

/**
 * Punto de entrada de datos para las pantallas del módulo Gym.
 * Para migrar a Supabase: cambia `gymRepo` por la otra implementación y
 * sustituye useLiveQuery por el mecanismo de suscripción correspondiente.
 *
 * Los hooks devuelven `undefined` mientras cargan.
 */
export const gymRepo: GymRepository = dexieGymRepository;

export const useRoutines = () => useLiveQuery(() => gymRepo.listRoutines(), []);

/** Nombre de cada rutina por id, incluidas las borradas. */
export const useRoutineNames = () =>
  useLiveQuery(async () => {
    const all = await gymRepo.listRoutines(true);
    return Object.fromEntries(all.map((r) => [r.id, r.name])) as Record<string, string>;
  }, []);

export const useRoutine = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await gymRepo.getRoutine(id)) ?? null) : null), [id]);

export const useSections = (routineId: string | undefined) =>
  useLiveQuery(() => (routineId ? gymRepo.listSections(routineId) : []), [routineId]);

export const useExercises = (routineId: string | undefined) =>
  useLiveQuery(() => (routineId ? gymRepo.listExercises(routineId) : []), [routineId]);

export const useExercise = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await gymRepo.getExercise(id)) ?? null) : null), [id]);

export const useWeightHistory = (exerciseId: string | undefined) =>
  useLiveQuery(() => (exerciseId ? gymRepo.weightHistory(exerciseId) : []), [exerciseId]);

export const useLastWorkoutDates = () => useLiveQuery(() => gymRepo.lastWorkoutDates(), []);

/** Entrenamiento en curso (null si no hay ninguno). */
export const useActiveWorkout = () =>
  useLiveQuery(async () => (await gymRepo.getActiveWorkout()) ?? null, []);

/** Entrenamientos terminados entre dos fechas YYYY-MM-DD (incluidas). */
export const useWorkouts = (from: string, to: string) =>
  useLiveQuery(() => gymRepo.listWorkouts(from, to), [from, to]);
