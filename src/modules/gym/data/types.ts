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

/** Bloque con nombre dentro de una rutina (p. ej. "Calentamiento", "Bíceps"). */
export interface Section extends Entity {
  routineId: string;
  name: string;
  order: number;
  archivedAt?: string | null;
}

export interface Exercise extends Entity {
  routineId: string;
  /** Sección a la que pertenece; null/ausente = sin sección (se muestra arriba). */
  sectionId?: string | null;
  name: string;
  targetSets: number;
  targetReps: number;
  /** Peso de partida (kg) para prerrellenar si aún no hay series registradas. */
  initialWeight: number | null;
  /** Igual que initialWeight, para la pareja. */
  initialPartnerWeight?: number | null;
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
  /** Mi peso en kg; null = sin peso (p. ej. abdominales). */
  weight: number | null;
  /** Peso de la pareja en kg en la misma serie; null/ausente = no lo hizo o sin peso. */
  partnerWeight?: number | null;
  reps: number;
}

export interface ExerciseInput {
  name: string;
  sectionId: string | null;
  targetSets: number;
  targetReps: number;
  initialWeight: number | null;
  initialPartnerWeight: number | null;
}

/** Pesos prerrellenados de un ejercicio. */
export interface LastWeights {
  weight: number | null;
  partnerWeight: number | null;
}

/** Una sesión en el historial de un ejercicio. */
export interface ExerciseSession {
  workout: Workout;
  sets: WorkoutSet[];
  /** Mi peso máximo de la sesión (null si todas sin peso). */
  topWeight: number | null;
  /** Peso máximo de la pareja en la sesión (null si no hay). */
  topPartnerWeight: number | null;
}

/** Formato de la copia de seguridad del módulo. */
export interface GymExport {
  routines: Routine[];
  /** Ausente en copias anteriores a las secciones. */
  sections?: Section[];
  exercises: Exercise[];
  workouts: Workout[];
  sets: WorkoutSet[];
}

/** Quién hizo el peso: yo o la pareja. */
export type Person = 'me' | 'partner';

export const PERSON_LABEL: Record<Person, string> = { me: 'Yo', partner: 'Pareja' };

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const WEIGHT_STEP = 2.5;
