import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/core/components/Button';
import { ConfirmSheet, Sheet } from '@/core/components/Sheet';
import { gymRepo, useVariants } from '../data/hooks';
import type { Exercise } from '../data/types';
import { RoutineNameSheet } from './RoutineNameSheet';

interface Props {
  /** Ejercicio principal cuyas variantes se muestran; null = cerrado. */
  exercise: Exercise | null;
  onClose: () => void;
}

/**
 * Panel para gestionar la lista de variantes de un ejercicio (icono junto a la papelera de la
 * fila): crear, renombrar y borrar. Solo nombres: los pesos se escriben en la fila de la rutina y
 * la variante en uso se elige con la flecha junto al nombre del ejercicio.
 * Mientras se nombra o borra una variante este panel se oculta para no apilar dos paneles.
 */
export function VariantsSheet({ exercise, onClose }: Props) {
  const variants = useVariants(exercise?.id);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState<Exercise | null>(null);

  if (!exercise) return null;
  const list = variants ?? [];
  const subOpen = adding || renaming !== null || deleting !== null;

  return (
    <>
      <Sheet open={!subOpen} title={`Variantes de ${exercise.name}`} onClose={onClose}>
        <div className="max-h-[65vh] overflow-y-auto pb-3">
          {variants !== undefined && list.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">
              Aún no hay variantes. Cada una tendrá sus propios pesos, que se apuntan en la rutina.
            </p>
          )}
          {list.length > 0 && (
            <ul className="mb-3 divide-y divide-border/60 border-b border-border/60">
              {list.map((v) => (
                <li key={v.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRenaming(v)}
                    className="flex h-14 min-w-0 flex-1 items-center text-left text-base active:opacity-70"
                  >
                    <span className="truncate">{v.name}</span>
                  </button>
                  <IconButton label={`Renombrar ${v.name}`} onClick={() => setRenaming(v)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={`Borrar ${v.name}`} onClick={() => setDeleting(v)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="ghost"
            block
            className="border border-dashed border-border text-muted"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" /> Añadir variante
          </Button>
        </div>
      </Sheet>

      <RoutineNameSheet
        open={adding}
        title="Nueva variante"
        submitLabel="Añadir"
        placeholder="p. ej. Con mancuernas"
        onSubmit={(name) => gymRepo.addVariant(exercise.id, name).then(() => undefined)}
        onClose={() => setAdding(false)}
      />
      <RoutineNameSheet
        open={renaming !== null}
        title="Renombrar variante"
        initialName={renaming?.name ?? ''}
        submitLabel="Guardar"
        placeholder="p. ej. Con mancuernas"
        onSubmit={async (name) => {
          if (renaming) await gymRepo.renameExercise(renaming.id, name);
        }}
        onClose={() => setRenaming(null)}
      />
      <ConfirmSheet
        open={deleting !== null}
        title={`¿Borrar la variante "${deleting?.name ?? ''}"?`}
        message="Se quitará de las variantes. Su historial de pesos se conserva en la copia de seguridad."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deleting && gymRepo.archiveExercise(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
