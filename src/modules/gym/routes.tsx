import type { RouteObject } from 'react-router';
import { RoutinesScreen } from './screens/RoutinesScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { ExerciseStatsScreen } from './screens/ExerciseStatsScreen';

/** Rutas relativas a /gym. Mantener sincronizado con paths.ts. */
export const gymRoutes: RouteObject[] = [
  { index: true, element: <RoutinesScreen /> },
  { path: 'rutina/:routineId', element: <RoutineScreen /> },
  { path: 'rutina/:routineId/entrenar', element: <WorkoutScreen /> },
  { path: 'ejercicio/:exerciseId', element: <ExerciseStatsScreen /> },
];
