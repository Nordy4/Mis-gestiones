import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Flag } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { formatDateLong, todayKey } from '@/core/lib/format';
import { gymRepo, useExercises, useRoutine, useSections, useWorkout, useWorkoutSets } from '../data/hooks';
import type { Exercise, WorkoutSet } from '../data/types';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { displayOrder, groupBySection } from '../lib/grouping';
import { gymPaths } from '../paths';

function firstIncomplete(ordered: Exercise[], byExercise: Map<string, WorkoutSet[]>) {
  return ordered.find((e) => (byExercise.get(e.id)?.length ?? 0) < e.targetSets)?.id ?? null;
}

export function WorkoutScreen() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const date = todayKey();
  const routine = useRoutine(routineId);
  const sections = useSections(routineId);
  const exercises = useExercises(routineId);
  const workout = useWorkout(routineId, date);
  const sets = useWorkoutSets(workout?.id);

  // undefined = automático (primer ejercicio sin completar); null = todos cerrados.
  const [expandedId, setExpandedId] = useState<string | null | undefined>(undefined);

  const byExercise = useMemo(() => {
    const map = new Map<string, WorkoutSet[]>();
    for (const s of sets ?? []) {
      const arr = map.get(s.exerciseId) ?? [];
      arr.push(s);
      map.set(s.exerciseId, arr);
    }
    return map;
  }, [sets]);

  if (routine === null || routine?.archivedAt) return <NotFoundScreen />;
  if (!routine || !exercises || !sections || workout === undefined || sets === undefined) return null;

  const ordered = displayOrder(exercises, sections);
  const groups = groupBySection(exercises, sections).filter((g) => g.exercises.length > 0);
  const current = expandedId === undefined ? firstIncomplete(ordered, byExercise) : expandedId;
  const totalSets = sets.length;

  const addSet = async (exercise: Exercise, weight: number | null, partnerWeight: number | null, reps: number) => {
    const w = workout ?? (await gymRepo.getOrCreateWorkout(routine.id, date));
    await gymRepo.addSet(w.id, exercise.id, weight, partnerWeight, reps);
    // Al completar las series objetivo, salta al siguiente ejercicio pendiente.
    const doneNow = (byExercise.get(exercise.id)?.length ?? 0) + 1;
    if (doneNow >= exercise.targetSets) {
      const next = new Map(byExercise);
      next.set(exercise.id, new Array(doneNow));
      setExpandedId(firstIncomplete(ordered, next) ?? exercise.id);
    }
  };

  const finish = async () => {
    if (workout) await gymRepo.finishWorkout(workout.id);
    navigate(gymPaths.routine(routine.id), { replace: true });
  };

  return (
    <Screen
      title={routine.name}
      subtitle={formatDateLong(date)}
      backTo={gymPaths.routine(routine.id)}
      footer={
        <Button size="lg" block variant={totalSets ? 'primary' : 'secondary'} onClick={finish}>
          <Flag className="size-5" />
          {totalSets ? `Terminar (${totalSets} serie${totalSets === 1 ? '' : 's'})` : 'Salir sin guardar'}
        </Button>
      }
    >
      <p className="mb-3 text-xs text-muted">Cada serie se guarda al momento. Deja vacío el peso de quien no la haga.</p>
      <div className="space-y-5">
        {groups.map(({ section, exercises: list }) => (
          <section key={section?.id ?? 'none'}>
            {section && (
              <h2 className="mb-2 pl-1 text-sm font-semibold tracking-wide text-muted uppercase">{section.name}</h2>
            )}
            <ul className="grid gap-3">
              {list.map((ex) => (
                <ExerciseLogger
                  key={ex.id}
                  exercise={ex}
                  sets={byExercise.get(ex.id) ?? []}
                  expanded={current === ex.id}
                  onToggle={() => setExpandedId(current === ex.id ? null : ex.id)}
                  onAddSet={(weight, partnerWeight, reps) => addSet(ex, weight, partnerWeight, reps)}
                  onDeleteSet={(id) => gymRepo.deleteSet(id)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Screen>
  );
}
