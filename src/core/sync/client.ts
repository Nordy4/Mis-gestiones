import { createClient } from '@supabase/supabase-js';

/**
 * Proyecto de Supabase. La clave "publishable" es pública por diseño (va dentro de la app):
 * lo que protege los datos es la seguridad por filas de `supabase/schema.sql`.
 * NUNCA pongas aquí la clave secret / service_role.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://qakodusxnrwkersrvgxt.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_eNbdt5qbAQmCVTX97ctDxg_U6aGqcRj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const SYNC_TABLE = 'sync_records';
