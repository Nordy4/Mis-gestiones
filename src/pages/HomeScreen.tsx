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
          className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-text backdrop-blur active:bg-white/20"
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
                className="glass-card flex items-center gap-4 rounded-[22px] p-4 active:brightness-125"
              >
                <span className="bg-accent-gradient grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-accent-strong/40">
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
