import { NavLink } from 'react-router';
import { CalendarDays, ListChecks } from 'lucide-react';
import { gymPaths } from '../paths';

const tabs = [
  { to: gymPaths.home, label: 'Rutinas', icon: ListChecks, end: true },
  { to: gymPaths.calendar(), label: 'Calendario', icon: CalendarDays, end: false },
];

/** Barra de pestañas inferior del módulo Gym (va en el `footer` de <Screen>). */
export function GymTabs() {
  return (
    <nav className="-mx-4 -mt-3 grid grid-cols-2" aria-label="Secciones de Gym">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={label}
          to={to}
          end={end}
          replace
          className={({ isActive }) =>
            `flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              isActive ? 'text-accent' : 'text-muted active:text-text'
            }`
          }
        >
          <Icon className="size-6" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
