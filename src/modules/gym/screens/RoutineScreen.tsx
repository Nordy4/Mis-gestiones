import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChartLine, Dumbbell, FolderPlus, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button, IconButton } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { EmptyState } from '@/core/components/EmptyState';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { todayKey } from '@/core/lib/format';
import { gymRepo, useExercises, useLastWeights, useRoutine, useSections, useWorkout } from '../data/hooks';
import type { Exercise, Section } from '../data/types';
import { ExerciseFormSheet } from '../components/ExerciseFormSheet';
import { RoutineNameSheet } from '../components/RoutineNameSheet';
import { SectionSheet } from '../components/SectionSheet';
import { WeightBadges } from '../components/PersonWeights';
import { groupBySection } from '../lib/grouping';
import { gymPaths } from '../paths';

function ExerciseRow({ exercise, onEdit }: { exercise: Exercise; onEdit: () => void }) {
  const last = useLastWeights(exercise.id);
  return (
    <li className="flex items-center rounded-2xl border border-border/60 bg-surface">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 p-4 text-left active:opacity-70">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{exercise.name}</span>
          <span className="shrink-0 text-sm text-muted tabular-nums">
            {exercise.targetSets}×{exercise.targetReps}
          </span>
        </span>
        {last && (last.weight != null || last.partnerWeight != null) && (
          <span className="mt-2 block">
            <WeightBadges weight={last.weight} partnerWeight={last.partnerWeight} />
          </span>
        )}
      </button>
      <Link
        to={gymPaths.exercise(exercise.id)}
        aria-label={`Estadísticas de ${exercise.name}`}
        className="grid size-14 shrink-0 place-items-center self-stretch text-muted active:text-accent"
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
  const sections = useSections(routineId);
  const exercises = useExercises(routineId);
  const todayWorkout = useWorkout(routineId, todayKey());

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
  if (!routine || !exercises || !sections) return null;

  const groups = groupBySection(exercises, sections);
  const inProgress = todayWorkout && !todayWorkout.finishedAt;
  const editingSectionIndex = sections.findIndex((s) => s.id === editingSectionId);
  const editingSection = editingSectionIndex >= 0 ? sections[editingSectionIndex] : null;

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
        message="La rutina desaparecerá de la lista. El historial de entrenamientos se conserva en la copia de seguridad."
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
        message="Se quitará de la rutina. Sus series registradas se conservan en la copia de seguridad."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deletingExercise && gymRepo.archiveExercise(deletingExercise.id)}
        onClose={() => setDeletingExercise(null)}
      />
    </Screen>
  );
}
