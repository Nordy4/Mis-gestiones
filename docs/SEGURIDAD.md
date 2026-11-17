# Informe de seguridad — Mi Vida

Fecha: 17 nov 2026 · Alcance: app (PWA en GitHub Pages), Supabase (Auth, base de datos, Edge
Functions), repositorio y despliegue.

**Cómo está montada:** web estática (sin servidor propio) + Supabase. La app guarda primero en el
móvil (IndexedDB) y sincroniza con la tabla `sync_records`, protegida por usuario (RLS). Solo hay
una cuenta (la tuya) y el registro público está cerrado.

## Resumen

| Punto | Estado | Qué había / qué se ha hecho |
|---|---|---|
| Autenticación | ✅ Bien | Supabase Auth con correo + contraseña, registro público cerrado, sin usuarios anónimos. |
| Claves API fuera del navegador | ✅ Bien | En la app solo va la clave *publishable* (pública por diseño). Ninguna clave secreta en el código ni en el historial de Git. |
| HTTPS | ✅ Bien | GitHub Pages fuerza HTTPS (http → 301 → https) y envía HSTS. Añadido `upgrade-insecure-requests`. |
| Contraseñas con hash | ✅ Bien | Las guarda Supabase con bcrypt; la app nunca las almacena. |
| Validación en servidor | 🔧 Arreglado | La nube aceptaba cualquier forma/tamaño de dato de tu propia sesión. Añadidas restricciones en la base de datos y límites en las funciones. |
| XSS | 🔧 Arreglado | Un enlace `javascript:` guardado en Compras (p. ej. desde una copia manipulada) se ejecutaba al tocarlo. Ahora solo se aceptan enlaces http(s) y hay CSP. |
| CSRF | ✅ No aplica | No hay cookies de sesión: el token va en una cabecera, que otra web no puede enviar por ti. |
| CORS | 🔧 Arreglado | `link-preview` respondía a cualquier web (`*`). Ahora solo a la app. |
| Cabeceras | 🔧 Arreglado | No había ninguna. CSP + `no-referrer` en la app, bloqueo de iframes (clickjacking) y cabeceras completas para Vercel. |
| Cookies | ✅ No aplica | La app no usa cookies. La sesión va en el almacenamiento del navegador, protegido por la CSP. |
| Límite de peticiones | ⚠️ Parcial | Supabase limita los intentos de inicio de sesión. Las funciones tienen límites de tamaño y tiempo. El calendario es público pero con un token imposible de adivinar. |
| Archivos | 🔧 Arreglado | Importar copia: límite de 20 MB (se valida antes de borrar nada, como ya hacía). No se suben archivos a ningún servidor. |
| Pagos en servidor | ✅ No aplica | La app no cobra ni procesa pagos. |
| Dependencias | ⚠️ Aceptado | 0 vulnerabilidades en lo que llega al navegador. 13 avisos solo en herramientas de compilación (ver abajo). |
| Secretos en Git | ✅ Bien | Revisado todo el historial: sin claves secretas, tokens ni `.env`. |

Además se encontraron y arreglaron tres problemas que no estaban en la lista:

- **SSRF en `link-preview`:** comprobaba solo la URL final; una web podía redirigir a una dirección
  interna. Ahora se valida cada redirección (máx. 5), y se bloquean IPs, puertos raros y dominios internos.
- **Inyección en el calendario (.ics):** un nombre con saltos de línea `\r` podía colar eventos
  falsos en tu Google Calendar. Ahora se eliminan los caracteres de control.
- **Fuga de errores internos** en `link-preview`: devolvía el mensaje técnico del fallo. Ahora no.

## Detalle de los arreglos

**App (se publica al subir a GitHub)**
- `vite.config.ts`: Content-Security-Policy en el HTML del build (solo scripts propios; conexiones
  solo a la app y a Supabase; sin plugins ni iframes) y `referrer: no-referrer`.
- `src/main.tsx`: la app se niega a funcionar dentro de un iframe de otra web (anti-clickjacking;
  GitHub Pages no permite la cabecera `frame-ancestors`).
- `core/lib/links.ts` → `safeHttpUrl`: todo `href`/`src` con datos pasa por aquí. Aplicado en
  Compras (lista y formulario), al guardar (`dexieRepository`) y al importar copias (`backup`).
