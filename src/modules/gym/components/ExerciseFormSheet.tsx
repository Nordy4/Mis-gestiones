import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { Stepper } from '@/core/components/Stepper';
import {
  DEFAULT_REPS,
  DEFAULT_SETS,
  WEIGHT_STEP,
  type Exercise,
  type ExerciseInput,
  type Section,
} from '../data/types';

interface Props {
  open: boolean;
  /** Si se pasa, el formulario edita ese ejercicio; si no, crea uno nuevo. */
  exercise?: Exercise | null;
  sections: Section[];
  /** Sección preseleccionada al crear. */
  defaultSectionId?: string | null;
  onSubmit: (input: ExerciseInput) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export function ExerciseFormSheet({
  open,
  exercise,
  sections,
  defaultSectionId = null,
  onSubmit,
  onDelete,
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
    setWeight(exercise?.initialWeight ?? null);
    setPartnerWeight(exercise?.initialPartnerWeight ?? null);
  }, [open, exercise, defaultSectionId]);

  const valid = name.trim().length > 0 && (sets ?? 0) > 0 && (reps ?? 0) > 0;

  const chip = (active: boolean) =>
    `h-10 rounded-full px-4 text-sm font-medium ${
      active ? 'bg-accent text-black' : 'bg-surface-2 text-text active:bg-border'
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
            initialWeight: weight,
            initialPartnerWeight: partnerWeight,
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
        <Stepper
          label="Mi peso inicial (opcional)"
          value={weight}
          onChange={setWeight}
          step={WEIGHT_STEP}
          unit="kg"
          allowEmpty
          decimal
        />
        <Stepper
          label="Peso inicial pareja (opcional)"
          value={partnerWeight}
          onChange={setPartnerWeight}
          step={WEIGHT_STEP}
          unit="kg"
          allowEmpty
          decimal
        />
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
