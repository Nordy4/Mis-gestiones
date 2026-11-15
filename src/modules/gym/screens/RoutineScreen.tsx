import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChartLine, Dumbbell, FolderPlus, Pencil, Play, Plus, Timer, Trash2 } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button, IconButton } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { EmptyState } from '@/core/components/EmptyState';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { useNow } from '@/core/lib/useNow';
import { gymRepo, useActiveWorkout, useExercises, useRoutine, useSections } from '../data/hooks';
import type { Exercise, Section } from '../data/types';
import { ExerciseFormSheet } from '../components/ExerciseFormSheet';
import { RoutineNameSheet } from '../components/RoutineNameSheet';
import { SectionSheet } from '../components/SectionSheet';
import { WeightControl } from '../components/WeightControl';
import { groupBySection } from '../lib/grouping';
import { elapsedSeconds, formatClock } from '../lib/timer';
import { gymPaths } from '../paths';

function ExerciseRow({ exercise, onEdit }: { exercise: Exercise; onEdit: () => void }) {
  const save = (weight: number | null, partnerWeight: number | null) =>
    gymRepo.setWeights(exercise.id, weight, partnerWeight);
  return (
    <li className="rounded-2xl border border-border/60 bg-surface">
      <div className="flex items-center">
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 px-4 pt-3 pb-2 text-left active:opacity-70">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{exercise.name}</span>
            <span className="shrink-0 text-sm text-muted tabular-nums">
              {exercise.targetSets}×{exercise.targetReps}
            </span>
          </span>
        </button>
        <Link
          to={gymPaths.exercise(exercise.id)}
          aria-label={`Evolución de ${exercise.name}`}
          className="grid size-12 shrink-0 place-items-center text-muted active:text-accent"
        >
          <ChartLine className="size-5" />
        </Link>
      </div>
      <div className="space-y-2 px-3 pb-3">
        <WeightControl
          person="me"
          exerciseName={exercise.name}
          value={exercise.weight ?? null}
          onChange={(v) => save(v, exercise.partnerWeight ?? null)}
        />
        <WeightControl
          person="partner"
          exerciseName={exercise.name}
          value={exercise.partnerWeight ?? null}
          onChange={(v) => save(exercise.weight ?? null, v)}
        />
      </div>
    </li>
  );
}

export function RoutineScreen() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const routine = useRoutine(routineId);
  const sections = useSections(routineId);
  const exercises = useExercises(routineId);
  const active = useActiveWorkout();
  const activeRoutine = useRoutine(active?.routineId);
  const now = useNow(!!active && !active.pausedAt);

  const [renaming, setRenaming] = useState(false);
  const [deletingRoutine, setDeletingRoutine] = useState(false);
  // undefined = cerrado; null = nuevo ejercicio sin sección; string = nuevo en esa sección
  const [addingIn, setAddingIn] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);

  if (routine === null || routine?.archivedAt) return <NotFoundScreen />;
  if (!routine || !exercises || !sections || active === undefined) return null;

  const groups = groupBySection(exercises, sections);
  const editingSectionIndex = sections.findIndex((s) => s.id === editingSectionId);
  const editingSection = editingSectionIndex >= 0 ? sections[editingSectionIndex] : null;

  const footer = !active ? (
    <Button
      size="lg"
      block
      onClick={async () => {
        await gymRepo.startWorkout(routine.id);
        navigate(gymPaths.workout(routine.id));
      }}
    >
      <Play className="size-5" /> Empezar entrenamiento
    </Button>
  ) : active.routineId === routine.id ? (
    <Button size="lg" block onClick={() => navigate(gymPaths.workout(routine.id))}>
      <Timer className="size-5" /> Ver cronómetro · <span className="tabular-nums">{formatClock(elapsedSeconds(active, now))}</span>
    </Button>
  ) : (
    <Button size="lg" block variant="secondary" onClick={() => navigate(gymPaths.workout(active.routineId))}>
      <Timer className="size-5" /> En curso: {activeRoutine?.name ?? '…'}
    </Button>
  );

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
      footer={footer}
    >
      {exercises.length === 0 && sections.length === 0 && (
        <EmptyState icon={Dumbbell} title="Rutina vacía">
          Añade ejercicios y, si quieres, agrúpalos en secciones.
        </EmptyState>
      )}

      <div className="space-y-5">
        {groups.map(({ section, exercises: list }) => (
          <section key={section?.id ?? 'none'}>
            {section && (
              <div className="mb-2 flex items-center gap-1 pl-1">
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-wide text-muted uppercase">
                  {section.name}
                </h2>
                <IconButton label={`Editar sección ${section.name}`} onClick={() => setEditingSectionId(section.id)}>
                  <Pencil className="size-4" />
                </IconButton>
              </div>
            )}
            <ul className="grid gap-2">
              {list.map((ex) => (
                <ExerciseRow key={ex.id} exercise={ex} onEdit={() => setEditing(ex)} />
              ))}
            </ul>
            {section && (
              <Button
                variant="ghost"
                block
                className="mt-2 border border-dashed border-border text-muted"
                onClick={() => setAddingIn(section.id)}
              >
                <Plus className="size-4" /> Ejercicio en {section.name}
              </Button>
            )}
          </section>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setAddingIn(null)}>
          <Plus className="size-5" /> Ejercicio
        </Button>
        <Button variant="secondary" onClick={() => setCreatingSection(true)}>
          <FolderPlus className="size-5" /> Sección
        </Button>
      </div>

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
        message="La rutina desaparecerá de la lista. Los entrenamientos del calendario y el historial de pesos se conservan."
        confirmLabel="Borrar"
        danger
        onConfirm={async () => {
          await gymRepo.archiveRoutine(routine.id);
          navigate(gymPaths.home, { replace: true });
        }}
        onClose={() => setDeletingRoutine(false)}
      />

      <SectionSheet
        open={creatingSection}
        onSubmit={(name) => gymRepo.createSection(routine.id, name).then(() => undefined)}
        onClose={() => setCreatingSection(false)}
      />
      <SectionSheet
        open={editingSection !== null}
        section={editingSection}
        canMoveUp={editingSectionIndex > 0}
        canMoveDown={editingSectionIndex >= 0 && editingSectionIndex < sections.length - 1}
        onMove={(dir) => editingSection && gymRepo.moveSection(editingSection.id, dir)}
        onSubmit={(name) => gymRepo.renameSection(editingSection!.id, name)}
        onDelete={() => {
          setDeletingSection(editingSection);
          setEditingSectionId(null);
        }}
        onClose={() => setEditingSectionId(null)}
      />
      <ConfirmSheet
        open={deletingSection !== null}
        title={`¿Borrar la sección "${deletingSection?.name ?? ''}"?`}
        message="Sus ejercicios no se borran: pasan a estar sin sección."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deletingSection && gymRepo.archiveSection(deletingSection.id)}
        onClose={() => setDeletingSection(null)}
      />

      <ExerciseFormSheet
        open={addingIn !== undefined}
        sections={sections}
        defaultSectionId={addingIn ?? null}
        onSubmit={(input) => gymRepo.addExercise(routine.id, input).then(() => undefined)}
        onClose={() => setAddingIn(undefined)}
      />
      <ExerciseFormSheet
        open={editing !== null}
        exercise={editing}
        sections={sections}
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
        message="Se quitará de la rutina. Su historial de pesos se conserva en la copia de seguridad."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deletingExercise && gymRepo.archiveExercise(deletingExercise.id)}
        onClose={() => setDeletingExercise(null)}
      />
    </Screen>
  );
}
