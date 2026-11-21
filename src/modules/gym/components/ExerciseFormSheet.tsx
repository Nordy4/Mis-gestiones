import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { Stepper } from '@/core/components/Stepper';
import {
  DEFAULT_REPS,
  DEFAULT_SETS,
  PERSON_LABEL,
  type Exercise,
  type ExerciseInput,
  type Section,
} from '../data/types';
import { PersonDot } from './PersonWeights';
import { WeightInput } from './WeightInput';

interface Props {
  open: boolean;
  /** Si se pasa, el formulario edita ese ejercicio; si no, crea uno nuevo. */
  exercise?: Exercise | null;
  sections: Section[];
  /** Sección preseleccionada al crear. */
  defaultSectionId?: string | null;
  onSubmit: (input: ExerciseInput) => void | Promise<void>;
  onDelete?: () => void;
  /** Reordenar dentro de su sección (solo al editar). Se aplica al momento. */
  onMove?: (direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  /** Ejercicio con variantes: no tiene pesos propios, así que no se muestran. */
  hideWeights?: boolean;
  onClose: () => void;
}

export function ExerciseFormSheet({
  open,
  exercise,
  sections,
  defaultSectionId = null,
  onSubmit,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
  hideWeights = false,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sets, setSets] = useState<number | null>(DEFAULT_SETS);
  const [reps, setReps] = useState<number | null>(DEFAULT_REPS);
  const [weight, setWeight] = useState<number | null>(null);
  const [partnerWeight, setPartnerWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? '');
    setSectionId(exercise ? (exercise.sectionId ?? null) : defaultSectionId);
    setSets(exercise?.targetSets ?? DEFAULT_SETS);
    setReps(exercise?.targetReps ?? DEFAULT_REPS);
    setWeight(exercise?.weight ?? null);
    setPartnerWeight(exercise?.partnerWeight ?? null);
  }, [open, exercise, defaultSectionId]);

  const valid = name.trim().length > 0 && (sets ?? 0) > 0 && (reps ?? 0) > 0;

  const chip = (active: boolean) =>
    `h-10 rounded-full px-4 text-sm font-medium ${
      active ? 'bg-accent-gradient text-white' : 'bg-surface-2 text-text active:bg-white/15'
    }`;

  return (
    <Sheet open={open} title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'} onClose={onClose}>
      <form
        className="max-h-[75vh] space-y-4 overflow-y-auto pb-1"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onSubmit({
            name,
            sectionId,
            targetSets: sets!,
            targetReps: reps!,
            weight,
            partnerWeight,
          });
          onClose();
        }}
      >
        <Field
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="p. ej. Press militar"
          autoFocus={!exercise}
          maxLength={60}
        />

        {sections.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Sección</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(sectionId === null)} onClick={() => setSectionId(null)}>
                Sin sección
              </button>
              {sections.map((s) => (
                <button key={s.id} type="button" className={chip(sectionId === s.id)} onClick={() => setSectionId(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Series" value={sets} onChange={setSets} step={1} min={1} />
          <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />
        </div>
        <div className={hideWeights ? 'hidden' : 'grid grid-cols-2 gap-3'}>
          {(
            [
              ['me', weight, setWeight],
              ['partner', partnerWeight, setPartnerWeight],
            ] as const
          ).map(([person, value, set]) => (
            <div key={person}>
              <span className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
                <PersonDot person={person} /> Peso {PERSON_LABEL[person]}
              </span>
              <WeightInput person={person} exerciseName={name || 'nuevo ejercicio'} value={value} onChange={set} />
            </div>
          ))}
        </div>
        {exercise && onMove && (
          <div>
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
              Posición en la sección
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={!canMoveUp} onClick={() => onMove(-1)} className="flex-1">
                <ArrowUp className="size-4" /> Subir
              </Button>
              <Button variant="secondary" disabled={!canMoveDown} onClick={() => onMove(1)} className="flex-1">
                <ArrowDown className="size-4" /> Bajar
              </Button>
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-1">
          {exercise && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar ejercicio">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {exercise ? 'Guardar' : 'Añadir'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
