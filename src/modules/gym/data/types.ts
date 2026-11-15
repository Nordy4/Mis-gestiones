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
  /** Mi peso actual en kg (null = sin peso). Cada cambio se apunta en gym_weight_log. */
  weight: number | null;
  /** Peso actual de la pareja en kg. */
  partnerWeight: number | null;
  order: number;
  archivedAt?: string | null;
}

/**
 * Un entrenamiento cronometrado de una rutina.
 * Activo = `finishedAt === null`. Solo puede haber uno activo a la vez.
 * Tiempo transcurrido = (fin | pausa | ahora) − startedAt − pausedSeconds (ver lib/timer.ts).
 */
export interface Workout extends Entity {
  routineId: string;
  /** Día local de inicio, YYYY-MM-DD (para el calendario). */
  date: string;
  startedAt: string;
  finishedAt: string | null;
  /** Duración final en segundos. null mientras está activo o en registros antiguos sin cronómetro. */
  durationSeconds: number | null;
  /** Si está en pausa, desde cuándo. */
  pausedAt: string | null;
  /** Segundos acumulados en pausas ya terminadas. */
  pausedSeconds: number;
}

/** Peso de un ejercicio en un día (uno por ejercicio y día: el último valor de ese día). */
export interface WeightLogEntry extends Entity {
  exerciseId: string;
  date: string;
  weight: number | null;
  partnerWeight: number | null;
}

export interface ExerciseInput {
  name: string;
  sectionId: string | null;
  targetSets: number;
  targetReps: number;
  weight: number | null;
  partnerWeight: number | null;
}

/** Formato de la copia de seguridad del módulo. */
export interface GymExport {
  routines: Routine[];
  sections: Section[];
  exercises: Exercise[];
  workouts: Workout[];
  weightLog: WeightLogEntry[];
}

/** Quién hizo el peso: yo (Goyo) o la pareja (Bebe). */
export type Person = 'me' | 'partner';

/** Nombres que se muestran en TODA la app. No escribir "Yo"/"Pareja" a mano: usar esto. */
export const PERSON_LABEL: Record<Person, string> = { me: 'Goyo', partner: 'Bebe' };

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const WEIGHT_STEP = 2.5;
