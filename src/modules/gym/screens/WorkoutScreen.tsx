import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Flag } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { formatDateLong, todayKey } from '@/core/lib/format';
import { gymRepo, useExercises, useRoutine, useWorkout, useWorkoutSets } from '../data/hooks';
import type { Exercise, WorkoutSet } from '../data/types';
import { ExerciseLogger } from '../components/ExerciseLogger';
import { gymPaths } from '../paths';

function firstIncomplete(exercises: Exercise[], byExercise: Map<string, WorkoutSet[]>) {
  return exercises.find((e) => (byExercise.get(e.id)?.length ?? 0) < e.targetSets)?.id ?? null;
}

export function WorkoutScreen() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const date = todayKey();
  const routine = useRoutine(routineId);
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
  if (!routine || !exercises || workout === undefined || sets === undefined) return null;

  const current = expandedId === undefined ? firstIncomplete(exercises, byExercise) : expandedId;
  const totalSets = sets.length;

  const addSet = async (exercise: Exercise, weight: number | null, reps: number) => {
    const w = workout ?? (await gymRepo.getOrCreateWorkout(routine.id, date));
    await gymRepo.addSet(w.id, exercise.id, weight, reps);
    // Al completar las series objetivo, salta al siguiente ejercicio pendiente.
    const doneNow = (byExercise.get(exercise.id)?.length ?? 0) + 1;
    if (doneNow >= exercise.targetSets) {
      const next = new Map(byExercise);
      next.set(exercise.id, new Array(doneNow));
      setExpandedId(firstIncomplete(exercises, next) ?? exercise.id);
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
      <p className="mb-3 text-xs text-muted">Cada serie se guarda al momento.</p>
      <ul className="grid gap-3">
        {exercises.map((ex) => (
          <ExerciseLogger
            key={ex.id}
            exercise={ex}
            sets={byExercise.get(ex.id) ?? []}
            expanded={current === ex.id}
            onToggle={() => setExpandedId(current === ex.id ? null : ex.id)}
            onAddSet={(weight, reps) => addSet(ex, weight, reps)}
            onDeleteSet={(id) => gymRepo.deleteSet(id)}
          />
        ))}
      </ul>
    </Screen>
  );
}
