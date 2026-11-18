// Mi Vida · Edge Function "route-ai" (Supabase).
// Genera una ruta en moto con IA: recibe { start, end?, minutes, notes? } y devuelve las paradas
// y un enlace de Google Maps que pasa por ellas. Solo con sesión (verificación JWT activada).
//
// 1. Geocodifica inicio y final con OpenRouteService (ORS).
// 2. Gemini (con búsqueda de Google) propone paradas por carreteras secundarias asfaltadas y con
//    curvas, evitando autopistas y autovías.
// 3. Cada parada se sitúa con el geocodificador de ORS (o las coordenadas de Gemini si no cuadra).
// 4. ORS calcula la ruta real evitando autopistas: duración y distancia. Si se aleja más de un
//    20 % de lo pedido, Gemini corrige las paradas una vez más.
//
// Secretos (Supabase → Edge Functions → Secrets): GEMINI_API_KEY, ORS_API_KEY y, opcional,
// GEMINI_MODEL (por defecto "gemini-flash-latest").
//
// Seguridad: CORS solo para la app, cuerpo ≤ 4 KB, textos acotados, salida de la IA validada
// (coordenadas, número de paradas, distancias) y errores genéricos.

const ALLOWED_ORIGINS = new Set([
  'https://nordy4.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]);

const MAX_REQUEST_BYTES = 4096;
const MAX_WAYPOINTS = 8; // Google Maps admite 9 paradas intermedias en un enlace
const TIME_BUDGET_MS = 110_000; // margen bajo el límite de la Edge Function
const ORS = 'https://api.openrouteservice.org';

interface Point {
  lat: number;
  lng: number;
}
interface Place extends Point {
  label: string;
}
interface AiWaypoint {
  name: string;
  query: string;
  road: string;
  lat?: number;
  lng?: number;
}
interface AiPlan {
  name: string;
  summary: string;
  waypoints: AiWaypoint[];
}
interface Stop extends Point {
  name: string;
  road: string;
}

class UserError extends Error {}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Texto limpio y acotado (sin caracteres de control). */
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function validPoint(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Distancia en km entre dos puntos (haversine). */
function km(a: Point, b: Point): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// ───────────── OpenRouteService ─────────────

async function geocode(key: string, text: string, focus?: Point): Promise<Place | null> {
  const params = new URLSearchParams({ text, size: '1' });
  if (focus) {
    params.set('focus.point.lat', String(focus.lat));
    params.set('focus.point.lon', String(focus.lng));
  }
  const res = await fetch(`${ORS}/geocode/search?${params}`, {
    headers: { Authorization: key, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const f = data?.features?.[0];
  const [lng, lat] = f?.geometry?.coordinates ?? [];
  if (!validPoint(lat, lng)) return null;
  return { lat, lng, label: clean(f?.properties?.label, 120) || text };
}

/** Duración (min) y distancia (km) en coche evitando autopistas. */
async function directions(key: string, points: Point[]): Promise<{ minutes: number; km: number } | null> {
  const call = async (avoid: boolean) => {
    const res = await fetch(`${ORS}/v2/directions/driving-car`, {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        coordinates: points.map((p) => [p.lng, p.lat]),
        ...(avoid ? { options: { avoid_features: ['highways'] } } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const s = (await res.json())?.routes?.[0]?.summary;
    if (typeof s?.duration !== 'number' || typeof s?.distance !== 'number') return null;
    return { minutes: Math.round(s.duration / 60), km: Math.round(s.distance / 100) / 10 };
  };
  // Si ORS no puede evitar autopistas en algún tramo, calcula sin esa opción.
  return (await call(true)) ?? (await call(false));
}

// ───────────── Gemini ─────────────

const SYSTEM = `Eres un experto en rutas en moto (sobre todo en España, Andorra, Francia y Portugal).
Diseñas rutas para disfrutar conduciendo: carreteras secundarias, comarcales y puertos de montaña
ASFALTADOS y con muchas curvas, con buen firme y paisaje. Evitas autopistas y autovías (AP-, A-, E-,
C-xx desdobladas, rondas y circunvalaciones) salvo un tramo muy corto si es imprescindible. Nunca
pistas de tierra ni caminos sin asfaltar. Evitas atravesar ciudades grandes.

Devuelves las paradas intermedias (waypoints) en orden, que obliguen al navegador a ir por esas
carreteras: pueblos, cruces o puertos situados SOBRE la carretera elegida. Pon más paradas donde haya
varias opciones de carretera para que el GPS no se salga de la ruta. Usa la búsqueda para comprobar
nombres y carreteras reales. Calcula a ritmo de moto tranquilo por secundarias (unos 50-60 km/h de media).

Responde SOLO con un objeto JSON, sin texto antes ni después, con esta forma:
{"name": "nombre corto y evocador de la ruta",
 "summary": "2-3 frases: por dónde va y qué tiene de bonito",
 "waypoints": [{"name": "Coll de Te", "query": "Coll de Te, Girona, España", "road": "GI-543",
   "lat": 42.123, "lng": 2.456}]}
"query" es el texto para un buscador de direcciones (lugar, provincia, país). "road" es la carretera
que se usa para LLEGAR a esa parada. Entre 3 y ${MAX_WAYPOINTS} paradas.`;

type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

async function gemini(key: string, model: string, contents: GeminiContent[], timeoutMs: number): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (res.status === 429) throw new UserError('La IA ha llegado a su límite de uso. Prueba en un rato.');
  if (!res.ok) {
    console.error('gemini', res.status, (await res.text()).slice(0, 500));
    throw new Error('gemini');
  }
  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');
}

/** Extrae y valida el JSON de la respuesta de la IA. */
function parsePlan(text: string): AiPlan {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no-json');
  const raw = JSON.parse(text.slice(start, end + 1));
  const waypoints: AiWaypoint[] = (Array.isArray(raw?.waypoints) ? raw.waypoints : [])
    .map((w: Record<string, unknown>) => ({
      name: clean(w?.name, 80),
      query: clean(w?.query, 160) || clean(w?.name, 80),
      road: clean(w?.road, 40),
      ...(validPoint(w?.lat, w?.lng) ? { lat: w.lat as number, lng: w.lng as number } : {}),
    }))
    .filter((w: AiWaypoint) => w.name && w.query)
    .slice(0, MAX_WAYPOINTS);
  if (waypoints.length === 0) throw new Error('no-waypoints');
  return { name: clean(raw?.name, 80) || 'Ruta en moto', summary: clean(raw?.summary, 600), waypoints };
}

/** Sitúa cada parada: geocodificador si cuadra con lo que dijo la IA; si no, sus coordenadas. */
async function locate(orsKey: string, plan: AiPlan, origin: Point): Promise<Stop[]> {
  const stops = await Promise.all(
    plan.waypoints.map(async (w): Promise<Stop | null> => {
      const ai = w.lat !== undefined && w.lng !== undefined ? { lat: w.lat, lng: w.lng } : null;
      const geo = await geocode(orsKey, w.query, ai ?? origin).catch(() => null);
      let p: Point | null = null;
      if (geo && (!ai || km(geo, ai) <= 15)) p = geo;
      else if (ai) p = ai;
      else if (geo) p = geo;
      if (!p || km(p, origin) > 500) return null; // descarta paradas absurdas
      return { name: w.name, road: w.road, lat: p.lat, lng: p.lng };
    }),
  );
  return stops.filter((s): s is Stop => s !== null);
}

const fmt = (n: number) => n.toFixed(5);

function mapsUrl(start: Place, end: Place, stops: Stop[]): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${fmt(start.lat)},${fmt(start.lng)}`,
    destination: `${fmt(end.lat)},${fmt(end.lng)}`,
    travelmode: 'driving',
  });
  if (stops.length) params.set('waypoints', stops.map((s) => `${fmt(s.lat)},${fmt(s.lng)}`).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

const hm = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método no permitido' }, 405);
  const began = Date.now();

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const orsKey = Deno.env.get('ORS_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';
  if (!geminiKey || !orsKey) return json(req, { error: 'Falta configurar las claves de la IA en Supabase.' }, 503);

  let startText: string, endText: string, minutes: number, notes: string;
  try {
    const raw = await req.text();
    if (raw.length > MAX_REQUEST_BYTES) return json(req, { error: 'Petición demasiado grande' }, 413);
    const body = JSON.parse(raw);
    startText = clean(body?.start, 200);
    endText = clean(body?.end, 200);
    notes = clean(body?.notes, 300);
    minutes = Math.round(Number(body?.minutes));
    if (!startText || !Number.isFinite(minutes) || minutes < 30 || minutes > 720) throw new Error('bad');
  } catch {
    return json(req, { error: 'Datos no válidos' }, 400);
  }

  try {
    const start = await geocode(orsKey, startText);
    if (!start) throw new UserError('No encuentro la dirección de inicio.');
    const circular = !endText;
    const end = circular ? start : await geocode(orsKey, endText, start);
    if (!end) throw new UserError('No encuentro la dirección final.');

    const ask =
      `Diseña una ruta en moto ${circular ? 'CIRCULAR (vuelve al punto de salida)' : 'de ida'}.\n` +
      `Salida: ${startText} (${start.label}; ${fmt(start.lat)}, ${fmt(start.lng)}).\n` +
      (circular ? '' : `Llegada: ${endText} (${end.label}; ${fmt(end.lat)}, ${fmt(end.lng)}).\n`) +
      `Duración deseada en marcha (sin paradas): ${hm(minutes)}.\n` +
      (notes ? `Preferencias del motorista: ${notes}\n` : '');

    const contents: GeminiContent[] = [{ role: 'user', parts: [{ text: ask }] }];
    let best: { plan: AiPlan; stops: Stop[]; route: { minutes: number; km: number } | null } | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const left = TIME_BUDGET_MS - (Date.now() - began);
      if (left < 25_000) break;
      const text = await gemini(geminiKey, model, contents, Math.min(70_000, left - 15_000));
      let plan: AiPlan;
      try {
        plan = parsePlan(text);
      } catch {
        if (best) break;
        throw new Error('bad-plan');
      }
      const stops = await locate(orsKey, plan, start);
      if (stops.length === 0) {
        if (best) break;
        throw new UserError('La IA no ha dado paradas válidas. Prueba otra vez.');
      }
      const route = await directions(orsKey, [start, ...stops, end]).catch(() => null);
      const off = (r: typeof route) => (r ? Math.abs(r.minutes - minutes) / minutes : Infinity);
      if (!best || off(route) < off(best.route)) best = { plan, stops, route };
      if (!route || off(route) <= 0.2) break;

      // Corrige: le decimos a la IA la duración real calculada.
      contents.push({ role: 'model', parts: [{ text }] });
      contents.push({
        role: 'user',
        parts: [
          {
            text:
              `Calculada la ruta real evitando autopistas, sale ${hm(route.minutes)} (${route.km} km) y ` +
              `quiero unas ${hm(minutes)}. ${route.minutes > minutes ? 'Acórtala' : 'Alárgala'} manteniendo ` +
              `carreteras con curvas. Devuelve el JSON completo otra vez.`,
          },
        ],
      });
    }

    if (!best) throw new Error('no-plan');
    return json(req, {
      name: best.plan.name,
      summary: best.plan.summary,
      start: start.label,
      end: circular ? null : end.label,
      targetMinutes: minutes,
      minutes: best.route?.minutes ?? null,
      km: best.route?.km ?? null,
      stops: best.stops.map((s) => ({ name: s.name, road: s.road })),
      url: mapsUrl(start, end, best.stops),
    });
  } catch (err) {
    if (err instanceof UserError) return json(req, { error: err.message }, 422);
    console.error('route-ai', err instanceof Error ? err.message : err);
    return json(req, { error: 'No se ha podido generar la ruta. Prueba otra vez.' }, 502);
  }
});
