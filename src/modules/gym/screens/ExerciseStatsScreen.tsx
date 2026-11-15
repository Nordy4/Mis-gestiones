import { lazy, Suspense, useMemo } from 'react';
import { useParams } from 'react-router';
import { ChartLine, Trophy } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { EmptyState } from '@/core/components/EmptyState';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { formatDateLong, formatDateShort, formatKg } from '@/core/lib/format';
import { useExercise, useExerciseHistory, useRoutine } from '../data/hooks';
import { PERSON_LABEL, type ExerciseSession, type Person } from '../data/types';
import { PersonDot } from '../components/PersonWeights';
import { SetsTable } from '../components/SetsTable';
import type { ProgressRow, ProgressSeries } from '../components/ProgressChart';
import { gymPaths } from '../paths';

// Recharts pesa bastante: se carga solo al abrir estadísticas.
const ProgressChart = lazy(() => import('../components/ProgressChart'));

// Mismos colores que --color-me / --color-partner (validados para daltonismo).
const PERSON_COLOR: Record<Person, string> = { me: '#3987e5', partner: '#d95926' };

interface BestSet {
  setId: string;
  weight: number;
  reps: number;
  date: string;
}

/** Mejor serie de una persona: más peso; a igual peso, más reps. */
function findRecord(history: ExerciseSession[], person: Person): BestSet | null {
  let best: BestSet | null = null;
  for (const s of history) {
    for (const set of s.sets) {
      const w = person === 'me' ? set.weight : set.partnerWeight;
      if (w == null) continue;
      if (!best || w > best.weight || (w === best.weight && set.reps > best.reps)) {
        best = { setId: set.id, weight: w, reps: set.reps, date: s.workout.date };
      }
    }
  }
  return best;
}

interface StatTileProps {
  label: React.ReactNode;
  value: string;
  detail?: string;
  className?: string;
}

function StatTile({ label, value, detail, className = '' }: StatTileProps) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-surface p-3 ${className}`}>
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
  const history = useExerciseHistory(exerciseId);

  const { people, rows, series, byWeight } = useMemo(() => {
    const h = history ?? [];
    const people: Person[] = [];
    if (h.some((s) => s.topWeight !== null)) people.push('me');
    if (h.some((s) => s.topPartnerWeight !== null)) people.push('partner');
    const byWeight = people.length > 0;

    const rows = h.map(
      (s): ProgressRow =>
        byWeight
          ? { date: s.workout.date, me: s.topWeight, partner: s.topPartnerWeight }
          : { date: s.workout.date, reps: Math.max(...s.sets.map((x) => x.reps)) },
    );
    const series: ProgressSeries[] = byWeight
      ? people.map((p) => ({ key: p, label: PERSON_LABEL[p], color: PERSON_COLOR[p] }))
      : [{ key: 'reps', label: 'Reps', color: PERSON_COLOR.me }];
    return { people, rows, series, byWeight };
  }, [history]);

  if (exercise === null) return <NotFoundScreen />;
  if (!exercise || !history) return null;

  const records = people.map((p) => ({ person: p, best: findRecord(history, p) }));
  const recordSetIds = new Set(records.map((r) => r.best?.setId).filter(Boolean));
  const maxReps = Math.max(0, ...history.flatMap((s) => s.sets.map((x) => x.reps)));

  return (
    <Screen title={exercise.name} subtitle={routine?.name} backTo={gymPaths.routine(exercise.routineId)}>
      {history.length === 0 ? (
        <EmptyState icon={ChartLine} title="Sin datos todavía">
          Registra este ejercicio en un entrenamiento para ver su evolución.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {byWeight ? (
              records.map(({ person, best }) => (
                <StatTile
                  key={person}
                  label={
                    <>
                      <PersonDot person={person} /> Récord {PERSON_LABEL[person]}
                    </>
                  }
                  value={best ? `${formatKg(best.weight)} kg` : '–'}
                  detail={best ? `${best.reps} reps · ${formatDateShort(best.date)}` : undefined}
                />
              ))
            ) : (
              <StatTile label="Récord" value={`${maxReps} reps`} />
            )}
            <StatTile
              className={records.length === 2 ? 'col-span-2' : ''}
              label="Sesiones"
              value={String(history.length)}
              detail={`Última: ${formatDateShort(history.at(-1)!.workout.date)}`}
            />
          </div>

          <section className="rounded-2xl border border-border/60 bg-surface p-3">
            <h2 className="mb-2 px-1 text-sm font-semibold">
              {byWeight ? 'Peso máximo por sesión (kg)' : 'Reps máximas por sesión'}
            </h2>
            {rows.length < 2 ? (
              <p className="px-1 py-6 text-center text-sm text-muted">Con dos sesiones o más verás aquí la gráfica.</p>
            ) : (
              <Suspense fallback={<div className="h-56" />}>
                <ProgressChart data={rows} series={series} unit={byWeight ? 'kg' : 'reps'} />
              </Suspense>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Historial</h2>
            <ul className="grid gap-2">
              {[...history].reverse().map((s) => (
                <li key={s.workout.id} className="rounded-2xl border border-border/60 bg-surface p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{formatDateLong(s.workout.date)}</span>
                    {s.sets.some((x) => recordSetIds.has(x.id)) && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        <Trophy className="size-3.5" /> Récord
                      </span>
                    )}
                  </div>
                  <SetsTable sets={s.sets} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Screen>
  );
}
