import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Dumbbell, FolderPlus, Pencil, Play, Plus, Timer, Trash2 } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button, IconButton } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { EmptyState } from '@/core/components/EmptyState';
import { NotFoundScreen } from '@/core/components/NotFoundScreen';
import { useNow } from '@/core/lib/useNow';
import { gymRepo, useActiveWorkout, useExercises, useRoutine, useSections, useVariantCounts } from '../data/hooks';
import type { Exercise, Section } from '../data/types';
import { ExerciseRow } from '../components/ExerciseRow';
import { VariantsSheet } from '../components/VariantsSheet';
import { ExerciseFormSheet } from '../components/ExerciseFormSheet';
import { RoutineNameSheet } from '../components/RoutineNameSheet';
import { SectionSheet } from '../components/SectionSheet';
import { groupBySection } from '../lib/grouping';
import { elapsedSeconds, formatClock } from '../lib/timer';
import { gymPaths } from '../paths';

export function RoutineScreen() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const routine = useRoutine(routineId);
  const sections = useSections(routineId);
  const exercises = useExercises(routineId);
  const variantCounts = useVariantCounts(routineId);
  const active = useActiveWorkout();
  const activeRoutine = useRoutine(active?.routineId);
  const now = useNow(!!active && !active.pausedAt);

  const [renaming, setRenaming] = useState(false);
  const [deletingRoutine, setDeletingRoutine] = useState(false);
  // undefined = cerrado; null = nuevo ejercicio sin sección; string = nuevo en esa sección
  const [addingIn, setAddingIn] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [variantsOfId, setVariantsOfId] = useState<string | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);

  if (routine === null || routine?.archivedAt) return <NotFoundScreen />;
  if (!routine || !exercises || !sections || active === undefined) return null;

  const groups = groupBySection(exercises, sections);
  // Se busca en la lista viva para que el panel muestre el nombre actualizado (y se cierre si se borra).
  const variantsOf = exercises.find((e) => e.id === variantsOfId) ?? null;
  const editingSectionIndex = sections.findIndex((s) => s.id === editingSectionId);
  const editingSection = editingSectionIndex >= 0 ? sections[editingSectionIndex] : null;
  // Posición del ejercicio en edición dentro de su grupo (para Subir / Bajar).
  const editingGroup = editing ? groups.find((g) => g.exercises.some((e) => e.id === editing.id)) : undefined;
  const editingIndex = editingGroup?.exercises.findIndex((e) => e.id === editing?.id) ?? -1;

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
          <IconButton label="Añadir sección" onClick={() => setCreatingSection(true)}>
            <FolderPlus className="size-4" />
          </IconButton>
          <IconButton label="Renombrar rutina" onClick={() => setRenaming(true)}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label="Borrar rutina" onClick={() => setDeletingRoutine(true)}>
            <Trash2 className="size-4" />
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
                <IconButton label={`Añadir ejercicio en ${section.name}`} onClick={() => setAddingIn(section.id)}>
                  <Plus className="size-4" />
                </IconButton>
                <IconButton label={`Editar sección ${section.name}`} onClick={() => setEditingSectionId(section.id)}>
                  <Pencil className="size-4" />
                </IconButton>
              </div>
            )}
            <ul className="divide-y divide-border/60 border-b border-border/60">
              {list.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  onEdit={() => setEditing(ex)}
                  onDelete={() => setDeletingExercise(ex)}
                  onManageVariants={() => setVariantsOfId(ex.id)}
                  variantCount={variantCounts?.[ex.id] ?? 0}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Sin secciones no hay icono "+" donde añadir: se deja este botón. */}
      {sections.length === 0 && (
        <Button
          variant="ghost"
          block
          className="mt-4 border border-dashed border-border text-muted"
          onClick={() => setAddingIn(null)}
        >
          <Plus className="size-4" /> Añadir ejercicio
        </Button>
      )}

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
        hideWeights={!!editing && (variantCounts?.[editing.id] ?? 0) > 0}
        sections={sections}
        canMoveUp={editingIndex > 0}
        canMoveDown={!!editingGroup && editingIndex >= 0 && editingIndex < editingGroup.exercises.length - 1}
        onMove={(dir) => editing && gymRepo.moveExercise(editing.id, dir)}
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
        message={
          variantCounts?.[deletingExercise?.id ?? '']
            ? 'Se quitará de la rutina junto con sus variantes. Su historial de pesos se conserva en la copia de seguridad.'
            : 'Se quitará de la rutina. Su historial de pesos se conserva en la copia de seguridad.'
        }
        confirmLabel="Borrar"
        danger
        onConfirm={() => deletingExercise && gymRepo.archiveExercise(deletingExercise.id)}
        onClose={() => setDeletingExercise(null)}
      />
      {/* key: se monta de nuevo por ejercicio para no enseñar un instante las variantes del anterior. */}
      <VariantsSheet key={variantsOf?.id ?? 'none'} exercise={variantsOf} onClose={() => setVariantsOfId(null)} />
    </Screen>
  );
}
