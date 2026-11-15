import Dexie from 'dexie';
import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import type { GymRepository } from './repository';
import type { Exercise, ExerciseSession, GymExport, Routine, Section, Workout, WorkoutSet } from './types';
import { seedRoutines } from './seed';

const routines = () => db.table<Routine, string>('gym_routines');
const sections = () => db.table<Section, string>('gym_sections');
const exercises = () => db.table<Exercise, string>('gym_exercises');
const workouts = () => db.table<Workout, string>('gym_workouts');
const sets = () => db.table<WorkoutSet, string>('gym_sets');

const allTables = () => [routines(), sections(), exercises(), workouts(), sets()];

const isActive = (x: { archivedAt?: string | null }) => !x.archivedAt;
const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ');
const maxNumber = (xs: (number | null | undefined)[]) => {
  const nums = xs.filter((x): x is number => typeof x === 'number');
  return nums.length ? Math.max(...nums) : null;
};

function setsOfExercise(exerciseId: string) {
  return sets()
    .where('[exerciseId+createdAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]);
}

async function activeSections(routineId: string) {
  const list = await sections().where('routineId').equals(routineId).toArray();
  return list.filter(isActive).sort((a, b) => a.order - b.order);
}

export const dexieGymRepository: GymRepository = {
  // ---------- Rutinas ----------
  async listRoutines() {
    const all = await routines().orderBy('order').toArray();
    return all.filter(isActive);
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
      // Renumera para que el orden quede compacto y sin empates.
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

  // ---------- Ejercicios ----------
  async listExercises(routineId) {
    const all = await exercises()
      .where('[routineId+order]')
      .between([routineId, Dexie.minKey], [routineId, Dexie.maxKey])
      .toArray();
    return all.filter(isActive);
  },

  getExercise: (id) => exercises().get(id),

  async addExercise(routineId, input) {
    const existing = await exercises().where('routineId').equals(routineId).toArray();
    const now = nowIso();
    const exercise: Exercise = {
      id: newId(),
      routineId,
      sectionId: input.sectionId,
      name: cleanName(input.name),
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      initialWeight: input.initialWeight,
      initialPartnerWeight: input.initialPartnerWeight,
      order: existing.reduce((m, e) => Math.max(m, e.order), -1) + 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await exercises().add(exercise);
    return exercise;
  },

  async updateExercise(id, input) {
    await exercises().update(id, { ...input, name: cleanName(input.name), updatedAt: nowIso() });
  },

  async archiveExercise(id) {
    const now = nowIso();
    await exercises().update(id, { archivedAt: now, updatedAt: now });
  },

  // ---------- Entrenamientos ----------
  findWorkout: (routineId, date) => workouts().where('[routineId+date]').equals([routineId, date]).first(),

  async getOrCreateWorkout(routineId, date) {
    return db.transaction('rw', workouts(), async () => {
      const existing = await workouts().where('[routineId+date]').equals([routineId, date]).first();
      if (existing) return existing;
      const now = nowIso();
      const workout: Workout = {
        id: newId(),
        routineId,
        date,
        startedAt: now,
        finishedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await workouts().add(workout);
      return workout;
    });
  },

  async finishWorkout(id) {
    await db.transaction('rw', workouts(), sets(), async () => {
      const count = await sets().where('workoutId').equals(id).count();
      if (count === 0) {
        await workouts().delete(id);
      } else {
        const now = nowIso();
        await workouts().update(id, { finishedAt: now, updatedAt: now });
      }
    });
  },

  async lastWorkoutDates() {
    const [allWorkouts, allSets] = await Promise.all([workouts().toArray(), sets().toArray()]);
    const withSets = new Set(allSets.map((s) => s.workoutId));
    const result: Record<string, string> = {};
    for (const w of allWorkouts) {
      if (!withSets.has(w.id)) continue;
      if (!result[w.routineId] || w.date > result[w.routineId]) result[w.routineId] = w.date;
    }
    return result;
  },

  // ---------- Series ----------
  async listSets(workoutId) {
    const list = await sets().where('workoutId').equals(workoutId).toArray();
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async addSet(workoutId, exerciseId, weight, partnerWeight, reps) {
    return db.transaction('rw', sets(), workouts(), async () => {
      const previous = await sets().where('workoutId').equals(workoutId).toArray();
      const now = nowIso();
      const set: WorkoutSet = {
        id: newId(),
        workoutId,
        exerciseId,
        setIndex: previous.filter((s) => s.exerciseId === exerciseId).length,
        weight,
        partnerWeight,
        reps,
        createdAt: now,
        updatedAt: now,
      };
      await sets().add(set);
      // Si se añade una serie a un entreno ya terminado, vuelve a estar en curso.
      await workouts().update(workoutId, { finishedAt: null, updatedAt: now });
      return set;
    });
  },

  async deleteSet(id) {
    await sets().delete(id);
  },

  async lastWeights(exerciseId) {
    const history = await setsOfExercise(exerciseId).reverse().toArray();
    const lastMine = history.find((s) => s.weight != null);
    const lastPartner = history.find((s) => s.partnerWeight != null);
    if (lastMine && lastPartner) return { weight: lastMine.weight, partnerWeight: lastPartner.partnerWeight ?? null };
    const exercise = await exercises().get(exerciseId);
    return {
      weight: lastMine ? lastMine.weight : (exercise?.initialWeight ?? null),
      partnerWeight: lastPartner ? (lastPartner.partnerWeight ?? null) : (exercise?.initialPartnerWeight ?? null),
    };
  },

  // ---------- Estadísticas ----------
  async exerciseHistory(exerciseId) {
    const list = await setsOfExercise(exerciseId).toArray();
    const byWorkout = new Map<string, WorkoutSet[]>();
    for (const s of list) {
      const arr = byWorkout.get(s.workoutId) ?? [];
      arr.push(s);
      byWorkout.set(s.workoutId, arr);
    }
    const ws = await workouts().bulkGet([...byWorkout.keys()]);
    const sessions: ExerciseSession[] = [];
    for (const w of ws) {
      if (!w) continue;
      const wSets = byWorkout.get(w.id)!;
      sessions.push({
        workout: w,
        sets: wSets,
        topWeight: maxNumber(wSets.map((s) => s.weight)),
        topPartnerWeight: maxNumber(wSets.map((s) => s.partnerWeight)),
      });
    }
    return sessions.sort((a, b) => a.workout.date.localeCompare(b.workout.date));
  },

  // ---------- Copia de seguridad ----------
  async exportAll() {
    const [r, sec, e, w, s] = await Promise.all(allTables().map((t) => t.toArray()));
    return {
      routines: r as Routine[],
      sections: sec as Section[],
      exercises: e as Exercise[],
      workouts: w as Workout[],
      sets: s as WorkoutSet[],
    };
  },

  async importAll(data: GymExport) {
    await db.transaction('rw', allTables(), async () => {
      await Promise.all(allTables().map((t) => t.clear()));
      await routines().bulkAdd(data.routines);
      await sections().bulkAdd(data.sections ?? []);
      await exercises().bulkAdd(data.exercises);
      await workouts().bulkAdd(data.workouts);
      await sets().bulkAdd(data.sets);
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
