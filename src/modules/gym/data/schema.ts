/**
 * Tablas Dexie del módulo Gym (prefijo obligatorio `gym_`).
 * Si cambias algo aquí, sube DB_VERSION en src/core/db/setup.ts.
 */
export const gymSchema = {
  gym_routines: 'id, order',
  gym_sections: 'id, routineId',
  gym_exercises: 'id, routineId, [routineId+order]',
  gym_workouts: 'id, routineId, date',
  gym_weight_log: 'id, exerciseId, [exerciseId+date]',
  /**
   * LEGADO (v1–v2): series del antiguo registro serie a serie. Ya no se usa; se conserva
   * para no perder datos. La migración (`normalize.ts`) las convierte en gym_weight_log.
   */
  gym_sets: 'id, workoutId, exerciseId, [exerciseId+createdAt]',
};
