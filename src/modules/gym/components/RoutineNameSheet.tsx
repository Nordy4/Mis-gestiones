import { useEffect, useState } from 'react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';

interface Props {
  open: boolean;
  title: string;
  initialName?: string;
  submitLabel: string;
  onSubmit: (name: string) => void | Promise<void>;
  onClose: () => void;
  placeholder?: string;
}

/** Panel con un solo campo de nombre (rutinas, variantes). */
export function RoutineNameSheet({
  open,
  title,
  initialName = '',
  submitLabel,
  onSubmit,
  onClose,
  placeholder = 'p. ej. Hombro & Core',
}: Props) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const valid = name.trim().length > 0;

  return (
    <Sheet open={open} title={title} onClose={onClose}>
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
          placeholder={placeholder}
          autoFocus
          maxLength={60}
        />
        <Button type="submit" size="lg" block className="mt-5" disabled={!valid}>
          {submitLabel}
        </Button>
      </form>
    </Sheet>
  );
}
