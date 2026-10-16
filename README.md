# Rimini Caffè — web

Sitio estático trilingüe (ES · CA · EN). Sin framework, sin dependencias de npm: HTML generado por un script de Node, CSS y ~4 KB de JS.

**Por qué este stack:** la web es de lectura (home, carta, visita). No hay cuentas, carrito ni formularios. Un framework añadiría JS y mantenimiento sin aportar nada. El contenido está separado del código para poder cambiar la carta y los horarios sin tocar nada más.

## Comandos

```bash
node tools/build.mjs      # genera dist/
node tools/check.mjs      # QA automático (enlaces, imágenes, alt, h1, hreflang, JSON-LD, placeholders)
node tools/serve.mjs      # sirve dist/ en http://localhost:4173
```

Requiere Node 20+. Las imágenes se regeneran con `python3 tools/images.py` (necesita Pillow) desde los escaneos originales.

## Qué se edita y dónde

| Cambio | Archivo |
|---|---|
| Horarios, teléfono, WhatsApp, redes, festivos (`closedDates`: `"2026-12-25"`) | `content/site.json` |
| Carta: productos y precios (`price`: número, `null` = "consulta precio"), vegetariano (`"tags":["v"]`) | `content/menu.json` |
| Textos de la web (ES/CA/EN) | `content/i18n.json` |
| Eventos (la sección aparece sola) | `content/events.json` — `[{"date":{"es":"Vie 27 jun","ca":"Div 27 juny","en":"Fri 27 Jun"},"title":{...},"text":{...}}]` |
| Texto alternativo de fotos | `content/images.json` |
| Fotos nuevas | añadir en `tools/images.py`, ejecutarlo y usar el nombre en `build.mjs` |

Después: `node tools/build.mjs` y publicar `dist/`.

**Sobre un CMS.** Hoy no hace falta uno: son ~50 productos y 7 horarios. Pero editar JSON no es para el dueño del local. Recomendación para la siguiente iteración: **Decap CMS** (gratuito, edita estos mismos JSON desde una web y publica con Git) o **Pages CMS**. No lo añadí porque requiere decidir hosting y cuentas, y no quiero dejarte una dependencia a medias.

## Publicar

1. Subir esta carpeta a un repositorio Git.
2. **Cloudflare Pages** o **Netlify** (ambos con plan gratuito): comando de build `node tools/build.mjs`, carpeta de salida `dist`.
3. Conectar `riminicaffe.com` (confirmar primero quién lo gestiona y qué hay publicado). Activar HTTPS. Redirigir `www` a la raíz.
4. `dist/_headers` ya trae caché y cabeceras de seguridad (válido en Netlify y Cloudflare Pages).
5. Dar de alta `https://riminicaffe.com/sitemap.xml` en Google Search Console.
6. Google Business: web = `https://riminicaffe.com/` y mismo nombre/dirección/teléfono que en la web.
7. Analítica: rellenar `analytics.plausibleDomain` en `site.json` y volver a generar.

## Sistema de diseño (resumen)

Colores del brandbook: Green `#00291B`, Olive `#697452`, Velvet `#3B0014`, Off White `#EFEBE2`, Terra `#944131`, Brown `#3A2C1F` (+ `--surface #F6F3EC`, derivado). Espaciado 4·8·12·16·24·32·48·64·96·128. Radio 14 px (pill en botones). Contenedor 1200 px (1320 ≥ 1400). Breakpoints 640 / 900 / 1400. Tipografía fluida con `clamp()`. Sin sombras, sin degradados.
Contraste: Off White sobre Green 13,2:1 · sobre Terra 5,8:1 · sobre Velvet 14,8:1. **Off White sobre Olive 4,2:1: no usar para texto normal.** Terra sobre Green 2,3:1: no usar.

## Pendiente antes de publicar (no lo resuelve el código)

