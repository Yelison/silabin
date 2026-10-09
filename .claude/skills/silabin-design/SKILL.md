---
name: silabin-design
description: Úsala al diseñar, maquetar, rediseñar o revisar cualquier pantalla, componente o elemento visual de Silabín (mapa, sesión, plantillas de ejercicio, fin de sesión, premios, inicio), y al decidir colores, tipografía, animación, feedback de acierto o fallo, el compañero, objetivos táctiles o el comportamiento en iPad, apaisado o teléfono. Use when designing or reviewing Silabín UI, screens, map, visual feedback, colors, fonts, mascot or animations.
---

# Silabín: lenguaje visual y de experiencia

Silabín es una **pequeña aventura mientras se aprende a leer**, para un niño de 3-4 años que
**aún no lee** y que juega acompañado de un adulto. No es un panel de control, ni un LMS, ni un
formulario, ni un casino, ni un juego que sobreestimula. **La sencillez es una función:** cada
elemento tiene un propósito, y ninguno está ahí para rellenar un hueco.

En cada pantalla, el niño entiende sin leer: **¿dónde estoy? ¿qué hago? ¿lo hice bien? ¿qué
viene ahora?**

## Autoridad: qué manda cuando algo choca

1. **Spec** `docs/superpowers/specs/2026-09-18-silabin-design.md`, sobre todo §2 (principios
   pedagógicos, no negociables) y §9 (experiencia), y `CLAUDE.md`.
2. **Los tests** que vigilan el diseño: `src/app/tokens.test.ts` (CO1 contraste AA, CO2 sin rojo
   ni verde intensos, CO3 manifest y viewport con los tokens), `src/features/legibility.test.tsx`
   (LE1-LE5: superficie opaca bajo todo texto) y `src/features/boundaries.test.ts`.
3. **Esta skill** y `docs/diseno-visual.md`, que tiene la tabla de tokens, el contraste medido y
   las decisiones del autor.
4. El gusto.

Cuando dudes: **comprensión del niño > contenido de aprendizaje > claridad de la interacción >
personalidad visual > decoración.**

No tomes decisiones de diseño arbitrarias. Una que no cubran estas fuentes se pregunta al autor
o se registra como `Ruling:` en el ledger del plan.

## Peticiones habituales que aquí cambian

| Si alguien pide… | En Silabín es… | Por qué |
|---|---|---|
| Verde para el acierto y coral o rojo para el error | Acierto en el ejercicio: rebote y la locución `celebrate:correct` (el ámbar `celebrate` y las ★ son del fin de sesión y del mapa). Error: **sin cambio de color**, `feedback:retry` (< 2 s) y la pista siguiente | §2: el feedback de error es neutro. CO2 falla con rojo o verde intensos |
| Globos de texto del compañero («¡Inténtalo otra vez!») | El compañero **habla**: las locuciones están en `src/content/audio-manifest.ts` («¡Muy bien!», «Mmm, otra vez.», «No te oí. ¿Lo dices otra vez?») | §9: no hay texto para el niño. Una frase nueva es una clave de audio nueva en `content/`, no un texto en la vista |
| Botón «Continuar» como acción principal del ejercicio | **La interacción es la acción.** `SessionScreen` avanza solo tras la celebración, y `EndScreen` se cierra con un toque en cualquier parte | §9: un solo gesto por ejercicio |
| El pájaro amarillo siempre | El **compañero equipado** (`Companion`): loro amarillo (`companion:first`, también icono de la app) o elefantito (`companion:second`), D36 | Es un cosmético que el niño elige. El pollito de las maquetas queda sustituido |
| Azul marino oscuro para el texto | `ink`, un casi negro cálido, mientras el autor no decida otra cosa (ver «Decisiones abiertas») | Ya cumple AA con holgura. Cambiarlo es un token nuevo que debe pasar CO1 |
| Vocales «A, E, I, O, U»; «La m y sus sílabas» | Orden **a, e, o, i, u**; par **A/a** siempre visible; la consonante se nombra por su sonido («mmm»), nunca «eme» | §2: orden de letras, par A/a, sonido y no nombre. Los títulos salen de `content/` (`title`), nunca del arte |
| Botones pequeños prohibidos en todas partes | Al niño, ≥ 72 px. Los controles del adulto son **pequeños y ocultos a propósito**: `SalirAdulto` con pulsación larga y el logo mantenido 3 s (`AdultDoor`) | Si se agrandan, el niño los pulsa. Nunca pongas una flecha «atrás» en el mapa: es la pantalla de inicio |

