import type { RouteObject } from 'react-router';
import { Screen } from '@/core/components/Screen';

function GymPlaceholder() {
  return (
    <Screen title="Gym" backTo="/">
      <p className="text-muted">Próximamente: rutinas y entrenamientos.</p>
    </Screen>
  );
}

export const gymRoutes: RouteObject[] = [{ index: true, element: <GymPlaceholder /> }];
