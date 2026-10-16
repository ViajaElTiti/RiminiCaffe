# Fase 3 — UX, arquitectura y decisiones (tal como se construyó)

Concepto: **Il Quotidiano** (la web sigue el día de Rimini) con el lenguaje visual de **Verde Profundo**.

## 1. Acción principal y secundaria

| | Acción | Por qué |
|---|---|---|
| **Primaria** | **Cómo llegar** (Google Maps) | Quien llega desde Instagram o Maps ya decidió "quizá voy": lo que falta es llegar. Es tráfico físico, el objetivo del proyecto |
| **Secundaria** | **Ver la carta** | Convierte el descubrimiento en deseo y resuelve "¿qué venden?" |
| **Terciarias** | Llamar · WhatsApp | Reservas a mediodía (según el local). WhatsApp asume que +34 652 49 68 27 tiene WhatsApp: **verificar** |

No hay "Pedir online": no hay datos de delivery propio ni de plataformas. Si se suman, entran por `orderLinks` en `content/site.json` y se disparan como `click_order`.

## 2. Arquitectura de información

| Página | ES / CA / EN | Función | Qué contiene |
|---|---|---|---|
| Home | `/es/` `/ca/` `/en/` | Entender Rimini y decidir ir | Hero, frase de marca, "Un día en Rimini" (3 turnos), carta (teaser), galería, eventos (si hay), visita |
| Carta | `/carta/` `/carta/` `/menu/` | Escanear qué hay y cuánto cuesta | 10 categorías, precios, vegetariano, nav sticky, CTA de reserva |
| Visita | `/visitanos/` `/visita/` `/visit/` | Llegar y contactar | Dirección, horario, estado "abierto ahora", teléfono, WhatsApp, mapa incrustado, servicios |
| Legal | `/aviso-legal/` … | Obligación legal (LSSI) | Titular, cookies/datos. **Plantilla con placeholders; revisar con un abogado** |
| 404 | `/404.html` | No perder a quien se equivoca | Trilingüe, vuelve a la home |

**Páginas que NO creé, y por qué**
- **Sobre nosotros:** no hay historia verificada y no voy a inventarla. La frase de marca y la galería cubren el rol. Cuando exista (quién, por qué "Rimini"), se añade.
- **Eventos:** el brandbook las pide, pero no hay calendario. La sección de la home se muestra sola cuando `content/events.json` tiene entradas; una página propia solo si hay eventos recurrentes.
- **Contacto separado:** se fusionó con Visita. Con un teléfono, un WhatsApp y una dirección, otra página sería relleno.
- **Tienda / bolsas:** confirmado que no se venden.
- **Blog:** sin equipo para mantenerlo. SEO local no lo necesita al inicio.

**Idioma.** `/` detecta el idioma del navegador (`navigator.languages`): ca → catalán, es/gl/eu → español, en → inglés, cualquier otro → inglés. Se respeta la elección manual (guardada en el navegador). Cada idioma tiene su URL, su `hreflang` y su sitemap. Recomendación de hosting: además, redirigir en servidor por `Accept-Language` (Netlify/Cloudflare) para evitar el parpadeo del redirect de JS.

## 3. Homepage, de arriba abajo

| # | Sección | Objetivo | Contenido | CTA | Móvil → escritorio |
|---|---|---|---|---|---|
| 1 | Header | Orientar | Logotipo (versión sin tagline), Carta, Visita, idioma | — | Una fila de 60 px, sin hamburguesa (solo 2 enlaces) → 72 px |
| 2 | **Hero** | Qué es, dónde, ¿abierto? | Estado "abierto ahora · hasta las 21:00", H1, bajada con dirección, foto | Cómo llegar · Ver la carta | Texto y foto apilados (foto 4:5) → 2 columnas, 2ª foto superpuesta |
| 3 | Frase de marca | Posicionar | "Una mirada fresca a la tradición italiana y mediterránea." (texto del brandbook) | — | Fondo claro, titular grande |
| 4 | **Un día en Rimini** | Mostrar la oferta por momento, resolver "cuándo" | 09:00 café · 13:00 focaccia y pizza · 19:00 aperitivo. El turno actual lleva una etiqueta "Ahora" | Ver cada tramo en la carta · WhatsApp (mediodía) | Paneles apilados, uno por color (claro, terra, velvet) → 2 columnas alternadas |
| 5 | Carta (teaser) | Despertar deseo | Chips de categorías + 4 productos con foto y precio | Ver la carta completa | Chips que envuelven; tarjetas 2×2 → 4 en fila |
| 6 | Rimini por dentro | Confianza y atmósfera | 6 fotos de equipo y local + "Primero el café. Después, la vida." | — | Carrusel con scroll-snap (sin JS) → rejilla 3×2 |
| 7 | Eventos *(condicional)* | Recurrencia | Se oculta si no hay datos | — | — |
| 8 | Visita | Cerrar la decisión | Dirección, horario del día resaltado, tres botones, mapa incrustado | Cómo llegar · Llamar · WhatsApp | Apilado → 2 columnas |
| 9 | Footer | NAP y redes | Logotipo con tagline, dirección, horario, contacto, Instagram, TikTok, idiomas, legal | — | Apilado → 3 columnas |
| + | **Barra móvil** | Acción siempre a mano | Cómo llegar · Carta · Llamar. Aparece al salir del hero | — | Solo < 900 px |

**Decisión crítica.** Las pizzas y el spritz son pilares, pero **no tengo fotos de aperitivo**. El panel de las 19:00 resuelve esa carencia con tipografía ("Spritz") en lugar de una foto improvisada. Es una solución temporal digna; con una sesión de fotos de tarde-noche, vale más que cualquier otra mejora de la web.

