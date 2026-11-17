// Mi Vida · Edge Function "link-preview" (Supabase).
// Recibe { url } y devuelve { title, image, site } leyendo las etiquetas Open Graph de la página.
// Solo la pueden llamar usuarios con sesión (verificación JWT activada, la opción por defecto).
//
// Despliegue sin instalar nada: Supabase → Edge Functions → Deploy a new function → Via Editor,
// nombre "link-preview", pega este archivo entero y pulsa Deploy.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** Solo páginas públicas http(s): nada de localhost ni IPs privadas. */
function isAllowed(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':')) return false; // IPs literales (v4/v6)
  return true;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valor de <meta property|name="key" content="..."> (en cualquier orden de atributos). */
function meta(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content) return decodeEntities(content);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  let target: URL;
  try {
    const { url } = await req.json();
    target = new URL(String(url));
  } catch {
    return json({ error: 'URL no válida' }, 400);
  }
  if (!isAllowed(target)) return json({ error: 'URL no permitida' }, 400);

  try {
    const res = await fetch(target, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });
    const finalUrl = new URL(res.url || target.href);
    if (!isAllowed(finalUrl)) return json({ error: 'URL no permitida' }, 400);

    // Lee como mucho MAX_BYTES (las etiquetas Open Graph están en el <head>).
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader && size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
      if (new TextDecoder().decode(value).includes('</head>')) break;
    }
    await reader?.cancel().catch(() => {});
    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const out = new Uint8Array(acc.length + c.length);
        out.set(acc);
        out.set(c, acc.length);
        return out;
      }, new Uint8Array()),
    );

    const rawTitle =
      meta(html, 'og:title') ??
      meta(html, 'twitter:title') ??
      (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ? decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)![1]) : null);
    let image = meta(html, 'og:image:secure_url') ?? meta(html, 'og:image') ?? meta(html, 'twitter:image');
    if (image) {
      try {
        image = new URL(image, finalUrl).href;
        if (!image.startsWith('https://') && !image.startsWith('http://')) image = null;
      } catch {
        image = null;
      }
    }
    const site = meta(html, 'og:site_name') ?? finalUrl.hostname.replace(/^www\./, '');

    return json({ title: rawTitle || null, image, site, url: finalUrl.href, status: res.status });
  } catch (err) {
    return json({ error: `No se pudo leer la página: ${err instanceof Error ? err.message : String(err)}` }, 502);
  }
});
