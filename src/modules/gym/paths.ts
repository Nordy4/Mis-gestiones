/** Rutas absolutas del módulo Gym (para Link / navigate / backTo). */
export const gymPaths = {
  home: '/gym',
  routine: (routineId: string) => `/gym/rutina/${routineId}`,
  workout: (routineId: string) => `/gym/rutina/${routineId}/entrenar`,
  exercise: (exerciseId: string) => `/gym/ejercicio/${exerciseId}`,
};
