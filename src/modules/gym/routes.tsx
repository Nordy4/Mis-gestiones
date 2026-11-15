import type { RouteObject } from 'react-router';
import { RoutinesScreen } from './screens/RoutinesScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { TimerScreen } from './screens/TimerScreen';
import { ExerciseStatsScreen } from './screens/ExerciseStatsScreen';

/** Rutas relativas a /gym. Mantener sincronizado con paths.ts. */
export const gymRoutes: RouteObject[] = [
  { index: true, element: <RoutinesScreen /> },
  { path: 'calendario', element: <CalendarScreen /> },
  { path: 'rutina/:routineId', element: <RoutineScreen /> },
  { path: 'rutina/:routineId/entrenar', element: <TimerScreen /> },
  { path: 'ejercicio/:exerciseId', element: <ExerciseStatsScreen /> },
];
