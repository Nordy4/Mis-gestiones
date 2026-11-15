import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import type { Section } from '../data/types';

interface Props {
  open: boolean;
  /** Si se pasa, edita esa sección; si no, crea una nueva. */
  section?: Section | null;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSubmit: (name: string) => void | Promise<void>;
  onMove?: (direction: -1 | 1) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function SectionSheet({
  open,
  section,
  canMoveUp,
  canMoveDown,
  onSubmit,
  onMove,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(section?.name ?? '');
  }, [open, section]);

  const valid = name.trim().length > 0;

  return (
    <Sheet open={open} title={section ? 'Editar sección' : 'Nueva sección'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onSubmit(name);
          onClose();
        }}
      >
        <Field
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="p. ej. Calentamiento, Bíceps, Core"
          autoFocus={!section}
          maxLength={40}
        />
        {section && (
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" disabled={!canMoveUp} onClick={() => onMove?.(-1)} className="flex-1">
              <ArrowUp className="size-4" /> Subir
            </Button>
            <Button variant="secondary" disabled={!canMoveDown} onClick={() => onMove?.(1)} className="flex-1">
              <ArrowDown className="size-4" /> Bajar
            </Button>
          </div>
        )}
        <div className="mt-4 flex gap-3">
          {section && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar sección">
              <Trash2 className="size-5" />
            </Button>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {section ? 'Guardar' : 'Crear sección'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
