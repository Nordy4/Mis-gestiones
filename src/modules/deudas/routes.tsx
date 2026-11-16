import type { RouteObject } from 'react-router';
import { DebtsScreen } from './screens/DebtsScreen';
import { DebtorScreen } from './screens/DebtorScreen';

/** Rutas relativas a /deudas. Mantener sincronizado con paths.ts. */
export const deudasRoutes: RouteObject[] = [
  { index: true, element: <DebtsScreen /> },
  { path: 'persona/:debtorId', element: <DebtorScreen /> },
];
