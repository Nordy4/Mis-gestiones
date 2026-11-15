import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChartLine, Dumbbell, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button, IconButton } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { EmptyState } from '@/core/components/EmptyState';
import { formatKg, todayKey } from '@/core/lib/format';
import { gymRepo, useExercises, useLastWeight, useRoutine, useWorkout } from '../data/hooks';
import type { Exercise } from '../data/types';
import { ExerciseFormSheet } from '../components/ExerciseFormSheet';
import { RoutineNameSheet } from '../components/RoutineNameSheet';
import { gymPaths } from '../paths';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';

function ExerciseRow({ exercise, onEdit }: { exercise: Exercise; onEdit: () => void }) {
  const lastWeight = useLastWeight(exercise.id);
  return (
    <li className="flex items-center rounded-2xl border border-border/60 bg-surface">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 p-4 text-left active:opacity-70">
        <span className="block truncate font-semibold">{exercise.name}</span>
        <span className="block text-sm text-muted">
          {exercise.targetSets}×{exercise.targetReps}
          {lastWeight != null && <> · {formatKg(lastWeight)} kg</>}
        </span>
      </button>
      <Link
        to={gymPaths.exercise(exercise.id)}
        aria-label={`Estadísticas de ${exercise.name}`}
        className="grid size-14 shrink-0 place-items-center text-muted active:text-accent"
      >
        <ChartLine className="size-5" />
      </Link>
    </li>
  );
}

export function RoutineScreen() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const routine = useRoutine(routineId);
  const exercises = useExercises(routineId);
  const todayWorkout = useWorkout(routineId, todayKey());

  const [renaming, setRenaming] = useState(false);
  const [deletingRoutine, setDeletingRoutine] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

  if (routine === null || routine?.archivedAt) return <NotFoundScreen />;
  if (!routine || !exercises) return null;

  const inProgress = todayWorkout && !todayWorkout.finishedAt;

  return (
    <Screen
      title={routine.name}
      subtitle={`${exercises.length} ejercicio${exercises.length === 1 ? '' : 's'}`}
      backTo={gymPaths.home}
      actions={
        <>
          <IconButton label="Renombrar rutina" onClick={() => setRenaming(true)}>
            <Pencil className="size-5" />
          </IconButton>
          <IconButton label="Borrar rutina" onClick={() => setDeletingRoutine(true)}>
            <Trash2 className="size-5" />
          </IconButton>
        </>
      }
      footer={
        <Button
          size="lg"
          block
          disabled={exercises.length === 0}
          onClick={() => navigate(gymPaths.workout(routine.id))}
        >
          <Play className="size-5" />
          {inProgress ? 'Continuar entrenamiento' : todayWorkout ? 'Volver al entreno de hoy' : 'Empezar entrenamiento'}
        </Button>
      }
    >
      {exercises.length === 0 && (
        <EmptyState icon={Dumbbell} title="Rutina vacía">
          Añade tu primer ejercicio.
        </EmptyState>
      )}
      <ul className="grid gap-2">
        {exercises.map((ex) => (
          <ExerciseRow key={ex.id} exercise={ex} onEdit={() => setEditing(ex)} />
        ))}
      </ul>
      <Button variant="ghost" block className="mt-3 border border-dashed border-border" onClick={() => setAdding(true)}>
        <Plus className="size-5" /> Añadir ejercicio
      </Button>

      <RoutineNameSheet
        open={renaming}
        title="Renombrar rutina"
        initialName={routine.name}
        submitLabel="Guardar"
        onSubmit={(name) => gymRepo.renameRoutine(routine.id, name)}
        onClose={() => setRenaming(false)}
      />
      <ConfirmSheet
        open={deletingRoutine}
        title={`¿Borrar "${routine.name}"?`}
        message="La rutina desaparecerá de la lista. El historial de entrenamientos se conserva en la copia de seguridad."
        confirmLabel="Borrar"
        danger
        onConfirm={async () => {
          await gymRepo.archiveRoutine(routine.id);
          navigate(gymPaths.home, { replace: true });
        }}
        onClose={() => setDeletingRoutine(false)}
      />
      <ExerciseFormSheet
        open={adding}
        onSubmit={(input) => gymRepo.addExercise(routine.id, input).then(() => undefined)}
        onClose={() => setAdding(false)}
      />
      <ExerciseFormSheet
        open={editing !== null}
        exercise={editing}
        onSubmit={(input) => gymRepo.updateExercise(editing!.id, input)}
        onDelete={() => {
          setDeletingExercise(editing);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmSheet
        open={deletingExercise !== null}
        title={`¿Borrar "${deletingExercise?.name ?? ''}"?`}
        message="Se quitará de la rutina. Sus series registradas se conservan en la copia de seguridad."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deletingExercise && gymRepo.archiveExercise(deletingExercise.id)}
        onClose={() => setDeletingExercise(null)}
      />
    </Screen>
  );
}
