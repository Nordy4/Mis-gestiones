import type { RouteObject } from 'react-router';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { CalendarLinkScreen } from './screens/CalendarLinkScreen';

/** Rutas relativas a /gastos. Mantener sincronizado con paths.ts. */
export const gastosRoutes: RouteObject[] = [
  { index: true, element: <ExpensesScreen /> },
  { path: 'calendario', element: <CalendarLinkScreen /> },
];
