import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Pencil, Plus, ShoppingBag } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button, IconButton } from '@/core/components/Button';
import { EmptyState } from '@/core/components/EmptyState';
import { ConfirmSheet } from '@/core/components/Sheet';
import { extractUrl, safeHttpUrl } from '@/core/lib/links';
import { comprasRepo, useProducts } from '../data/hooks';
import type { Product } from '../data/types';
import { ProductSheet } from '../components/ProductSheet';

function ProductRow({ p, onEdit }: { p: Product; onEdit: () => void }) {
  // Solo enlaces e imágenes http(s): nunca `javascript:` ni otros esquemas (XSS).
  const href = safeHttpUrl(p.url);
  const image = safeHttpUrl(p.imageUrl);
  const content = (
    <>
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
        {image ? (
          <img src={image} alt="" loading="lazy" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <ShoppingBag className="size-6 text-muted" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 leading-snug font-semibold">{p.title || p.site}</span>
        <span className="block truncate text-sm text-muted">{href ? p.site : 'Enlace no válido'}</span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 py-3">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70"
        >
          {content}
        </a>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{content}</span>
      )}
      <IconButton label={`Editar ${p.title}`} onClick={onEdit} className="size-9">
        <Pencil className="size-4" />
      </IconButton>
    </li>
  );
}

/** Lista de productos guardados. Recibe también los enlaces compartidos desde otras apps. */
export function ProductsScreen() {
  const products = useProducts();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState<{ url: string; title: string } | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  // Enlace compartido (Android → Compartir → Mi Vida): ?url=&title=&text=
  useEffect(() => {
    const shared = params.get('url') || params.get('text') || params.get('title');
    if (!shared) return;
    const text = params.get('text') ?? '';
    const url = (params.get('url') || extractUrl(text) || extractUrl(params.get('title')) || '').trim();
    const title = (params.get('title') || text.replace(url, '')).replace(/\s+/g, ' ').trim();
    setAdding({ url, title });
    setParams({}, { replace: true });
  }, [params, setParams]);

  return (
    <Screen
      title="Compras"
      subtitle="Productos guardados"
      backTo="/"
      footer={
        <Button size="lg" block onClick={() => setAdding({ url: '', title: '' })}>
          <Plus className="size-5" /> Añadir enlace
        </Button>
      }
    >
      {products && products.length === 0 && (
        <EmptyState icon={ShoppingBag} title="Aún no has guardado nada">
          En la tienda o en el navegador pulsa Compartir → Mi Vida, o añade el enlace con el botón de abajo.
        </EmptyState>
      )}

      {products && products.length > 0 && (
        <ul className="divide-y divide-border/60 border-b border-border/60">
          {products.map((p) => (
            <ProductRow key={p.id} p={p} onEdit={() => setEditing(p)} />
          ))}
        </ul>
      )}

      <ProductSheet
        open={adding !== null}
        initial={adding}
        onSubmit={(input) => comprasRepo.addProduct(input).then(() => undefined)}
        onClose={() => setAdding(null)}
      />
      <ProductSheet
        open={editing !== null}
        product={editing}
        onSubmit={(input) => comprasRepo.updateProduct(editing!.id, input)}
        onDelete={() => {
          setDeleting(editing);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmSheet
        open={deleting !== null}
        title="¿Borrar este producto?"
        message={deleting?.title}
        confirmLabel="Borrar"
        danger
        onConfirm={() => deleting && comprasRepo.deleteProduct(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}
