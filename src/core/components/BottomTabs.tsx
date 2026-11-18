import { NavLink } from 'react-router';
import type { LucideIcon } from 'lucide-react';

export interface BottomTab {
  to: string;
  label: string;
  icon: LucideIcon;
  /** true = activa solo con la ruta exacta (la pestaña "inicio" del módulo). */
  end?: boolean;
}

/** Barra de pestañas inferior de un módulo. Va en el `footer` de <Screen>. */
export function BottomTabs({ tabs, label }: { tabs: BottomTab[]; label: string }) {
  return (
    <nav
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      aria-label={label}
    >
      {tabs.map(({ to, label: text, icon: Icon, end }) => (
        <NavLink
          key={text}
          to={to}
          end={end}
          replace
          className={({ isActive }) =>
            `flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium ${
              isActive ? 'bg-accent/15 text-accent' : 'text-muted active:text-text'
            }`
          }
        >
          <Icon className="size-6" />
          {text}
        </NavLink>
      ))}
    </nav>
  );
}
