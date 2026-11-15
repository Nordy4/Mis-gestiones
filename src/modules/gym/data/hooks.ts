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

export const useRoutine = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await gymRepo.getRoutine(id)) ?? null) : null), [id]);

export const useExercises = (routineId: string | undefined) =>
  useLiveQuery(() => (routineId ? gymRepo.listExercises(routineId) : []), [routineId]);

export const useExercise = (id: string | undefined) =>
  useLiveQuery(async () => (id ? ((await gymRepo.getExercise(id)) ?? null) : null), [id]);

export const useLastWorkoutDates = () => useLiveQuery(() => gymRepo.lastWorkoutDates(), []);

/** Entrenamiento de la rutina en esa fecha (null si no existe). */
export const useWorkout = (routineId: string | undefined, date: string) =>
  useLiveQuery(
    async () => (routineId ? ((await gymRepo.findWorkout(routineId, date)) ?? null) : null),
    [routineId, date],
  );

export const useWorkoutSets = (workoutId: string | undefined | null) =>
  useLiveQuery(() => (workoutId ? gymRepo.listSets(workoutId) : []), [workoutId]);

export const useSections = (routineId: string | undefined) =>
  useLiveQuery(() => (routineId ? gymRepo.listSections(routineId) : []), [routineId]);

export const useLastWeights = (exerciseId: string) =>
  useLiveQuery(() => gymRepo.lastWeights(exerciseId), [exerciseId]);

export const useExerciseHistory = (exerciseId: string | undefined) =>
  useLiveQuery(() => (exerciseId ? gymRepo.exerciseHistory(exerciseId) : []), [exerciseId]);
