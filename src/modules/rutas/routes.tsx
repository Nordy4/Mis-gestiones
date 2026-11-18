import type { RouteObject } from 'react-router';
import { RoutesScreen } from './screens/RoutesScreen';

/** Rutas (de navegación) relativas a /rutas. */
export const rutasRoutes: RouteObject[] = [{ index: true, element: <RoutesScreen /> }];
