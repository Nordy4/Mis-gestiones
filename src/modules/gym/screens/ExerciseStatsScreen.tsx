import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { ChartLine, Trophy } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { EmptyState } from '@/core/components/EmptyState';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { formatDateLong, formatDateShort, formatKg } from '@/core/lib/format';
import { useExercise, useRoutine, useWeightHistory } from '../data/hooks';
import { PERSON_LABEL, type Person, type WeightLogEntry } from '../data/types';
import { PersonDot } from '../components/PersonWeights';
import type { ProgressRow, ProgressSeries } from '../components/ProgressChart';
import { gymPaths } from '../paths';

// Recharts pesa bastante: se carga solo al abrir la evolución.
const ProgressChart = lazy(() => import('../components/ProgressChart'));

// Mismos colores que --color-me / --color-partner (validados para daltonismo).
const PERSON_COLOR: Record<Person, string> = { me: '#3987e5', partner: '#d95926' };

const valueOf = (e: WeightLogEntry, p: Person) => (p === 'me' ? e.weight : e.partnerWeight);

/** Récord de una persona: el peso más alto (la primera vez que lo alcanzó). */
function findRecord(history: WeightLogEntry[], person: Person) {
  let best: { weight: number; date: string } | null = null;
  for (const e of history) {
    const w = valueOf(e, person);
    if (w != null && (!best || w > best.weight)) best = { weight: w, date: e.date };
  }
  return best;
}

function StatTile({ label, value, detail }: { label: ReactNode; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      {detail && <div className="text-xs text-muted">{detail}</div>}
    </div>
  );
}

export function ExerciseStatsScreen() {
  const { exerciseId } = useParams();
  const exercise = useExercise(exerciseId);
  const routine = useRoutine(exercise?.routineId);
  const history = useWeightHistory(exerciseId);

  const { people, rows, series } = useMemo(() => {
    const h = history ?? [];
    const people = (['me', 'partner'] as Person[]).filter((p) => h.some((e) => valueOf(e, p) != null));
    const rows = h.map((e): ProgressRow => ({ date: e.date, me: e.weight, partner: e.partnerWeight }));
    const series: ProgressSeries[] = people.map((p) => ({ key: p, label: PERSON_LABEL[p], color: PERSON_COLOR[p] }));
    return { people, rows, series };
  }, [history]);

  if (exercise === null) return <NotFoundScreen />;
  if (!exercise || !history) return null;

  return (
    <Screen title={exercise.name} subtitle={routine?.name} backTo={gymPaths.routine(exercise.routineId)}>
      {people.length === 0 ? (
        <EmptyState icon={ChartLine} title="Sin pesos todavía">
          Ajusta el peso de este ejercicio en la rutina y aquí verás cómo evoluciona.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {people.map((p) => {
              const best = findRecord(history, p);
              const current = p === 'me' ? exercise.weight : exercise.partnerWeight;
              return (
                <StatTile
                  key={p}
                  label={
                    <>
                      <PersonDot person={p} /> {PERSON_LABEL[p]}
                    </>
                  }
                  value={current != null ? `${formatKg(current)} kg` : '–'}
                  detail={best ? `Récord ${formatKg(best.weight)} kg · ${formatDateShort(best.date)}` : undefined}
                />
              );
            })}
          </div>

          <section className="rounded-2xl border border-border/60 bg-surface p-3">
            <h2 className="mb-2 px-1 text-sm font-semibold">Evolución del peso (kg)</h2>
            {rows.length < 2 ? (
              <p className="px-1 py-6 text-center text-sm text-muted">
                Cuando cambies el peso en días distintos verás aquí la gráfica.
              </p>
            ) : (
              <Suspense fallback={<div className="h-56" />}>
                <ProgressChart data={rows} series={series} unit="kg" />
              </Suspense>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Historial</h2>
            <ul className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-surface">
              <li className="flex items-center gap-3 px-4 py-2 text-xs text-muted">
                <span className="flex-1">Día</span>
                {people.map((p) => (
                  <span key={p} className="w-20 text-right">
                    {PERSON_LABEL[p]} (kg)
                  </span>
                ))}
              </li>
              {[...history].reverse().map((e) => {
                const isRecord = people.some((p) => {
                  const best = findRecord(history, p);
                  return best && best.date === e.date && valueOf(e, p) === best.weight;
                });
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm tabular-nums">
                    <span className="min-w-0 flex-1 first-letter:uppercase">{formatDateLong(e.date)}</span>
                    {isRecord && <Trophy className="size-4 text-amber-300" aria-label="Récord" />}
                    {people.map((p) => (
                      <span key={p} className="flex w-20 items-center justify-end gap-1.5">
                        <PersonDot person={p} />
                        <span className="font-semibold">
                          {valueOf(e, p) != null ? formatKg(valueOf(e, p)) : '–'}
                        </span>
                      </span>
                    ))}
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
