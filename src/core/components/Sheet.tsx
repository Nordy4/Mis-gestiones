import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Panel que sube desde abajo (formularios, confirmaciones). Pensado para el pulgar. */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel pb-safe relative w-full max-w-xl rounded-t-3xl border-x-0 border-b-0 px-4 pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25" />
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {message && <div className="mb-5 text-sm text-muted">{message}</div>}
      <div className="flex gap-3">
        <Button variant="secondary" size="lg" block onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="lg"
          block
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
