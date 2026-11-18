import { useEffect, useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { isGoogleMapsUrl, safeHttpUrl } from '@/core/lib/links';
import type { MotoRoute, MotoRouteInput } from '../data/types';

interface Props {
  open: boolean;
  /** Si se pasa, edita esa ruta. */
  route?: MotoRoute | null;
  /** Valores iniciales al añadir (p. ej. de un enlace compartido desde Google Maps). */
  initial?: { url: string; name: string } | null;
  onSubmit: (input: MotoRouteInput) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

/** Guardar o editar una ruta: nombre + enlace de Google Maps. */
export function RouteSheet({ open, route, initial, onSubmit, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(route?.name ?? initial?.name ?? '');
    setUrl(route?.url ?? initial?.url ?? '');
  }, [open, route, initial]);

  const link = safeHttpUrl(url);
  const valid = name.trim() !== '' && link !== null;

  return (
    <Sheet open={open} title={route ? 'Editar ruta' : 'Guardar ruta'} onClose={onClose}>
      <form
        className="max-h-[75vh] space-y-4 overflow-y-auto pb-1"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await onSubmit({ name, url: link! });
          onClose();
        }}
      >
        <Field
          label="Nombre de la ruta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="p. ej. Puertos de Montseny"
          maxLength={80}
          autoFocus={!route}
        />
        <Field
          label="Enlace de Google Maps"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
        />
        {link && !isGoogleMapsUrl(link) && (
          <p className="text-xs text-amber-300">No parece un enlace de Google Maps, pero se guardará igual.</p>
        )}

        <div className="flex gap-3 pt-1">
          {route && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar ruta">
              <Trash2 className="size-5" />
            </Button>
          )}
          {route && safeHttpUrl(route.url) && (
            <a
              href={safeHttpUrl(route.url)!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir en Google Maps"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-surface-2 text-text active:bg-border"
            >
              <ExternalLink className="size-5" />
            </a>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {route ? 'Guardar' : 'Guardar ruta'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
