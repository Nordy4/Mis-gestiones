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
