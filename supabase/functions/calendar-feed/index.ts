// Mi Vida · Edge Function "calendar-feed" (Supabase).
// Devuelve los Gastos fijos como calendario iCalendar (.ics) para suscribirse desde Google Calendar:
//   https://<proyecto>.supabase.co/functions/v1/calendar-feed?token=<token privado>
// El token lo genera la app (Gastos fijos → Google Calendar). Google no envía sesión, así que
// esta función va SIN verificación JWT; la protección es el token (aleatorio, 48 caracteres).
//
// Despliegue: Supabase → Edge Functions → Deploy a new function → Via Editor, nombre
// "calendar-feed", pega este archivo y despliega. Después, en sus ajustes (Details), desactiva
// "Enforce JWT verification" / "Verify JWT" y guarda.

// Clave publishable: pública por diseño (la misma que va en la app).
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://qakodusxnrwkersrvgxt.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_eNbdt5qbAQmCVTX97ctDxg_U6aGqcRj';

interface Expense {
  id: string;
  name: string;
  amountCents: number;
  period: 'monthly' | 'yearly';
  startDate: string; // YYYY-MM-DD, primer cargo
  note?: string;
  archivedAt?: string | null;
  updatedAt?: string;
}

const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/**
 * Escapa texto para iCalendar. Quita los caracteres de control (incluido \r) para que un nombre
 * manipulado no pueda inyectar líneas/eventos en el .ics; los \n se convierten en "\n" literal.
 */
const esc = (s: unknown, max = 300) =>
  String(s ?? '')
    .slice(0, max)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

/** Solo caracteres seguros en el UID (los ids de la app son UUID). */
const safeId = (s: unknown) => String(s ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || 'x';

/** Pliega líneas largas (máx. 75 octetos por línea, continuación con espacio). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
}

const compactDate = (d: string) => d.replaceAll('-', '');

function nextDay(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day + 1));
  return dt.toISOString().slice(0, 10);
}

function stamp(iso: string | undefined): string {
  const parsed = iso ? new Date(iso) : new Date();
  const d = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function rrule(e: Expense): string {
  if (e.period === 'yearly') return 'RRULE:FREQ=YEARLY';
  const day = Number(e.startDate.slice(8, 10));
  // Días 29-31: en los meses que no los tienen, el cargo cae el último día del mes.
  return day <= 28 ? `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}` : `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day},-1;BYSETPOS=1`;
}

function toIcs(expenses: Expense[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mi Vida//Gastos fijos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Gastos fijos',
    'X-WR-TIMEZONE:Europe/Madrid',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ];
  for (const e of expenses) {
    if (e.archivedAt || !/^\d{4}-\d{2}-\d{2}$/.test(e.startDate ?? '')) continue;
    const cents = Number.isFinite(e.amountCents) ? Math.max(0, Math.min(e.amountCents, 1e10)) : 0;
    const amount = euro.format(cents / 100);
    const periodLabel = e.period === 'yearly' ? 'Anual' : 'Mensual';
    const description = [`${periodLabel} · ${amount}`, e.note].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${safeId(e.id)}@mi-vida`,
      `DTSTAMP:${stamp(e.updatedAt)}`,
      `LAST-MODIFIED:${stamp(e.updatedAt)}`,
      `DTSTART;VALUE=DATE:${compactDate(e.startDate)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(e.startDate))}`,
      rrule(e),
      `SUMMARY:${esc(`${String(e.name ?? '').slice(0, 100)} · ${amount}`)}`,
      `DESCRIPTION:${esc(description, 500)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

const TEXT_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Método no permitido', { status: 405, headers: TEXT_HEADERS });
  }
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[0-9a-f]{32,128}$/.test(token)) return new Response('Enlace no válido', { status: 404, headers: TEXT_HEADERS });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/gastos_feed_items`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return new Response('No se pudo leer el calendario', { status: 502, headers: TEXT_HEADERS });
  const items = await res.json();
  if (!Array.isArray(items)) return new Response('No se pudo leer el calendario', { status: 502, headers: TEXT_HEADERS });

  return new Response(toIcs((items as Expense[]).slice(0, 500)), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="gastos-fijos.ics"',
      'Cache-Control': 'private, no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
});
