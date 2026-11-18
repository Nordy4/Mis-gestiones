import type { SharedData } from '@/core/types';
import { modules } from '@/modules/registry';
import { extractUrl } from './links';

/**
 * Web Share Target: al compartir un enlace con la app instalada, Android abre
 * `index.html?title=…&text=…&url=…` (ver `share_target` en vite.config.ts).
 * Antes de montar el router, pasamos esos datos a la ruta del módulo que los recibe y quitamos
 * la query de la URL. Elige el primer módulo cuyo `shareTarget.accepts` lo acepte (p. ej. Rutas
 * para enlaces de Google Maps); si ninguno, el módulo con `shareTarget` sin `accepts` (Compras).
 */
export function consumeShareTarget(): void {
  const search = new URLSearchParams(window.location.search);
  const shared = new URLSearchParams();
  for (const key of ['url', 'title', 'text']) {
    const value = search.get(key);
    if (value) shared.set(key, value);
  }
  if (![...shared.keys()].length) return;

  const data: SharedData = {
    url: shared.get('url'),
    title: shared.get('title'),
    text: shared.get('text'),
    link: extractUrl(shared.get('url')) ?? extractUrl(shared.get('text')) ?? extractUrl(shared.get('title')),
  };
  const target =
    modules.find((m) => m.shareTarget?.accepts?.(data)) ?? modules.find((m) => m.shareTarget && !m.shareTarget.accepts);
  const path = target ? `/${target.path}${target.shareTarget!.path ? `/${target.shareTarget!.path}` : ''}` : '/';
  window.history.replaceState(null, '', `${window.location.pathname}#${path}?${shared.toString()}`);
}
