import type {
  Exercise,
  ExerciseInput,
  ExerciseSession,
  GymExport,
  LastWeights,
  Routine,
  Section,
  Workout,
  WorkoutSet,
} from './types';

/**
 * Contrato de acceso a datos del módulo Gym.
 * Las pantallas no lo usan directamente: pasan por `hooks.ts`.
 * Una futura implementación con Supabase debe cumplir esta misma interfaz.
 */
export interface GymRepository {
  // Rutinas
  listRoutines(): Promise<Routine[]>;
  getRoutine(id: string): Promise<Routine | undefined>;
  createRoutine(name: string): Promise<Routine>;
  renameRoutine(id: string, name: string): Promise<void>;
  /** Oculta la rutina, sus secciones y sus ejercicios. El historial se conserva. */
  archiveRoutine(id: string): Promise<void>;

  // Secciones
  listSections(routineId: string): Promise<Section[]>;
  createSection(routineId: string, name: string): Promise<Section>;
  renameSection(id: string, name: string): Promise<void>;
  /** Mueve la sección una posición arriba (-1) o abajo (+1). */
  moveSection(id: string, direction: -1 | 1): Promise<void>;
  /** Borra la sección; sus ejercicios pasan a "sin sección". */
  archiveSection(id: string): Promise<void>;

  // Ejercicios
  listExercises(routineId: string): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | undefined>;
  addExercise(routineId: string, input: ExerciseInput): Promise<Exercise>;
  updateExercise(id: string, input: ExerciseInput): Promise<void>;
  archiveExercise(id: string): Promise<void>;

  // Entrenamientos
  /** Entrenamiento de esa rutina en ese día, si existe. */
  findWorkout(routineId: string, date: string): Promise<Workout | undefined>;
  getOrCreateWorkout(routineId: string, date: string): Promise<Workout>;
  /** Marca el entrenamiento como terminado (o lo borra si no tiene series). */
  finishWorkout(id: string): Promise<void>;
  /** Fecha del último entrenamiento (con series) de cada rutina. */
  lastWorkoutDates(): Promise<Record<string, string>>;

  // Series
  listSets(workoutId: string): Promise<WorkoutSet[]>;
  addSet(
    workoutId: string,
    exerciseId: string,
    weight: number | null,
    partnerWeight: number | null,
    reps: number,
  ): Promise<WorkoutSet>;
  deleteSet(id: string): Promise<void>;
  /** Últimos pesos usados (míos y de la pareja), o los iniciales del ejercicio. */
  lastWeights(exerciseId: string): Promise<LastWeights>;

  // Estadísticas
  /** Sesiones con series de un ejercicio, de más antigua a más reciente. */
  exerciseHistory(exerciseId: string): Promise<ExerciseSession[]>;

  // Copia de seguridad
  exportAll(): Promise<GymExport>;
  importAll(data: GymExport): Promise<void>;
  seed(): Promise<void>;
}