- `core/db/backup.ts`: límite de tamaño al importar.
- `vercel.json`: CSP con `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `COOP` (por si algún día se publica en Vercel).
- `.github/workflows/deploy-pages.yml`: acciones fijadas por SHA (no por etiqueta), permisos
  mínimos por trabajo, `persist-credentials: false` y `npm audit` de producción antes de publicar.

**Supabase (ya aplicado en el proyecto)**
- `supabase/schema.sql`: restricciones en `sync_records` (nombre de tabla y id con formato válido,
  dato = objeto JSON ≤ 64 KB), formato de token en `calendar_feeds` y en `gastos_feed_items`,
  y sin permisos de ejecución sobre la función interna del trigger.
- `link-preview`: CORS solo para la app, anti-SSRF por salto, límites de tamaño, solo HTML,
  errores genéricos.
- `calendar-feed`: escape seguro del .ics, UID saneado, importes acotados, solo GET, cabeceras
  `nosniff` y `no-referrer`, máximo 500 eventos.

## Pruebas realizadas

| Prueba | Resultado |
|---|---|
| Leer `sync_records` sin sesión | ✅ Denegado (401) |
| Escribir en `sync_records` sin sesión (con user_id ajeno) | ✅ Denegado (401) |
| Leer `calendar_feeds` (tokens) sin sesión | ✅ Denegado (401) |
| Inyección SQL en el token del calendario (`' or '1'='1' --`) | ✅ Devuelve `[]` |
| Llamar a la función interna del trigger | ✅ No expuesta (404) |
| Registro público / usuarios anónimos | ✅ Desactivados |
| `calendar-feed` con token inválido (`../../etc`) o sin token | ✅ 404 |
| `link-preview` sin sesión (intento a `169.254.169.254`) | ✅ 401 |
| http://…github.io → https | ✅ 301 a https; HSTS presente |
| CSP: script inyectado en la página | ✅ Bloqueado, no se ejecuta |
| CSP: conexión a otro dominio (`example.com`) | ✅ Bloqueada; Supabase sí permitido |
| CSP no rompe la app (inicio, Gym con gráfica, Trabajo, Deudas, Gastos, Ajustes) | ✅ Sin errores |
| XSS: producto con enlace e imagen `javascript:` | ✅ Se muestra «Enlace no válido», sin enlace ni imagen |
| Abrir la app dentro de un iframe de otra web | ✅ Muestra el aviso y no carga |
| Escape del .ics con `Spotify\r\nEND:VEVENT…` | ✅ Queda en una sola línea, sin evento falso |
| Secretos en todo el historial de Git | ✅ Ninguno |
| `npm audit --omit=dev` | ✅ 0 vulnerabilidades |
| CORS de `link-preview` desde `evil.example` | ✅ Sin `Access-Control-Allow-Origin` (bloqueado); desde la app sí |
| Restricciones de `sync_records`: tabla con `; drop table`, id de 200 caracteres, dato que no es objeto, dato de 200 KB | ✅ Las 4 rechazadas por la base de datos |
| Token del calendario con formato inválido | ✅ Rechazado |
| `calendar-feed` por POST | ✅ 405 |
| `calendar-feed` con tu enlace real | ✅ 200, tus 3 gastos con su repetición |
| Función SQL del calendario llamada directamente desde la API pública (incluso con el token real) | ✅ Denegado (401): solo la usa la Edge Function |
| Security Advisor de Supabase | ✅ Limpio salvo «leaked password protection» (ver pendiente) |

Todo lo de Supabase (SQL y las dos Edge Functions) lo aplicó Claude directamente con el conector
de Supabase; las 53 filas existentes cumplían las nuevas restricciones antes de aplicarlas.

Mejora extra tras el Security Advisor: `gastos_feed_items` ya no es pública. Solo la puede
ejecutar `service_role`, y `calendar-feed` usa esa clave desde las variables de entorno que
Supabase le inyecta (no está en el código ni en Git).

## Pendiente (lo tienes que hacer tú en el panel de Supabase / GitHub)

1. **Authentication → Providers → Email → Password requirements:** longitud mínima 12 y exigir
   letras, números y símbolos. Usa una contraseña larga y única (gestor de contraseñas).
2. **Authentication → Attack Protection → Leaked password protection:** activarlo si tu plan lo
   permite (comprueba las contraseñas contra filtraciones conocidas).
3. **Authentication → Rate Limits:** revisar que el límite de inicios de sesión esté activo (por defecto lo está).
4. *(Recomendado)* **GitHub → Settings → Security → Dependabot alerts:** activarlo para recibir avisos.

## Riesgos aceptados

- **Avisos de dependencias de compilación** (picomatch ReDoS y derivados en Vite/Workbox): no hay
  versión corregida y solo se usan al compilar con patrones nuestros; no llegan al navegador.
- **`style-src 'unsafe-inline'`** en la CSP: necesario para los estilos en línea de React/Recharts.
  No permite ejecutar código.
- **Sesión en el almacenamiento del navegador** (estándar de Supabase): un XSS podría leerla; por
  eso la CSP bloquea scripts ajenos y en línea.
- **El enlace del calendario es público por diseño** (Google no inicia sesión). Solo da acceso a los
  gastos fijos; si se filtra, «Crear un enlace nuevo» lo invalida.
- **Las fotos de Compras se cargan desde las tiendas**, que pueden ver tu IP (sin referer).
- **Sin cabeceras HTTP propias en GitHub Pages** (no lo permite): cubierto con `<meta>` y el bloqueo de iframes.
