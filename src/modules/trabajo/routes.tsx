import type { RouteObject } from 'react-router';
import { ClockScreen } from './screens/ClockScreen';
import { WorkCalendarScreen } from './screens/WorkCalendarScreen';

/** Rutas relativas a /trabajo. Mantener sincronizado con paths.ts. */
export const trabajoRoutes: RouteObject[] = [
  { index: true, element: <ClockScreen /> },
  { path: 'calendario', element: <WorkCalendarScreen /> },
];
