/** Campos comunes a todas las entidades (pensados para sincronizar con Supabase en el futuro). */
interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Routine extends Entity {
  name: string;
  order: number;
  /** Si tiene valor, la rutina está "borrada" (oculta) pero conserva su historial. */
  archivedAt?: string | null;
}

export interface Exercise extends Entity {
  routineId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  /** Peso de partida (kg) para prerrellenar si aún no hay series registradas. */
  initialWeight: number | null;
  order: number;
  archivedAt?: string | null;
}

/** Una sesión de entrenamiento de una rutina en un día. */
export interface Workout extends Entity {
  routineId: string;
  /** Día local YYYY-MM-DD. */
  date: string;
  startedAt: string;
  finishedAt: string | null;
}

/** Una serie realizada de un ejercicio dentro de un entrenamiento. */
export interface WorkoutSet extends Entity {
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  /** kg; null = sin peso (p. ej. abdominales). */
  weight: number | null;
  reps: number;
}

export interface ExerciseInput {
  name: string;
  targetSets: number;
  targetReps: number;
  initialWeight: number | null;
}

/** Una sesión en el historial de un ejercicio. */
export interface ExerciseSession {
  workout: Workout;
  sets: WorkoutSet[];
  /** Peso máximo de la sesión (null si todas sin peso). */
  topWeight: number | null;
}

/** Formato de la copia de seguridad del módulo. */
export interface GymExport {
  routines: Routine[];
  exercises: Exercise[];
  workouts: Workout[];
  sets: WorkoutSet[];
}

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const WEIGHT_STEP = 2.5;