## Color

Los tokens están en `src/app/globals.css` (`@theme`) y su tabla en `docs/diseno-visual.md`. **No
copies hex a las vistas:** usa la utilidad del token (`bg-action`, `text-ink`…). Los tokens son
`surface` (crema, fondo), `card` (blanco), `ink` y `ink-soft` (texto), `action` y `action-ink`
(el amarillo del loro: lo que se toca), `calm` y `calm-border` (el azul cielo: opciones en reposo
y progreso de la sesión), `mark` y `mark-border` (la opción que marca el modelo), `celebrate` (el
ámbar de las pegatinas: solo estrellas y celebraciones) y `trace-ink` (el trazo del dedo).

- Los colores vivos (`action`, `celebrate`) se reservan para lo interactivo y las celebraciones.
  El resto usa tonos poco saturados.
- **Ningún estado se marca solo con color** (§9): también se marca con forma, borde, icono o
  movimiento.
- **Un color nuevo es un token nuevo** en `globals.css`, que debe pasar `tokens.test.ts`.
- **El tema claro es fijo:** no hay modo oscuro.

### Colores de mundo: identidad ambiental, nunca estado

Dirección aprobada por el autor (2026-10-03). Los valores son aproximados y se fijan tras la
prueba visual de `/dev/arte`; hasta entonces **no son tokens**, y no se usan fuera de esa prueba.

| Mundo | Tono | Base aprox. | Acento aprox. |
|---|---|---|---|
| Fase 0, «Oído de explorador» | lila suave (casa con el elefantito) | `#D8CCFF` | `#A994F4` |
| Fase 1, «Las vocales» | azul cielo | `#CBEAFF` | `#82C8F5` |
| Fase 2, «Las sílabas» | melocotón suave | `#FFD8C2` | `#F3A77C` |
| Fases futuras | beis neutro y desaturado | `#E9E2D7` | — |

- **El amarillo (`action`) es solo para la unidad activa, las acciones principales y lo
  claramente interactivo.** Ningún color de mundo compite con él. El melocotón es el que más
  se acerca al amarillo: vigílalo.
- El color del mundo se nota **en el entorno**: vegetación, terreno, cielo, hitos del paisaje,
  detalles decorativos, el borde de las fichas, los tramos secundarios del camino, el indicador
  del mundo y las ilustraciones pequeñas. Nunca una pantalla entera de un solo color.
- Las fichas y el contenido de aprendizaje son iguales en todos los mundos, con el mismo
  contraste. El texto va en `ink` (≥ 7 : 1 sobre las cuatro bases).
- Los acentos dan menos de 3 : 1 sobre `card` y apenas se distinguen del amarillo por
  luminancia: **son decoración**. Ningún estado depende de ellos. La activa destaca por su forma,
  su brillo y el compañero, no por el contraste con el acento.

## Tipografía

**Nunito en toda la aplicación** (decisión del autor, 2026-10-03; sustituye a Andika, D8, y a la
fuente del sistema). Hoy el código aún carga Andika (`layout.tsx`, `--font-reading`) y la fuente
del sistema (`--font-sans`). El cambio se hace en un plan, con su test, y actualiza
`docs/diseno-visual.md`.

| Peso | Uso |
|---|---|
| 800 ExtraBold | letras, sílabas y palabras que el niño aprende; títulos importantes |
| 700 Bold | nombres de unidad o nivel; texto destacado del adulto |
| 600 SemiBold | texto secundario |

- Nunca por debajo de 600, y nada pequeño en lo que el niño debe percibir. Un número junto a ★ va
  en `ink`.
- La minúscula es la de lectura, y el trazo es en mayúscula por defecto. Los títulos de unidad
  son para el adulto: pequeños y secundarios.
- **Vigila la `a`:** el trazo de minúsculas enseña la `a` de un solo piso (D28). Si la `a` de Nunito
  es de dos pisos, el niño verá en pantalla una forma distinta de la que traza. Compruébalo al
  implementar y llévaselo al autor; no lo resuelvas por tu cuenta.

## Fondos y legibilidad

- Todo texto o indicador va sobre una **superficie opaca de token** (`bg-surface`, `bg-card`,
  `bg-calm`, `bg-action`, `bg-mark`). No vale `bg-card/80` ni bajar la opacidad de la ficha: lo
  atenuado baja la opacidad del **contenido** (LE1-LE5).
