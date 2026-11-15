/**
 * Tablas Dexie del módulo Gym (prefijo obligatorio `gym_`).
 * Si cambias algo aquí, sube DB_VERSION en src/core/db/setup.ts.
 */
export const gymSchema = {
  gym_routines: 'id, order',
  gym_sections: 'id, routineId',
  gym_exercises: 'id, routineId, [routineId+order]',
  gym_workouts: 'id, routineId, date, [routineId+date]',
  gym_sets: 'id, workoutId, exerciseId, [exerciseId+createdAt]',
};
