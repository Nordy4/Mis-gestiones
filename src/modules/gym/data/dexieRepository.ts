import Dexie, { type Transaction } from 'dexie';
import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import { todayKey } from '@/core/lib/format';
import type { GymRepository } from './repository';
import type { Exercise, Routine, Section, WeightLogEntry, Workout } from './types';
import { normalizeGymData, type AnyGymData, type LegacySet } from './normalize';
import { elapsedSeconds } from '../lib/timer';
import { seedRoutines } from './seed';

const routines = () => db.table<Routine, string>('gym_routines');
const sections = () => db.table<Section, string>('gym_sections');
const exercises = () => db.table<Exercise, string>('gym_exercises');
const workouts = () => db.table<Workout, string>('gym_workouts');
const weightLog = () => db.table<WeightLogEntry, string>('gym_weight_log');

/** Tablas que forman la copia de seguridad (gym_sets es legado y no se exporta). */
const dataTables = () => [routines(), sections(), exercises(), workouts(), weightLog()];

const isActive = (x: { archivedAt?: string | null }) => !x.archivedAt;
const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ');

async function activeSections(routineId: string) {
  const list = await sections().where('routineId').equals(routineId).toArray();
  return list.filter(isActive).sort((a, b) => a.order - b.order);
}

/** Apunta (o sobrescribe) los pesos de hoy en el historial del ejercicio. */
async function logWeights(exerciseId: string, weight: number | null, partnerWeight: number | null) {
  const date = todayKey();
  const now = nowIso();
  const existing = await weightLog().where('[exerciseId+date]').equals([exerciseId, date]).first();
  if (existing) {
    await weightLog().update(existing.id, { weight, partnerWeight, updatedAt: now });
  } else {
    await weightLog().add({ id: newId(), exerciseId, date, weight, partnerWeight, createdAt: now, updatedAt: now });
  }
}

const findActive = () => workouts().filter((w) => w.finishedAt === null).first();

