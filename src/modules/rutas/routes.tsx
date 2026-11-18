import type { RouteObject } from 'react-router';
import { RoutesScreen } from './screens/RoutesScreen';
import { AiRouteScreen } from './screens/AiRouteScreen';

/** Rutas (de navegación) relativas a /rutas. Ver paths.ts. */
export const rutasRoutes: RouteObject[] = [
  { index: true, element: <RoutesScreen /> },
  { path: 'ia', element: <AiRouteScreen /> },
];