- Los fondos equipables (clásico, Pradera, Espacio, Bosque) son saturados y con detalle. Nada
  depende de ellos. Los caminos, territorios y fichas los **dibuja el código** a partir de
  `content/`, no van pintados en el fondo, y deben verse bien sobre los cuatro.
- La decoración nunca compite con palabras, letras, opciones ni acciones. El espacio vacío es
  intencionado.

## El compañero

- Es el compañero de aprendizaje del niño: está en el mapa (112 px) y en el fin de sesión
  (160 px). Lo pinta `Companion`, que lee el equipado. No uses `ArtImage` con un compañero fijo.
- Comunica con **voz y gesto**: locuciones cortas del manifest y una animación sutil.
- Un mensaje nuevo pide su clave en `audio-manifest.ts` (`content/`) y su locución. Si hay un
  globo, es redundante con la voz y opcional; nunca es el único canal.

## La sesión (lección)

Estructura común, la de `SessionScreen`: **arriba**, la barra de progreso de la sesión
(`Progreso`, en `calm`) y la salida del adulto; **en el centro**, a pantalla completa y sin
scroll, un solo ejercicio.

- Cada ítem nuevo se **presenta** (ver, oír y, en voz, boca) antes de evaluarse: `Presentation`
  y luego `Evaluation`, por plantilla (`src/features/session/<plantilla>/`).
- Jerarquía dentro del ejercicio: estímulo (palabra, letra o `Picture`), la orden por audio
  (`ReplayButton` para repetirla) y la interacción: opciones `OptionCard`, `MicButton`, tambor
  `BigButton`, lienzo `TraceCanvas` o la bandeja de `build`. **Un solo gesto obvio.**
- Las pistas van de menos a más (spec §5) y las ordena el motor. La vista solo pinta los estados
  de `OptionCard`: `idle`, `dimmed` (opacidad y escala), `pulsing` (borde y pulso) y `marked`
  (borde de 8 px y mano).
- Las 9 plantillas (`registry.ts`) existen. Una pantalla de ejercicio nueva **reutiliza** `ChoiceEvaluation`,
  `PictureChoice`, `VoiceTurn` y los componentes base antes de crear nada.

## Feedback

- **Acierto:** rebote breve del ejercicio (`motion-safe:animate-bounce` mientras `celebrating`),
  «¡Muy bien!» hablado y, al final, las ★ y los logros en `EndScreen` con Framer Motion
  (`motion/react`). Recompensa sin exceso: una celebración por logro, menos de 4 s y cerrable
  con un toque.
- **Fallo:** neutro, sin sonido de error, sin vidas, sin pérdida de estrellas y sin mensajes
  negativos. Suena «Mmm, otra vez.» y llega la pista.
- La vista **no decide** si fue acierto ni qué pista toca: pinta el `AttemptFeedback` del motor.

## Progreso: el mapa como viaje

El mapa no es una lista vertical de curso (hoy aún lo es: el Plan 8 lo rehace). Dirección
acordada con el autor en `docs/diseno/mapa/notas-maquetas.md`:

- Rejilla en serpiente generada por código desde `content/` (5 columnas en iPad apaisado, 2-3 en
  vertical o teléfono, con scroll y la activa centrada al abrir), unida por un camino
  discontinuo.
- Fichas reconocibles sin leer: color y un elemento grande (la letra en las unidades de letra, un
  icono en la fase 0), con el título pequeño para el adulto.
- **Color por mundo** como identidad ambiental (ver «Colores de mundo»): Fase 0 «Oído de
  explorador», Fase 1 «Las vocales», Fase 2 «Las sílabas»; las fases futuras, sin ítems, en beis.
- **Tres estados, iguales en todos los mundos, que se distinguen sin depender del color:**
  - **Activa** (`current`): amarillo `action`, un brillo muy sutil, más contraste, el compañero
    equipado junto a la ficha y `aria-current="step"`. Se reconoce al instante.
  - **Terminada** (`completed`): base clara y neutra, ★ ganadas (y `aria-label` con ellas) y
    detalles del color del mundo. No compite con la activa.
  - **Bloqueada** (`locked`): desaturada, con menos contraste, `lock` si hace falta, el contenido
    atenuado y la ficha opaca. Sin rojo. Legible pero secundaria; evita la «pared de candados».
- Se conservan el contador de estrellas con su barra al próximo hito, los puntos de avance de la
  unidad activa (sin huecos vacíos), la marca de «guardado» y «Mis premios» (≥ 72 px).