export const dexieGymRepository: GymRepository = {
  // ---------- Rutinas ----------
  async listRoutines(includeArchived = false) {
    const all = await routines().orderBy('order').toArray();
    return includeArchived ? all : all.filter(isActive);
  },

  getRoutine: (id) => routines().get(id),

  async createRoutine(name) {
    const last = await routines().orderBy('order').last();
    const now = nowIso();
    const routine: Routine = {
      id: newId(),
      name: cleanName(name),
      order: (last?.order ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await routines().add(routine);
    return routine;
  },

  async renameRoutine(id, name) {
    await routines().update(id, { name: cleanName(name), updatedAt: nowIso() });
  },

  async archiveRoutine(id) {
    const now = nowIso();
    await db.transaction('rw', routines(), sections(), exercises(), async () => {
      await routines().update(id, { archivedAt: now, updatedAt: now });
      await sections().where('routineId').equals(id).modify({ archivedAt: now, updatedAt: now });
      await exercises().where('routineId').equals(id).modify({ archivedAt: now, updatedAt: now });
    });
  },

  // ---------- Secciones ----------
  listSections: (routineId) => activeSections(routineId),

  async createSection(routineId, name) {
    const existing = await sections().where('routineId').equals(routineId).toArray();
    const now = nowIso();
    const section: Section = {
      id: newId(),
      routineId,
      name: cleanName(name),
      order: existing.reduce((m, s) => Math.max(m, s.order), -1) + 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await sections().add(section);
    return section;
  },

  async renameSection(id, name) {
    await sections().update(id, { name: cleanName(name), updatedAt: nowIso() });
  },

  async moveSection(id, direction) {
    await db.transaction('rw', sections(), async () => {
      const section = await sections().get(id);
      if (!section) return;
      const list = await activeSections(section.routineId);
      const i = list.findIndex((s) => s.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      const now = nowIso();
      await Promise.all(list.map((s, idx) => sections().update(s.id, { order: idx, updatedAt: now })));
    });
  },

  async archiveSection(id) {
    const now = nowIso();
    await db.transaction('rw', sections(), exercises(), async () => {
      await sections().update(id, { archivedAt: now, updatedAt: now });
      await exercises()
        .filter((e) => e.sectionId === id)
        .modify({ sectionId: null, updatedAt: now });
    });
  },

  // ---------- Ejercicios y pesos ----------
  async listExercises(routineId) {
    const all = await exercises()
      .where('[routineId+order]')
      .between([routineId, Dexie.minKey], [routineId, Dexie.maxKey])
      .toArray();
    return all.filter(isActive);
  },

  getExercise: (id) => exercises().get(id),

  async addExercise(routineId, input) {
    return db.transaction('rw', exercises(), weightLog(), async () => {
      const existing = await exercises().where('routineId').equals(routineId).toArray();
      const now = nowIso();
      const exercise: Exercise = {
        id: newId(),
        routineId,
        sectionId: input.sectionId,
        name: cleanName(input.name),
        targetSets: input.targetSets,
        targetReps: input.targetReps,
        weight: input.weight,
        partnerWeight: input.partnerWeight,
        order: existing.reduce((m, e) => Math.max(m, e.order), -1) + 1,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      await exercises().add(exercise);
      if (input.weight !== null || input.partnerWeight !== null) {
        await logWeights(exercise.id, input.weight, input.partnerWeight);
      }
      return exercise;
    });
  },

  async updateExercise(id, input) {
    await db.transaction('rw', exercises(), weightLog(), async () => {
      const prev = await exercises().get(id);
      await exercises().update(id, { ...input, name: cleanName(input.name), updatedAt: nowIso() });
      if (prev && (prev.weight !== input.weight || prev.partnerWeight !== input.partnerWeight)) {
        await logWeights(id, input.weight, input.partnerWeight);
      }
    });
  },

  async setWeights(id, weight, partnerWeight) {
    await db.transaction('rw', exercises(), weightLog(), async () => {
      await exercises().update(id, { weight, partnerWeight, updatedAt: nowIso() });
      await logWeights(id, weight, partnerWeight);
    });
  },

  async archiveExercise(id) {
    const now = nowIso();
    await exercises().update(id, { archivedAt: now, updatedAt: now });
  },

  async weightHistory(exerciseId) {
    return weightLog()
      .where('[exerciseId+date]')
      .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
      .toArray();
  },

  // ---------- Entrenamientos ----------
  getActiveWorkout: () => findActive(),

  async startWorkout(routineId) {
    return db.transaction('rw', workouts(), async () => {
      const active = await findActive();
      if (active) {
        if (active.routineId === routineId) return active;
        throw new Error('Ya hay un entrenamiento en curso. Termínalo antes de empezar otro.');
      }
      const now = nowIso();
      const workout: Workout = {
        id: newId(),
        routineId,
        date: todayKey(),
        startedAt: now,
        finishedAt: null,
        durationSeconds: null,
        pausedAt: null,
        pausedSeconds: 0,
        createdAt: now,
        updatedAt: now,
      };
      await workouts().add(workout);
      return workout;
    });
  },

  async pauseWorkout(id) {
    const now = nowIso();
    await workouts().update(id, { pausedAt: now, updatedAt: now });
  },

  async resumeWorkout(id) {
    await db.transaction('rw', workouts(), async () => {
      const w = await workouts().get(id);
      if (!w?.pausedAt) return;
      const pausedFor = Math.floor((Date.now() - Date.parse(w.pausedAt)) / 1000);
      await workouts().update(id, {
        pausedAt: null,
        pausedSeconds: (w.pausedSeconds ?? 0) + Math.max(0, pausedFor),
        updatedAt: nowIso(),
      });
    });
  },

  async finishWorkout(id) {
    return db.transaction('rw', workouts(), async () => {
      const w = await workouts().get(id);
      if (!w) throw new Error('Entrenamiento no encontrado');
      if (w.finishedAt) return w;
      const durationSeconds = elapsedSeconds(w);
      const now = nowIso();
      const finished: Workout = { ...w, finishedAt: now, durationSeconds, pausedAt: null, updatedAt: now };
      await workouts().put(finished);
      return finished;
    });
  },

  async deleteWorkout(id) {
    await workouts().delete(id);
  },

  async listWorkouts(from, to) {
    const list = await workouts().where('date').between(from, to, true, true).toArray();
    return list.filter((w) => w.finishedAt !== null).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  },

  async lastWorkoutDates() {
    const all = await workouts().toArray();
    const result: Record<string, string> = {};
    for (const w of all) {
      if (w.finishedAt === null) continue;
      if (!result[w.routineId] || w.date > result[w.routineId]) result[w.routineId] = w.date;
    }
    return result;
  },

  // ---------- Copia de seguridad ----------
  async exportAll() {
    const [r, sec, e, w, log] = await Promise.all(dataTables().map((t) => t.toArray()));
    return {
      routines: r as Routine[],
      sections: sec as Section[],
      exercises: e as Exercise[],
      workouts: w as Workout[],
      weightLog: log as WeightLogEntry[],
    };
  },

  async importAll(data) {
    const d = normalizeGymData(data);
    await db.transaction('rw', dataTables(), async () => {
      await Promise.all(dataTables().map((t) => t.clear()));
      await routines().bulkAdd(d.routines);
      await sections().bulkAdd(d.sections);
      await exercises().bulkAdd(d.exercises);
      await workouts().bulkAdd(d.workouts);
      await weightLog().bulkAdd(d.weightLog);
    });
  },

  async seed() {
    if ((await routines().count()) > 0) return;
    const now = nowIso();
    await db.transaction('rw', routines(), exercises(), async () => {
      for (const [ri, r] of seedRoutines.entries()) {
        const routineId = newId();
        await routines().add({ id: routineId, name: r.name, order: ri, createdAt: now, updatedAt: now, archivedAt: null });
        await exercises().bulkAdd(
          r.exercises.map((ex, ei) => ({
            id: newId(),
            routineId,
            ...ex,
            order: ei,
            createdAt: now,
            updatedAt: now,
            archivedAt: null,
          })),
        );
      }
    });
  },
};

/**
 * Migración de la BD (se llama desde setup.ts al subir DB_VERSION). Idempotente.
 * Convierte ejercicios/entrenos antiguos y las series legadas en historial de pesos.
 */
export async function upgradeGymData(tx: Transaction): Promise<void> {
  const t = (name: string) => tx.table(name);
  const [r, sec, ex, wk, log, legacySets] = await Promise.all([
    t('gym_routines').toArray(),
    t('gym_sections').toArray(),
    t('gym_exercises').toArray(),
    t('gym_workouts').toArray(),
    t('gym_weight_log').toArray(),
    t('gym_sets').toArray(),
  ]);
  const d = normalizeGymData({
    routines: r,
    sections: sec,
    exercises: ex,
    workouts: wk,
    weightLog: log,
    sets: legacySets as LegacySet[],
  } satisfies AnyGymData);
  await t('gym_exercises').bulkPut(d.exercises);
  await t('gym_workouts').bulkPut(d.workouts);
  if (log.length === 0 && d.weightLog.length) await t('gym_weight_log').bulkAdd(d.weightLog);
}
