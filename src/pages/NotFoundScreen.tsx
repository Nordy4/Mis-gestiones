import { Link } from 'react-router';
import { Screen } from '@/core/components/Screen';

export function NotFoundScreen() {
  return (
    <Screen title="No encontrado" backTo="/">
      <p className="text-muted">Esta pantalla no existe.</p>
      <Link to="/" className="mt-4 inline-block font-semibold text-accent">
        Ir al inicio
      </Link>
    </Screen>
  );
}
