import { modules } from '@/modules/registry';

/**
 * Web Share Target: al compartir un enlace con la app instalada, Android abre
 * `index.html?title=…&text=…&url=…` (ver `share_target` en vite.config.ts).
 * Antes de montar el router, pasamos esos datos a la ruta del módulo que los recibe
 * (`shareTarget`) y quitamos la query de la URL.
 */
export function consumeShareTarget(): void {
  const search = new URLSearchParams(window.location.search);
  const shared = new URLSearchParams();
  for (const key of ['url', 'title', 'text']) {
    const value = search.get(key);
    if (value) shared.set(key, value);
  }
  if (![...shared.keys()].length) return;

  const target = modules.find((m) => m.shareTarget !== undefined);
  const path = target ? `/${target.path}${target.shareTarget ? `/${target.shareTarget}` : ''}` : '/';
  window.history.replaceState(null, '', `${window.location.pathname}#${path}?${shared.toString()}`);
}
