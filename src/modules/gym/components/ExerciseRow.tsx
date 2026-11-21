import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronDown, Layers, Trash2 } from 'lucide-react';
import { IconButton } from '@/core/components/Button';
import { formatDateShort, formatKg } from '@/core/lib/format';
import { gymRepo, useVariants, useWeightHistory } from '../data/hooks';
import { PERSON_LABEL, type Exercise, type Person, type WeightLogEntry } from '../data/types';
import { gymPaths } from '../paths';
import { PersonDot } from './PersonWeights';
import { WeightInput } from './WeightInput';

/** Último peso registrado de una persona en el historial (con su fecha). */
function lastRecord(history: WeightLogEntry[], person: Person) {
  for (let i = history.length - 1; i >= 0; i--) {
    const w = person === 'me' ? history[i].weight : history[i].partnerWeight;
    if (w != null) return { weight: w, date: history[i].date };
  }
  return null;
}

/** Ancho del desplegable de variantes (px), para decidir si cabe alineado a la izquierda. */
const MENU_WIDTH = 208;

interface VariantMenuProps {
  exercise: Exercise;
  variants: Exercise[];
  selectedId: string;
}

/** Flecha junto al nombre: abre justo debajo un desplegable con las variantes para elegir una. */
function VariantMenu({ exercise, variants, selectedId }: VariantMenuProps) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Elegir variante de ${exercise.name}`}
        onClick={(e) => {
          // Si no cabe hacia la derecha, se abre alineado al borde derecho de la flecha.
          const r = e.currentTarget.getBoundingClientRect();
          setAlignRight(r.left + MENU_WIDTH > window.innerWidth - 16);
          setOpen((o) => !o);
        }}
        className="-my-2 flex size-11 items-center justify-center rounded-full text-muted active:bg-white/10"
      >
        <ChevronDown className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={`Variantes de ${exercise.name}`}
          style={{ width: MENU_WIDTH }}
          className={`glass-panel absolute top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl py-1 shadow-xl ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          {variants.map((v) => {
            const selected = v.id === selectedId;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={async () => {
                    setOpen(false);
                    if (!selected) await gymRepo.selectVariant(exercise.id, v.id);
                  }}
                  className="flex h-11 w-full items-center gap-2 px-3 text-left active:bg-white/10"
                >
                  <span className={`min-w-0 flex-1 truncate ${selected ? 'font-semibold text-text' : 'text-muted'}`}>
                    {v.name}
                  </span>
                  {selected && <Check className="size-4 shrink-0 text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface ExerciseRowProps {
  exercise: Exercise;
  onEdit: () => void;
  onDelete: () => void;
  /** Abre el panel para crear, renombrar o borrar variantes (icono junto a la papelera). */
  onManageVariants: () => void;
  /** Número de variantes activas. */
  variantCount?: number;
}

/**
 * Fila de ejercicio: nombre (y debajo, en gris, la variante elegida) + pesos subrayados (yo morado,
 * pareja azul pastel) y debajo el último registro de cada uno. Tocar el nombre edita; tocar los
 * registros abre la evolución. Con variantes, la flecha junto al nombre elige cuál se usa.
 */
export function ExerciseRow({ exercise, onEdit, onDelete, onManageVariants, variantCount = 0 }: ExerciseRowProps) {
  // Con variantes, el ejercicio por sí solo no tiene pesos: la fila muestra y edita los de la
  // variante elegida (o la primera si no hay ninguna elegida o se borró).
  const variants = useVariants(variantCount > 0 ? exercise.id : undefined);
  const variant = variants?.length
    ? (variants.find((v) => v.id === exercise.selectedVariantId) ?? variants[0])
    : null;
  const shown = variant ?? exercise;
  const shownName = variant ? `${exercise.name} (${variant.name})` : exercise.name;

  const history = useWeightHistory(shown.id);
  // Mientras cargan las variantes no se enseñan los pesos del ejercicio (no son reales).
  if (variantCount > 0 && !variant) return <li className="h-[5.5rem]" aria-busy="true" />;
  const save = (weight: number | null, partnerWeight: number | null) =>
    gymRepo.setWeights(shown.id, weight, partnerWeight);

  const record = (person: Person) => {
    const r = history ? lastRecord(history, person) : null;
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <PersonDot person={person} />
        <span className="sr-only">{PERSON_LABEL[person]}:</span>
        <span className="truncate">
          {history === undefined ? '…' : r ? `${formatKg(r.weight)} kg · ${formatDateShort(r.date)}` : 'sin registro'}
        </span>
      </span>
    );
  };

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center">
          <button type="button" onClick={onEdit} className="min-w-0 text-left active:opacity-70">
            <span className="line-clamp-2 text-lg leading-tight font-semibold">{exercise.name}</span>
            {variant && (
              <span className="block truncate text-sm leading-tight font-medium text-muted">{variant.name}</span>
            )}
          </button>
          {variant && variants && <VariantMenu exercise={exercise} variants={variants} selectedId={variant.id} />}
        </div>
        <WeightInput
          key={`me-${shown.id}`}
          person="me"
          exerciseName={shownName}
          value={shown.weight ?? null}
          onChange={(v) => save(v, shown.partnerWeight ?? null)}
        />
        <WeightInput
          key={`partner-${shown.id}`}
          person="partner"
          exerciseName={shownName}
          value={shown.partnerWeight ?? null}
          onChange={(v) => save(shown.weight ?? null, v)}
        />
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-muted">
        <Link
          to={gymPaths.exercise(shown.id)}
          aria-label={`Evolución de ${shownName}`}
          className="flex min-w-0 flex-1 items-center gap-4 py-1 active:opacity-70"
        >
          {record('me')}
          {record('partner')}
        </Link>
        <IconButton
          label={`Variantes de ${exercise.name}${variantCount ? ` (${variantCount})` : ''}`}
          onClick={onManageVariants}
          className="-my-2"
        >
          <Layers className="size-4" />
        </IconButton>
        <IconButton label={`Borrar ${exercise.name}`} onClick={onDelete} className="-my-2 -mr-2">
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </li>
  );
}
