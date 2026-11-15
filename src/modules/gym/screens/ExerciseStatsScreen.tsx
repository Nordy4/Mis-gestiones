import { lazy, Suspense, useMemo } from 'react';
import { useParams } from 'react-router';
import { ChartLine, Trophy } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { EmptyState } from '@/core/components/EmptyState';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { formatDateLong, formatDateShort, formatKg } from '@/core/lib/format';
import { useExercise, useExerciseHistory, useRoutine } from '../data/hooks';
import type { ExerciseSession, WorkoutSet } from '../data/types';
import { gymPaths } from '../paths';

// Recharts pesa bastante: se carga solo al abrir estadísticas.
const ProgressChart = lazy(() => import('../components/ProgressChart'));

interface BestSet {
  set: WorkoutSet;
  date: string;
}

/** Mejor serie: más peso; a igual peso, más reps. Si no hay pesos, más reps. */
function findRecord(history: ExerciseSession[], byWeight: boolean): BestSet | null {
  let best: BestSet | null = null;
  for (const s of history) {
    for (const set of s.sets) {
      if (!best) {
        best = { set, date: s.workout.date };
        continue;
      }
      const a = set;
      const b = best.set;
      const better = byWeight
        ? (a.weight ?? -1) > (b.weight ?? -1) || ((a.weight ?? -1) === (b.weight ?? -1) && a.reps > b.reps)
        : a.reps > b.reps;
      if (better) best = { set, date: s.workout.date };
    }
  }
  return best;
}

const setLabel = (s: WorkoutSet) => (s.weight === null ? `${s.reps} reps` : `${formatKg(s.weight)}×${s.reps}`);

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      {detail && <div className="text-xs text-muted">{detail}</div>}
    </div>
  );
}

export function ExerciseStatsScreen() {
  const { exerciseId } = useParams();
  const exercise = useExercise(exerciseId);
  const routine = useRoutine(exercise?.routineId);
  const history = useExerciseHistory(exerciseId);

  const byWeight = useMemo(() => (history ?? []).some((s) => s.topWeight !== null), [history]);

  const points = useMemo(
    () =>
      (history ?? []).map((s) => ({
        date: s.workout.date,
        value: byWeight ? (s.topWeight ?? 0) : Math.max(...s.sets.map((x) => x.reps)),
      })),
    [history, byWeight],
  );

  if (exercise === null) return <NotFoundScreen />;
  if (!exercise || !history) return null;

  const BestSet = findRecord(history, byWeight);
  const last = history.at(-1);
  const unit = byWeight ? 'kg' : 'reps';

  return (
    <Screen title={exercise.name} subtitle={routine?.name} backTo={gymPaths.routine(exercise.routineId)}>
      {history.length === 0 ? (
        <EmptyState icon={ChartLine} title="Sin datos todavía">
          Registra este ejercicio en un entrenamiento para ver su evolución.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <StatTile
              label="Récord"
              value={BestSet ? (byWeight ? `${formatKg(BestSet.set.weight)} kg` : `${BestSet.set.reps}`) : '–'}
              detail={BestSet ? `${BestSet.set.reps} reps · ${formatDateShort(BestSet.date)}` : undefined}
            />
            <StatTile
              label="Último"
              value={last ? (byWeight ? `${formatKg(last.topWeight)} kg` : `${points.at(-1)?.value}`) : '–'}
              detail={last ? formatDateShort(last.workout.date) : undefined}
            />
            <StatTile label="Sesiones" value={String(history.length)} />
          </div>

          <section className="rounded-2xl border border-border/60 bg-surface p-3">
            <h2 className="mb-2 px-1 text-sm font-semibold">
              {byWeight ? 'Peso máximo por sesión (kg)' : 'Reps máximas por sesión'}
            </h2>
            {points.length < 2 ? (
              <p className="px-1 py-6 text-center text-sm text-muted">
                Con dos sesiones o más verás aquí la gráfica.
              </p>
            ) : (
              <Suspense fallback={<div className="h-56" />}>
                <ProgressChart data={points} unit={unit} />
              </Suspense>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Historial</h2>
            <ul className="grid gap-2">
              {[...history].reverse().map((s) => {
                const isRecordSession = BestSet && s.sets.some((x) => x.id === BestSet.set.id);
                return (
                  <li key={s.workout.id} className="rounded-2xl border border-border/60 bg-surface p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{formatDateLong(s.workout.date)}</span>
                      {isRecordSession && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          <Trophy className="size-3.5" /> Récord
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.sets.map((set) => (
                        <span
                          key={set.id}
                          className="rounded-full bg-surface-2 px-2.5 py-1 text-sm tabular-nums"
                        >
                          {setLabel(set)}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </Screen>
  );
}
