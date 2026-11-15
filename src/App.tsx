import { createHashRouter, RouterProvider, useRouteError } from 'react-router';
import { modules } from '@/modules/registry';
import { HomeScreen } from '@/pages/HomeScreen';
import { SettingsScreen } from '@/pages/SettingsScreen';
import { NotFoundScreen } from '@/pages/NotFoundScreen';
import { Screen } from '@/core/components/Screen';

function RouteError() {
  const error = useRouteError();
  return (
    <Screen title="Algo ha fallado" backTo="/">
      <p className="text-muted">Ha ocurrido un error en esta pantalla.</p>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-surface p-3 text-xs whitespace-pre-wrap text-danger">
        {error instanceof Error ? error.message : String(error)}
      </pre>
    </Screen>
  );
}

// HashRouter (#/gym/...): funciona en cualquier hosting estático sin reglas de redirección.
const router = createHashRouter([
  {
    path: '/',
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'ajustes', element: <SettingsScreen /> },
      // Cada módulo cuelga de su propia ruta base con sus rutas relativas.
      ...modules.map((m) => ({ path: m.path, children: m.routes })),
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
