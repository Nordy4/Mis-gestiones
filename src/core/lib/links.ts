import { supabase } from '@/core/sync/client';

/** Datos de una página leídos por la Edge Function `link-preview` (supabase/functions). */
export interface LinkPreview {
  title: string | null;
  image: string | null;
  site: string;
  url: string;
}

/** Primer enlace http(s) dentro de un texto ("Mira esto https://amzn.eu/d/abc" → la URL). */
export function extractUrl(text: string | null | undefined): string | null {
  const match = text?.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0].replace(/[),.;!?]+$/, '') : null;
}

/** ¿Es una URL http(s) válida? */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * La URL solo si es http(s); si no, null. Usar SIEMPRE antes de poner datos en `href` o `src`:
 * un `javascript:` guardado (copia importada, sincronización…) sería un XSS al tocar el enlace.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null;
  return isHttpUrl(value.trim()) ? value.trim() : null;
}

/**
 * ¿Es un enlace de Google Maps? (lo que da "Compartir" en la app de Maps: maps.app.goo.gl/…,
 * goo.gl/maps/…, google.es/maps/…, maps.google.com/…).
 */
export function isGoogleMapsUrl(value: string | null | undefined): boolean {
  const url = safeHttpUrl(value);
  if (!url) return false;
  const u = new URL(url);
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'maps.app.goo.gl') return true;
  if (host === 'goo.gl' && u.pathname.startsWith('/maps')) return true;
  if (/^maps\.google\.[a-z.]+$/.test(host)) return true;
  return /^google\.[a-z.]+$/.test(host) && u.pathname.startsWith('/maps');
}

/** "https://www.zara.com/es/..." → "zara.com" */
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Nombre, imagen y tienda de una página. Necesita sesión iniciada (la función está en el
 * Supabase del usuario); sin sesión, sin conexión o si la tienda no deja leerla, devuelve null.
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  if (!isHttpUrl(url) || !navigator.onLine) return null;
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return null;
    const { data, error } = await supabase.functions.invoke<LinkPreview & { error?: string }>('link-preview', {
      body: { url },
    });
    if (error || !data || data.error) return null;
    return data;
  } catch {
    return null;
  }
}
