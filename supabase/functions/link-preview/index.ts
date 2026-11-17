// Mi Vida · Edge Function "link-preview" (Supabase).
// Recibe { url } y devuelve { title, image, site } leyendo las etiquetas Open Graph de la página.
// Solo la pueden llamar usuarios con sesión (verificación JWT activada, la opción por defecto).
//
// Despliegue sin instalar nada: Supabase → Edge Functions → Deploy a new function → Via Editor,
// nombre "link-preview", pega este archivo entero y pulsa Deploy.
//
// Seguridad:
// - CORS solo para los orígenes de la app (no "*").
// - Anti-SSRF: solo http(s) públicos; se comprueba CADA redirección (máx. 5), no solo la final;
//   fuera localhost, IPs literales, puertos raros y dominios internos.
// - Límites: cuerpo de la petición ≤ 4 KB, URL ≤ 2048, respuesta leída ≤ 1,5 MB, 8 s, solo HTML.
// - Los errores no devuelven detalles internos.

const ALLOWED_ORIGINS = new Set([
  'https://nordy4.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]);

const MAX_BYTES = 1_500_000;
const MAX_REQUEST_BYTES = 4096;
const MAX_URL_LENGTH = 2048;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;

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

/** Solo páginas públicas http(s) en puertos web: nada de localhost, IPs ni dominios internos. */
function isAllowed(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== '80' && u.port !== '443') return false;
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!h.includes('.')) return false; // nombres sin dominio (intranet)
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|arpa)$/.test(h)) return false;
  if (/^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return false; // IPs literales (v4/v6)
  if (/^0x[0-9a-f]+$/i.test(h) || /^\d+$/.test(h)) return false; // IPs en hexadecimal/decimal
  return true;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valor de <meta property|name="key" content="..."> (en cualquier orden de atributos). */
function meta(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]{0,2000}>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content) return decodeEntities(content);
  }
  return null;
}

/** Descarga siguiendo redirecciones a mano para validar cada salto. */
async function safeFetch(start: URL): Promise<{ res: Response; url: URL }> {
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (!isAllowed(url)) throw new Error('blocked');
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });
    const location = res.headers.get('Location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => {});
      url = new URL(location, url);
      continue;
    }
    return { res, url };
  }
  throw new Error('too-many-redirects');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método no permitido' }, 405);

  let target: URL;
  try {
    const raw = await req.text();
    if (raw.length > MAX_REQUEST_BYTES) return json(req, { error: 'Petición demasiado grande' }, 413);
    const { url } = JSON.parse(raw);
    if (typeof url !== 'string' || url.length > MAX_URL_LENGTH) throw new Error('bad');
    target = new URL(url);
  } catch {
    return json(req, { error: 'URL no válida' }, 400);
  }
  if (!isAllowed(target)) return json(req, { error: 'URL no permitida' }, 400);

  try {
    const { res, url: finalUrl } = await safeFetch(target);
    const type = res.headers.get('Content-Type') ?? '';
    if (!/text\/html|application\/xhtml/i.test(type)) {
      await res.body?.cancel().catch(() => {});
      return json(req, { title: null, image: null, site: finalUrl.hostname.replace(/^www\./, ''), url: finalUrl.href });
    }

    // Lee como mucho MAX_BYTES (las etiquetas Open Graph están en el <head>).
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    const decoder = new TextDecoder();
    while (reader && size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
      if (decoder.decode(value).includes('</head>')) break;
    }
    await reader?.cancel().catch(() => {});
    const all = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      all.set(c.subarray(0, Math.min(c.length, size - offset)), offset);
      offset += c.length;
    }
    const html = decoder.decode(all);

    const titleTag = html.match(/<title[^>]*>([^<]{0,1000})<\/title>/i)?.[1];
    const rawTitle =
      meta(html, 'og:title') ?? meta(html, 'twitter:title') ?? (titleTag ? decodeEntities(titleTag) : null);
    let image = meta(html, 'og:image:secure_url') ?? meta(html, 'og:image') ?? meta(html, 'twitter:image');
    if (image) {
      try {
        const u = new URL(image, finalUrl);
        image = (u.protocol === 'https:' || u.protocol === 'http:') && u.href.length <= MAX_URL_LENGTH ? u.href : null;
      } catch {
        image = null;
      }
    }
    const site = (meta(html, 'og:site_name') ?? finalUrl.hostname.replace(/^www\./, '')).slice(0, 100);

    return json(req, { title: rawTitle?.slice(0, 300) || null, image, site, url: finalUrl.href });
  } catch {
    return json(req, { error: 'No se pudo leer la página' }, 502);
  }
});
