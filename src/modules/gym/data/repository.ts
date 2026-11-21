import type {
  Exercise,
  ExerciseInput,
  GymExport,
  Routine,
  Section,
  WeightLogEntry,
  Workout,
} from './types';
import type { AnyGymData } from './normalize';

/**
 * Contrato de acceso a datos del módulo Gym.
 * Las pantallas no lo usan directamente: pasan por `hooks.ts`.
 * Una futura implementación con Supabase debe cumplir esta misma interfaz.
 */
export interface GymRepository {
  // Rutinas
  /** Rutinas visibles; con `includeArchived` también las borradas (para el calendario). */
  listRoutines(includeArchived?: boolean): Promise<Routine[]>;
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

  // Ejercicios y pesos
  /** Ejercicios principales de la rutina (sin las variantes). */
  listExercises(routineId: string): Promise<Exercise[]>;
  /** Variantes activas de un ejercicio, por `order`. */
  listVariants(parentId: string): Promise<Exercise[]>;
  /** Número de variantes activas de cada ejercicio principal de la rutina. */
  variantCounts(routineId: string): Promise<Record<string, number>>;
  getExercise(id: string): Promise<Exercise | undefined>;
  addExercise(routineId: string, input: ExerciseInput): Promise<Exercise>;
  /**
   * Añade una variante al ejercicio `parentId` con solo su nombre (misma rutina y sección,
   * series/reps del principal y sin pesos: se ponen después en la fila de la rutina).
   */
  addVariant(parentId: string, name: string): Promise<Exercise>;
  /** Cambia solo el nombre (p. ej. de una variante). */
  renameExercise(id: string, name: string): Promise<void>;
  /** Elige la variante que muestra el ejercicio en la rutina (null = el propio ejercicio). */
  selectVariant(parentId: string, variantId: string | null): Promise<void>;
  /** Actualiza el ejercicio; si cambian los pesos, los apunta en el historial de hoy. */
  updateExercise(id: string, input: ExerciseInput): Promise<void>;
  /** Cambia solo los pesos actuales y los apunta en el historial de hoy. */
  setWeights(id: string, weight: number | null, partnerWeight: number | null): Promise<void>;
  /** Borra (archiva) el ejercicio y, si es principal, también sus variantes. */
  archiveExercise(id: string): Promise<void>;
  /**
   * Mueve el ejercicio una posición arriba (-1) o abajo (+1) dentro de su sección
   * (o, si es una variante, entre las variantes del mismo ejercicio).
   */
  moveExercise(id: string, direction: -1 | 1): Promise<void>;
  /** Historial de pesos de un ejercicio, del más antiguo al más reciente. */
  weightHistory(exerciseId: string): Promise<WeightLogEntry[]>;

  // Entrenamientos cronometrados
  /** El entrenamiento en curso (hay como mucho uno). */
  getActiveWorkout(): Promise<Workout | undefined>;
  /** Empieza a cronometrar. Falla si ya hay otro entrenamiento en curso. */
  startWorkout(routineId: string): Promise<Workout>;
  pauseWorkout(id: string): Promise<void>;
  resumeWorkout(id: string): Promise<void>;
  /** Para el cronómetro y guarda la duración. Devuelve el entreno terminado. */
  finishWorkout(id: string): Promise<Workout>;
  /** Borra un entrenamiento (en curso o ya registrado). */
  deleteWorkout(id: string): Promise<void>;
  /** Entrenamientos terminados con fecha entre `from` y `to` (YYYY-MM-DD, ambos incluidos). */
  listWorkouts(from: string, to: string): Promise<Workout[]>;
  /** Fecha del último entrenamiento terminado de cada rutina. */
  lastWorkoutDates(): Promise<Record<string, string>>;

  // Copia de seguridad
  exportAll(): Promise<GymExport>;
  /** Acepta también formatos antiguos (se normalizan). */
  importAll(data: AnyGymData): Promise<void>;
  seed(): Promise<void>;
}
