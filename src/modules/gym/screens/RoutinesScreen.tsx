import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, ListPlus, Plus } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { EmptyState } from '@/core/components/EmptyState';
import { formatDateShort } from '@/core/lib/format';
import { gymRepo, useLastWorkoutDates, useRoutines } from '../data/hooks';
import { RoutineNameSheet } from '../components/RoutineNameSheet';
import { GymTabs } from '../components/GymTabs';
import { ActiveWorkoutBanner } from '../components/ActiveWorkoutBanner';
import { gymPaths } from '../paths';

export function RoutinesScreen() {
  const routines = useRoutines();
  const lastDates = useLastWorkoutDates();
  const [creating, setCreating] = useState(false);

  return (
    <Screen title="Gym" subtitle="Elige una rutina" backTo="/" footer={<GymTabs />}>
      <ActiveWorkoutBanner />

      {routines && routines.length === 0 && (
        <EmptyState icon={ListPlus} title="No tienes rutinas">
          Crea la primera con el botón de abajo.
        </EmptyState>
      )}
      <ul className="grid gap-3">
        {routines?.map((r) => {
          const last = lastDates?.[r.id];
          return (
            <li key={r.id}>
              <Link
                to={gymPaths.routine(r.id)}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-4 active:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold">{r.name}</span>
                  <span className="block text-sm text-muted">
                    {last ? `Último entreno: ${formatDateShort(last)}` : 'Sin entrenos todavía'}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
      <Button
        variant="ghost"
        block
        className="mt-3 border border-dashed border-border text-muted"
        onClick={() => setCreating(true)}
      >
        <Plus className="size-5" /> Nueva rutina
      </Button>

      <RoutineNameSheet
        open={creating}
        title="Nueva rutina"
        submitLabel="Crear"
        onSubmit={async (name) => {
          await gymRepo.createRoutine(name);
        }}
        onClose={() => setCreating(false)}
      />
    </Screen>
  );
}
