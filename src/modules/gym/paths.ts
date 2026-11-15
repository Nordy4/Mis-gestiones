/** Rutas absolutas del módulo Gym (para Link / navigate / backTo). */
export const gymPaths = {
  home: '/gym',
  /** Calendario; con `day` (YYYY-MM-DD) abre ese mes con el día seleccionado. */
  calendar: (day?: string) => (day ? `/gym/calendario?dia=${day}` : '/gym/calendario'),
  routine: (routineId: string) => `/gym/rutina/${routineId}`,
  /** Cronómetro del entrenamiento de una rutina. */
  workout: (routineId: string) => `/gym/rutina/${routineId}/entrenar`,
  exercise: (exerciseId: string) => `/gym/ejercicio/${exerciseId}`,
};
