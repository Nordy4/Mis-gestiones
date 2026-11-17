import { supabase } from '@/core/sync/client';

/**
 * Enlace privado del calendario de Gastos fijos (Edge Function `calendar-feed`).
 * El token se guarda en la tabla `calendar_feeds` de Supabase (uno por usuario).
 */
const FUNCTION_URL = 'https://qakodusxnrwkersrvgxt.supabase.co/functions/v1/calendar-feed';

const feedUrl = (token: string) => `${FUNCTION_URL}?token=${token}`;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type FeedState = { status: 'signed-out' } | { status: 'ok'; url: string };

/** Devuelve el enlace (lo crea la primera vez). Requiere sesión iniciada. */
export async function getCalendarFeed(): Promise<FeedState> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return { status: 'signed-out' };
  const { data, error } = await supabase.from('calendar_feeds').select('token').maybeSingle();
  if (error) throw error;
  if (data?.token) return { status: 'ok', url: feedUrl(data.token) };
  return regenerateCalendarFeed();
}

/** Crea un enlace nuevo; el anterior deja de funcionar. */
export async function regenerateCalendarFeed(): Promise<FeedState> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return { status: 'signed-out' };
  const token = randomToken();
  const { error } = await supabase
    .from('calendar_feeds')
    .upsert({ user_id: auth.session.user.id, token }, { onConflict: 'user_id' });
  if (error) throw error;
  return { status: 'ok', url: feedUrl(token) };
}
