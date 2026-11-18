import { supabase } from '@/core/sync/client';
import { safeHttpUrl } from '@/core/lib/links';
import type { AiRoute, AiRouteRequest } from './types';

export type AiRouteResult =
  | { status: 'ok'; route: AiRoute }
  | { status: 'signed-out' }
  | { status: 'error'; message: string };

/**
 * Pide una ruta a la Edge Function `route-ai` (Gemini + OpenRouteService, en el Supabase del
 * usuario). Necesita sesión iniciada y conexión. Puede tardar hasta un par de minutos.
 */
export async function generateAiRoute(input: AiRouteRequest): Promise<AiRouteResult> {
  if (!navigator.onLine) return { status: 'error', message: 'Sin conexión.' };
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return { status: 'signed-out' };

  const { data, error } = await supabase.functions.invoke<AiRoute & { error?: string }>('route-ai', { body: input });
  if (error) {
    // Los errores de la función traen { error: "mensaje para el usuario" }.
    let message = 'No se ha podido generar la ruta. Prueba otra vez.';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      /* sin cuerpo legible */
    }
    return { status: 'error', message };
  }
  const url = safeHttpUrl(data?.url);
  if (!data || data.error || !url) return { status: 'error', message: data?.error ?? 'Respuesta no válida.' };
  return { status: 'ok', route: { ...data, url } };
}
