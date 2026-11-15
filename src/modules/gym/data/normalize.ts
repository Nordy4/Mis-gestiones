import { newId } from '@/core/lib/ids';
import type { Exercise, GymExport, Routine, Section, WeightLogEntry, Workout } from './types';

/**
 * Datos de Gym en cualquier formato que haya existido (copias antiguas o BD v1–v2).
 * Campos antiguos:
 *  - v1: exercises.initialWeight; sets con weight; workouts sin cronómetro.
 *  - v2: + sections, exercises.initialPartnerWeight, sets.partnerWeight.
 *  - v3 (actual): exercises.weight/partnerWeight, weightLog, workouts cronometrados; sin sets.
 */
export interface AnyGymData {
  routines: Routine[];
  sections?: Section[];
  exercises: (Partial<Exercise> & Record<string, unknown>)[];
  workouts: (Partial<Workout> & Record<string, unknown>)[];
  weightLog?: WeightLogEntry[];
  sets?: LegacySet[];
}

export interface LegacySet {
  id: string;
  workoutId: string;
  exerciseId: string;
  weight: number | null;
  partnerWeight?: number | null;
  reps: number;
  createdAt: string;
}

const maxOrNull = (a: number | null | undefined, b: number | null | undefined) =>
  a == null ? (b ?? null) : b == null ? a : Math.max(a, b);

/** Convierte las series antiguas en historial de pesos: peso máximo por ejercicio y día. */
function logFromSets(sets: LegacySet[], workouts: AnyGymData['workouts']): WeightLogEntry[] {
  const dateOf = new Map(workouts.map((w) => [w.id, w.date as string]));
  const byKey = new Map<string, WeightLogEntry>();
  for (const s of sets) {
    const date = dateOf.get(s.workoutId) ?? s.createdAt.slice(0, 10);
    const key = `${s.exerciseId}|${date}`;
    const prev = byKey.get(key);
    if (prev) {
      prev.weight = maxOrNull(prev.weight, s.weight);
      prev.partnerWeight = maxOrNull(prev.partnerWeight, s.partnerWeight);
    } else {
      byKey.set(key, {
        id: newId(),
        exerciseId: s.exerciseId,
        date,
        weight: s.weight ?? null,
        partnerWeight: s.partnerWeight ?? null,
        createdAt: s.createdAt,
        updatedAt: s.createdAt,
      });
    }
  }
  return [...byKey.values()].filter((e) => e.weight !== null || e.partnerWeight !== null);
}

/**
 * Lleva cualquier versión de los datos al formato actual. Idempotente: aplicada a datos
 * ya actuales los devuelve iguales. Se usa al migrar la BD y al importar copias.
 */
export function normalizeGymData(data: AnyGymData): GymExport {
  const weightLog =
    data.weightLog && data.weightLog.length > 0 ? data.weightLog : logFromSets(data.sets ?? [], data.workouts);

  // Último peso registrado de cada ejercicio (para rellenar el peso actual).
  const latest = new Map<string, { weight: number | null; partnerWeight: number | null; date: string }>();
  for (const e of weightLog) {
    const cur = latest.get(e.exerciseId);
    if (!cur || e.date > cur.date) latest.set(e.exerciseId, { ...e });
    else if (e.date === cur.date) {
      cur.weight = maxOrNull(cur.weight, e.weight);
      cur.partnerWeight = maxOrNull(cur.partnerWeight, e.partnerWeight);
    }
  }

  const exercises = data.exercises.map((raw) => {
    const { initialWeight, initialPartnerWeight, ...rest } = raw as Record<string, unknown> & Partial<Exercise>;
    if ('weight' in raw) return rest as unknown as Exercise;
    const last = latest.get(raw.id as string);
    return {
      ...rest,
      weight: last?.weight ?? (initialWeight as number | null | undefined) ?? null,
      partnerWeight: last?.partnerWeight ?? (initialPartnerWeight as number | null | undefined) ?? null,
    } as unknown as Exercise;
  });

  const workouts = data.workouts.map((w) => {
    if ('durationSeconds' in w) return w as Workout;
    // Entreno del registro antiguo: sin cronómetro. Se da por terminado y sin duración.
    return {
      ...w,
      finishedAt: (w.finishedAt as string | null | undefined) ?? (w.startedAt as string),
      durationSeconds: null,
      pausedAt: null,
      pausedSeconds: 0,
    } as Workout;
  });

  return {
    routines: data.routines,
    sections: data.sections ?? [],
    exercises,
    workouts,
    weightLog,
  };
}
