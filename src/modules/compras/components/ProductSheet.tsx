import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, ShoppingBag, Trash2 } from 'lucide-react';
import { Sheet } from '@/core/components/Sheet';
import { Field } from '@/core/components/Field';
import { Button } from '@/core/components/Button';
import { fetchLinkPreview, isHttpUrl, safeHttpUrl, siteOf } from '@/core/lib/links';
import type { Product, ProductInput } from '../data/types';

interface Props {
  open: boolean;
  /** Si se pasa, edita ese producto. */
  product?: Product | null;
  /** Valores iniciales al añadir (p. ej. de un enlace compartido). */
  initial?: { url: string; title: string } | null;
  onSubmit: (input: ProductInput) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

/** Añadir o editar un producto. Al poner el enlace busca nombre y foto (si hay sesión). */
export function ProductSheet({ open, product, initial, onSubmit, onDelete, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [site, setSite] = useState('');
  const [loading, setLoading] = useState(false);
  // Si escribes el nombre a mano, la vista previa ya no lo pisa.
  const titleTouched = useRef(false);
  const lastFetched = useRef('');

  useEffect(() => {
    if (!open) return;
    titleTouched.current = !!product;
    lastFetched.current = product?.url ?? '';
    setUrl(product?.url ?? initial?.url ?? '');
    setTitle(product?.title ?? initial?.title ?? '');
    setImageUrl(product?.imageUrl ?? null);
    setSite(product?.site ?? '');
    if (!product && initial?.title) titleTouched.current = false;
  }, [open, product, initial]);

  // Vista previa al cambiar el enlace (con una pequeña espera mientras escribes).
  useEffect(() => {
    if (!open) return;
    const target = url.trim();
    if (!isHttpUrl(target) || target === lastFetched.current) return;
    const timer = setTimeout(async () => {
      lastFetched.current = target;
      setSite(siteOf(target));
      setLoading(true);
      const preview = await fetchLinkPreview(target);
      setLoading(false);
      if (!preview) return;
      if (preview.title && !titleTouched.current) setTitle(preview.title);
      if (safeHttpUrl(preview.image)) setImageUrl(safeHttpUrl(preview.image));
      if (preview.site) setSite(preview.site);
    }, 500);
    return () => clearTimeout(timer);
  }, [url, open]);

  const valid = isHttpUrl(url.trim());

  return (
    <Sheet open={open} title={product ? 'Editar producto' : 'Guardar producto'} onClose={onClose}>
      <form
        className="max-h-[75vh] space-y-4 overflow-y-auto pb-1"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          const finalUrl = url.trim();
          await onSubmit({
            url: finalUrl,
            title: title.trim() || site || siteOf(finalUrl),
            imageUrl,
            site: site || siteOf(finalUrl),
          });
          onClose();
        }}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg">
            {loading ? (
              <Loader2 className="size-6 animate-spin text-muted" />
            ) : safeHttpUrl(imageUrl) ? (
              <img src={safeHttpUrl(imageUrl)!} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <ShoppingBag className="size-7 text-muted" />
            )}
          </div>
          <p className="min-w-0 text-sm text-muted">
            {loading ? 'Buscando datos del producto…' : site || 'Pega el enlace del producto'}
          </p>
        </div>

        <Field
          label="Enlace"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          autoFocus={!product && !initial}
        />
        <Field
          label="Nombre del producto"
          value={title}
          onChange={(e) => {
            titleTouched.current = true;
            setTitle(e.target.value);
          }}
          placeholder="p. ej. Zapatillas running"
          maxLength={200}
        />

        <div className="flex gap-3 pt-1">
          {product && onDelete && (
            <Button variant="danger" size="lg" onClick={onDelete} aria-label="Borrar producto">
              <Trash2 className="size-5" />
            </Button>
          )}
          {product && safeHttpUrl(product.url) && (
            <a
              href={safeHttpUrl(product.url)!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir enlace"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-surface-2 text-text active:bg-border"
            >
              <ExternalLink className="size-5" />
            </a>
          )}
          <Button type="submit" size="lg" block disabled={!valid}>
            {product ? 'Guardar' : 'Guardar producto'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