1. **Fuente de marca.** Mientras llega Neue Machina, la web usa **Space Grotesk** (licencia SIL OFL, alojada en `src/fonts/provisional/`, con su licencia). Es una solución provisional: el brandbook prohíbe sustituir la fuente. Para cambiarla, pedir a BLÃO Studio los `.woff2` Regular/Bold **con licencia web** → copiar a `src/fonts/NeueMachina-Regular.woff2` y `NeueMachina-Bold.woff2`. El build las detecta, deja de cargar Space Grotesk y se puede borrar `src/fonts/provisional/`.
2. **Verificar con el dueño:** teléfono, horarios, que el número tenga WhatsApp, ventana de take-away y que las reservas "recomendadas a mediodía" sean ciertas.
3. **Carta:** precios de Aperol spritz, vino, cerveza y tabla; descripciones y alérgenos; qué es "Porchetta"; qué pasó con "Rimini Beef" (aparece en fotos, no en la carta).
4. **Legal y cookies:** completar titular/NIF en `content/i18n.json`. El mapa de Google se carga directamente con la página (decisión del cliente), y esa incrustación puede instalar cookies de Google: un profesional debe decir si hace falta aviso/banner de cookies.
5. **Textos en catalán e inglés:** los escribí yo; necesitan revisión de un hablante nativo.
6. **Fotos que faltan:** aperitivo (spritz, tabla, vino), tiramisú, exterior con pizarra y ventana, eventos con gente. El panel de las 19:00 usa hoy una foto real de la barra (sin bebidas) hasta que haya una sesión de aperitivo: se cambia con `photo` en `content/i18n.json`.
7. **Geolocalización** (`geo` en `site.json`): añadir latitud/longitud verificadas para el marcado de negocio.
8. **Reseñas de Google (4,7 / 470+):** verificar antes de mostrar cualquier cifra.

## QR de reseñas (tarjetas de Google)

Las tarjetas impresas llevan un QR a `https://riminicaffe.com/r/a`, `/r/b` o `/r/c` (un modelo de tarjeta cada una). Esas páginas están en la web (`dist/r/…`), cuentan el escaneo y reenvían al instante a Google.

- **Permanente:** el QR impreso no cambia nunca. El destino se cambia en `content/site.json` → `reviewUrl` (enlace directo de reseñas; en Google Business Profile: "Pedir reseñas" → copiar enlace corto). Si está vacío, lleva a la ficha de Maps (nunca queda roto).
- **Medible:** cada escaneo dispara el evento `review_qr` con `card = a | b | c` (Plausible) y lo empuja al `dataLayer`. Para activarlo, rellenar `analytics.plausibleDomain`. Alternativa gratuita: Cloudflare Web Analytics (cuenta visitas a `/r/a`, `/r/b`, `/r/c`).
- **Qué mide y qué no:** mide escaneos por modelo de tarjeta. Google no informa qué reseña vino de qué QR; la conversión real se estima comparando las reseñas nuevas en Google Business Profile con los escaneos del mismo periodo.
- **Requisitos:** la web publicada en `riminicaffe.com`, dominio renovado y no indexación (ya configurada: `noindex`, `robots.txt`, cabecera).
- **Evitar:** servicios de "QR dinámico" de pago por suscripción: si dejas de pagar, el QR impreso deja de funcionar.

## Publicar en Vercel (y conectar el dominio)

El proyecto ya incluye `vercel.json` (build `node tools/build.mjs`, salida `dist`, URLs con barra final, cabeceras y caché). `dist/_headers` es de Netlify/Cloudflare y Vercel lo ignora.

1. Subir la carpeta `web/` a un repositorio de GitHub (el `.gitignore` ya excluye `dist/`).
2. Vercel → *Add New → Project* → importar el repositorio. Framework: *Other*. No cambiar nada más (lo toma de `vercel.json`).
3. Comprobar la URL de prueba `*.vercel.app`: `/`, `/es/`, `/ca/`, `/en/`, `/es/carta/`, `/r/a/`.
4. *Settings → Domains* → añadir `riminicaffe.com` y `www.riminicaffe.com`. Vercel muestra los registros DNS exactos; se crean en el proveedor del dominio. Poner `www` → redirigir a la raíz. HTTPS es automático.
5. Search Console: añadir la propiedad y enviar `https://riminicaffe.com/sitemap.xml`.

**Plan:** el plan gratuito *Hobby* de Vercel es para uso personal y no comercial. Una web de negocio debe ir en *Pro* o en un hosting que permita uso comercial gratis (Cloudflare Pages, Netlify). Revisar los términos vigentes antes de decidir.
