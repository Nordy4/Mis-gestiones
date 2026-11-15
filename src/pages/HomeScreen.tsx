import { Link } from 'react-router';
import { ChevronRight, Settings } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { modules } from '@/modules/registry';

export function HomeScreen() {
  return (
    <Screen
      title="Mi Vida"
      actions={
        <Link
          to="/ajustes"
          aria-label="Ajustes"
          className="grid size-11 place-items-center rounded-full text-muted active:bg-surface-2"
        >
          <Settings className="size-5" />
        </Link>
      }
    >
      <ul className="grid gap-3">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <li key={m.id}>
              <Link
                to={`/${m.path}`}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-surface p-4 active:bg-surface-2"
              >
                <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${m.color}`}>
                  <Icon className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{m.name}</span>
                  {m.description && <span className="block truncate text-sm text-muted">{m.description}</span>}
                </span>
                <ChevronRight className="size-5 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