## 4. Hero: alternativas evaluadas

| | Titular (ES) | Idea | Riesgo |
|---|---|---|---|
| **A (elegida)** | **Del primer café al último spritz.** | Resume el concepto, el horario largo y los dos pilares (café y spritz) en una línea | Sin la dirección en el titular; se resuelve con la bajada |
| B | Primero el café. Después, la vida. | Es su frase de Instagram; carácter | No dice qué es Rimini ni dónde. Buena para la galería (la usé ahí) |
| C | Tu rincón italiano de todos los días. | Posicionamiento ("your daily spot") | Genérico: lo podría decir cualquiera |

Bajada: *Café de especialidad, focaccias y pizzas al horno en la Ronda de Sant Pere 37, Barcelona.* Foto: pizza de mortadela sobre tabla (mantel de cuadros, rejilla, baldosa): cálida y reconocible. Animación: **ninguna**. El estado "abierto ahora" aporta el dinamismo.

## 5. Recorrido y fricciones

Instagram / Google → web → entender Rimini → ver comida y café → ver horario/ubicación → cómo llegar / llamar / WhatsApp.

| Fricción | Solución |
|---|---|
| "¿Está abierto?" | Estado en tiempo real, hora de Madrid, en el hero y en Visita |
| Carta en PDF | Carta web con ancla por categoría, sticky nav, precios, filtro vegetariano marcado |
| Idioma | Detección automática y selector sin salir de la página |
| Mapa | Google Maps incrustado directamente (decisión del cliente), con `loading="lazy"` para no frenar la carga. Implicación de cookies: ver README |
| Reservar a mediodía | Botón de WhatsApp y teléfono en 3 puntos de la página |
| Fotos pesadas | WebP responsive; la home descarga ~150 KB de imágenes en móvil |

## 6. Integraciones

| Canal | Decisión |
|---|---|
| Google Maps | Sí: enlace de ruta + mapa incrustado |
| WhatsApp | Sí: botón con mensaje prellenado en el idioma de la página |
| Instagram y TikTok | Enlaces en el pie. **Sin widget/feed embebido**: pesa, rompe el rendimiento y la cuenta tiene pocos posts |
| Delivery | No hay datos. Cuando existan: `orderLinks` en `site.json` |
| Reservas | No hay sistema; teléfono y WhatsApp. Un widget (TheFork, etc.) solo si el local ya lo usa |

## 7. Analítica (eventos definidos)

Cookieless. Se activa rellenando `analytics.plausibleDomain` en `content/site.json` (Plausible, de pago) o conectando el `dataLayer` que ya recibe todos los eventos. Mientras esté vacío, no carga nada.

| Evento | Se dispara con |
|---|---|
| `menu_view` | Carga de la página de carta |
| `click_menu` | Cualquier enlace a la carta (`place`: hero, mobilebar, teaser…) |
| `click_directions` | Cómo llegar |
| `click_phone` · `click_whatsapp` | Teléfono · WhatsApp |
| `click_instagram` · `click_tiktok` | Redes |
| `click_maps_open` | Enlace "Abrir en Google Maps" |
| `lang_switch` | Cambio de idioma |
| `click_order` | *(reservado)* delivery |

Page views: los trae el propio proveedor.

## 8. SEO local

| Página | Title | Keywords naturales |
|---|---|---|
| Home ES | Rimini Caffè · Café de especialidad y focacceria en Barcelona | café de especialidad Barcelona, focacceria, pizza, Eixample, Ronda de Sant Pere |
| Carta ES | Carta · Café, focaccias, pizzas y aperitivo | carta, precios, brunch, aperitivo |
| Visita ES | Visítanos · Ronda de Sant Pere 37, Barcelona | cómo llegar, horario |

Hecho: HTML semántico, un H1 por página, `hreflang` recíproco, canonical, Open Graph, `CafeOrCoffeeShop` (dirección, horario, teléfono, redes, carta), `Menu` con secciones y precios, sitemap con alternativas, robots.txt. **No** puse `aggregateRating`: las reseñas deben verificarse y, además, Google desaconseja valorar el propio negocio en el marcado.
**Pendiente (fuera de la web):** que el nombre, dirección y teléfono sean **idénticos** en la ficha de Google, Instagram, TikTok y directorios; pedir alta/optimización de la ficha de Google Business con categorías (Cafetería, Focacceria, Pizzería).
Riesgo: "RiminiRimini" (restaurante en Eixample) y la ciudad de Rimini comparten el término. La dirección en el H1/bajada y en el title ayuda a diferenciarse.

## 9. Movimiento

Una sola animación: un revelado de 0,6 s en los paneles del día. Se desactiva con `prefers-reduced-motion`. Se descartaron: vídeo en el hero (peso, y el brandbook prohíbe el logo sobre fondo "busy"), parallax, carruseles automáticos, transiciones de página. La barra móvil se desliza al aparecer.

## 10. Lo que no me convence (y lo dejo dicho)

- **La web depende de que el horario esté bien.** Si el local cambia horarios y nadie edita `site.json`, el sitio miente con confianza ("Abierto ahora"). Hay `closedDates` para festivos; alguien debe responsabilizarse.
- **La carta tiene erratas heredadas** que corregí en silencio en la web (Pastries, Cheesecake), y un duplicado: *Cheesecake* aparecía en bollería y postres; lo dejé solo en **Postres**. "Prochetta" lo escribí como **Porchetta** (marcado `verify`).
- **El PDF de la carta** ya no sirve como fuente de verdad: la web es la fuente y el PDF debería generarse de ella, no al revés.
- **Fuente de marca no cargada** (ver README).