- El mapa pinta `progress.units` del motor; no decide qué unidad se juega.

## Dispositivo y tamaños

- **Primero el iPad en apaisado**; también vertical y teléfono. Variantes en `globals.css`:
  `short:` (alto ≤ 760 px) y `apaisado-bajo:` (teléfono en horizontal). Lo que no cabe a lo alto
  se reordena, no se recorta.
- Objetivos del niño de **≥ 72 px**; las opciones, `min-h-target` (128 px). El trazo usa el lado
  corto como referencia.
- Arrastrar con precisión es difícil a esta edad: donde haya arrastre, tocar es una alternativa
  equivalente (R15; así funciona `build`). No quites el arrastre: añade el toque.
- Prueba en `/dev/plantillas` y `/dev/arte`. Lo que solo vale en hardware va a
  `docs/checklist-ipad.md`.

## Animación

- Comunica feedback, progreso, atención o personalidad; nunca animes todo. Prefiere el rebote,
  la escala, la flotación, el brillo, el estallido de estrellas y el avance por el camino.
- **Dos interruptores, los dos obligatorios:** `motion-safe:` (el `prefers-reduced-motion` del
  sistema) y el ajuste del adulto `reducedCelebrations` (S4), que respetan `EndScreen` y
  `TrailLayer`. Con él, nada se mueve y no se usa `motion.span`.

## Componentes: busca antes de crear

Reutiliza, luego amplía con variantes, y crea solo si no hay otra salida.

| Concepto | Lo que existe |
|---|---|
| LessonShell | `features/session/SessionScreen` (`ExerciseView`) |
| ProgressBar | `Progreso` (privado de `SessionScreen`) y la barra al hito de `MapScreen` |
| AudioButton | `components/ReplayButton` |
| MicrophoneButton | `components/MicButton` |
| PrimaryAction | `components/BigButton` (solo icono, `aria-label` obligatorio) |
| Opción para tocar | `components/OptionCard` (4 estados) |
| Imagen de palabra | `components/Picture` (`img:<palabra>`, emoji de respaldo) |
| Arte decorativo | `features/rewards/visuals.ts` → `components/ArtImage` (emoji de respaldo) |
| MascotMessage | No existe: `Companion` más una locución |
| LevelNode, WorldMap | `features/map/MapScreen` (lo reescribe el Plan 8) |
| SuccessFeedback | rebote `celebrating` en `SessionScreen` y `EndScreen` |
| Icono | `components/Icon`, solo los de `ICON_NAMES` (uno nuevo pide su PNG en `public/icons/`) |

`features/` y `components/` importan solo `@/engine`, `@/speech`, `@/store` y `@/audio`, y
nunca deciden pedagogía.

## Antes de dar por buena una pantalla

- [ ] ¿Un niño que no lee sabe dónde está, qué hacer, si acertó y qué viene después?
- [ ] ¿Hay una sola acción obvia y ningún elemento sin propósito?
- [ ] ¿Ningún texto para el niño, salvo las letras, sílabas o palabras objetivo?
- [ ] ¿Solo colores de token, ningún estado marcado solo por color y nada de rojo o verde de
  «bien o mal»?
- [ ] ¿Todo texto sobre superficie opaca, con los cuatro fondos?
- [ ] ¿Objetivos del niño ≥ 72 px y los controles del adulto ocultos?
- [ ] ¿Funciona en iPad apaisado, vertical y `apaisado-bajo` sin scroll dentro del ejercicio?
- [ ] ¿Respeta `motion-safe:` y `reducedCelebrations`?
- [ ] ¿Reutiliza un componente existente?

## Decisiones abiertas (pregúntalas, no las decidas)

- **Valores finales de los colores de mundo**, tras la prueba de `/dev/arte`, y cómo conviven con
  los fondos equipables (Pradera, Espacio, Bosque), que también pintan el entorno.
- **Texto en azul marino:** el autor lo menciona, pero hoy `ink` es un casi negro cálido. Cambiarlo
  es un token nuevo que debe pasar CO1.
- **Mapa** (`notas-maquetas.md`): qué hace una ficha terminada al tocarla (cambia el motor), el
  icono de cada unidad de la fase 0 y si las fases futuras se ven enteras.
- Arte pendiente: la boca esquemática (deuda 5) y los glifos sin arte (🔁, ✓, ✕, ★/☆; V10).
