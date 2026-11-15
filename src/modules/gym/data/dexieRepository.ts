import Dexie from 'dexie';
import { db } from '@/core/db/db';
import { newId, nowIso } from '@/core/lib/ids';
import type { GymRepository } from './repository';
import type { Exercise, ExerciseSession, GymExport, Routine, Workout, WorkoutSet } from './types';
import { seedRoutines } from './seed';

const routines = () => db.table<Routine, string>('gym_routines');
const exercises = () => db.table<Exercise, string>('gym_exercises');
const workouts = () => db.table<Workout, string>('gym_workouts');
const sets = () => db.table<WorkoutSet, string>('gym_sets');

const allTables = () => [routines(), exercises(), workouts(), sets()];

const isActive = (x: { archivedAt?: string | null }) => !x.archivedAt;
const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ');

function setsOfExercise(exerciseId: string) {
  return sets()
    .where('[exerciseId+createdAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]);
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
    await db.transaction('rw', routines(), exercises(), async () => {
      await routines().update(id, { archivedAt: now, updatedAt: now });
      await exercises().where('routineId').equals(id).modify({ archivedAt: now, updatedAt: now });
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
      name: cleanName(input.name),
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      initialWeight: input.initialWeight,
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

  async addSet(workoutId, exerciseId, weight, reps) {
    return db.transaction('rw', sets(), workouts(), async () => {
      const previous = await sets().where('workoutId').equals(workoutId).toArray();
      const now = nowIso();
      const set: WorkoutSet = {
        id: newId(),
        workoutId,
        exerciseId,
        setIndex: previous.filter((s) => s.exerciseId === exerciseId).length,
        weight,
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

  async lastWeight(exerciseId) {
    const last = await setsOfExercise(exerciseId)
      .reverse()
      .filter((s) => s.weight !== null)
      .first();
    if (last) return last.weight;
    const exercise = await exercises().get(exerciseId);
    return exercise?.initialWeight ?? null;
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
      const weights = wSets.map((s) => s.weight).filter((x): x is number => x !== null);
      sessions.push({
        workout: w,
        sets: wSets,
        topWeight: weights.length ? Math.max(...weights) : null,
      });
    }
    return sessions.sort((a, b) => a.workout.date.localeCompare(b.workout.date));
  },

  // ---------- Copia de seguridad ----------
  async exportAll() {
    const [r, e, w, s] = await Promise.all(allTables().map((t) => t.toArray()));
    return {
      routines: r as Routine[],
      exercises: e as Exercise[],
      workouts: w as Workout[],
      sets: s as WorkoutSet[],
    };
  },

  async importAll(data: GymExport) {
    await db.transaction('rw', allTables(), async () => {
      await Promise.all(allTables().map((t) => t.clear()));
      await routines().bulkAdd(data.routines);
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
            name: ex.name,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            initialWeight: ex.initialWeight,
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
