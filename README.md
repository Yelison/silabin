# Silabín

Aplicación web para que un niño de **3-4 años que aún no conoce letras** aprenda a leer en
español desde cero: conciencia fonológica, vocales y sílabas CV, con pistas escalonadas,
repaso espaciado, validación por voz y recompensas. Uso principal en iPad/iPhone con Safari,
como PWA; debe funcionar en cualquier navegador moderno. El adulto siempre acompaña.

> **Estado a 2026-09-26:** el núcleo sin interfaz (Plan 1, PR #1) y la primera sesión jugable
> (Plan 2, PR #3) están fusionados en `main`. El **Plan 3** (rama
> `feat/plan-3-plantillas-toque`) hace **jugable la Fase 0 entera**: `count-syllables`,
> `rhyme`, `initial-sound` y `hear-it`, con una base visual mínima, las 65 ilustraciones y los
> 6 iconos reales, y las plantillas `listen-tap` y `build` construidas (se ven en
> `/dev/plantillas`, porque ninguna unidad las ofrece todavía). 817 tests (1 omitido), y
> `typecheck`, `lint` y `pnpm build` en verde. Las unidades de la Fase 1 y la 2 siguen
> atenuadas en el mapa hasta que existan `trace` y `say-it`. **Falta** la revisión final de la
> rama (Opus), la prueba manual de la Fase 0 por el autor y el PR (ver
> [siguientes pasos](#siguientes-pasos-concretos)).

---

## Índice

1. [Cómo ejecutarlo](#cómo-ejecutarlo)
2. [Documentos y en qué orden leerlos](#documentos-y-en-qué-orden-leerlos)
3. [Arquitectura](#arquitectura)
4. [Lo que ya está hecho: Plan 1](#lo-que-ya-está-hecho-plan-1)
5. [Lo que ya está hecho: Plan 2](#lo-que-ya-está-hecho-plan-2)
6. [Lo que ya está hecho: Plan 3](#lo-que-ya-está-hecho-plan-3)
7. [Lo que falta: planes 4 a 6](#lo-que-falta-planes-4-a-6)
8. [Siguientes pasos concretos](#siguientes-pasos-concretos)
9. [Decisiones tomadas](#decisiones-tomadas)
10. [Trampas conocidas](#trampas-conocidas)
11. [Deuda menor aceptada](#deuda-menor-aceptada)
12. [Cómo se trabaja en este repo](#cómo-se-trabaja-en-este-repo)

---

## Cómo ejecutarlo

Requisitos: Node 22 y pnpm 10 (`packageManager: pnpm@10.33.3`).

```bash
pnpm install
pnpm test        # Vitest: 817 tests + 1 omitido (el de ficheros de audio)
pnpm typecheck   # tsc --noEmit, TypeScript estricto
pnpm lint        # biome check src
pnpm dev         # Next.js: la aplicación, con las 4 unidades de la Fase 0 jugables
```

Las tres puertas (`test`, `typecheck` y `lint`) y `pnpm build` están en verde en la rama del
Plan 3.

**`/dev/plantillas`** (solo con `pnpm dev`; en producción da 404): un selector de plantilla e
ítem que monta la presentación y la evaluación con un ejercicio planificado por el motor, y
botones para simular el rung 1, 2 o 3 y el bloqueo. Sirve para ver `listen-tap` y `build`, que
ninguna unidad ofrece aún (las unidades de la Fase 1 y la 2 esperan a `trace` y `say-it`).

El test omitido comprueba que los ficheros de audio existen en disco en los 3 acentos. Solo
corre con `SILABIN_CHECK_AUDIO_FILES=1`, que se enciende cuando lleguen los audios reales.

Stack real instalado: Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5 estricto,
Tailwind CSS 4, Zod 4, Zustand 5, idb-keyval, Vitest 5 con jsdom y Testing Library, y
Biome 2.

> **Next.js 16 tiene cambios rompedores respecto a versiones anteriores.** Antes de escribir
> código de Next, lee la guía correspondiente en `node_modules/next/dist/docs/` (ver
> `AGENTS.md`).

El spec también prevé Framer Motion, Serwist (PWA) y Playwright. **Aún no están
instalados**; llegan con los planes de interfaz (Plan 6, o antes si hace falta).

---

## Documentos y en qué orden leerlos

| Orden | Documento | Qué contiene |
|---|---|---|
| 1 | Este README | Estado, pendientes y siguientes pasos |
| 2 | `docs/superpowers/specs/2026-09-18-silabin-design.md` | **El spec aprobado. Es la autoridad.** Pedagogía, arquitectura, contenido, motor, voz, recompensas, UX y pruebas |
| 3 | `docs/superpowers/2026-09-26-plan-3-registro.md` | Registro de ejecución del Plan 3. Busca `Ruling` para las decisiones y `minor (deferred)` para lo que se dejó a propósito. Es la memoria de la rama `feat/plan-3-plantillas-toque` |
| 4 | `docs/superpowers/plans/2026-09-26-silabin-plantillas-toque.md` | El Plan 3 (tareas 1-6, con la 5b): base visual, plantillas de toque y Fase 0 de punta a punta, con las decisiones D8-D11 al principio |
| 5 | `docs/diseno-visual.md` | Investigación de diseño para niños de 3 a 6 años, tabla de tokens y reglas visuales (D8). La identidad final sigue pendiente |
| 6 | `docs/ilustraciones-prompts.md` | Los prompts de las 65 ilustraciones y los 6 iconos (estilo 3D suave tipo juguete) |
| 7 | `docs/superpowers/2026-09-26-plan-2-registro.md` | Registro de ejecución del Plan 2 (12 rulings, R1-R12). Busca `Ruling` para las decisiones y `minor (deferred)` para lo que se dejó a propósito |
| 8 | `docs/superpowers/plans/2026-09-26-silabin-sesion.md` | El Plan 2 (9 tareas): sesión jugable de `count-syllables`, con las decisiones D1-D7 al principio |
| 9 | `docs/superpowers/2026-09-19-plan-1-registro.md` | Registro de ejecución del Plan 1. Busca `Ruling` y `minor (deferred)` |
| 10 | `docs/superpowers/plans/2026-09-18-silabin-nucleo.md` | El Plan 1 completo (22 tareas) y la hoja de ruta original al final |
| 11 | `docs/research/pedagogia-lectura-inicial.md` | Evidencia pedagógica: método fonético-silábico, orden de letras, espejo b/d/p/q |
| 12 | `docs/research/reconocimiento-voz-infantil.md` | Comparativa de reconocimiento de voz infantil; por qué el evaluador `parent` es el del día uno y Azure viene después |

---|---|---|
| 1 | Este README | Estado, pendientes y siguientes pasos |
| 2 | `docs/superpowers/specs/2026-09-18-silabin-design.md` | **El spec aprobado. Es la autoridad.** Pedagogía, arquitectura, contenido, motor, voz, recompensas, UX y pruebas |
| 3 | `docs/superpowers/2026-09-26-plan-2-registro.md` | Registro de ejecución del Plan 2 (12 rulings, R1-R12). Busca `Ruling` para las decisiones y `minor (deferred)` para lo que se dejó a propósito. Es la memoria de la rama `feat/plan-2-sesion` |
| 4 | `docs/superpowers/plans/2026-09-26-silabin-sesion.md` | El Plan 2 (9 tareas): sesión jugable de `count-syllables`, con las decisiones D1-D7 al principio |
| 5 | `docs/superpowers/2026-09-19-plan-1-registro.md` | Registro de ejecución del Plan 1. Busca `Ruling` y `minor (deferred)` |
| 6 | `docs/superpowers/plans/2026-09-18-silabin-nucleo.md` | El Plan 1 completo (22 tareas) y la hoja de ruta original al final |
| 7 | `docs/research/pedagogia-lectura-inicial.md` | Evidencia pedagógica: método fonético-silábico, orden de letras, espejo b/d/p/q |
| 8 | `docs/research/reconocimiento-voz-infantil.md` | Comparativa de reconocimiento de voz infantil; por qué el evaluador `parent` es el del día uno y Azure viene después |

---

## Arquitectura

```
src/
  content/     Currículo como datos, validado con Zod al importar. Sin React.       ✅ hecho
  engine/      Motor: funciones puras, sin React ni DOM.                           ✅ hecho
  store/       Estado persistido, store de Zustand y puente con el motor.          ✅ hecho
  audio/       Interfaz AudioPlayer; placeholder con speechSynthesis y cola.       🟡 en parte (Planes 2-3)
  images/      Interfaz de imágenes: WebP ilustrado (65) y emoji de respaldo.      🟡 en parte (Plan 3)
  speech/      SpeechEvaluator (parent, browser, azure), VAD, fonemización.        ⏳ Plan 5
  features/    Inicio, mapa, sesión (5 plantillas de toque), fin, aviso, exportar. 🟡 en parte (Planes 2-3)
  components/  UI infantil: BigButton, OptionCard, Picture, Icon, ReplayButton.    🟡 en parte (Plan 3)
  app/         Ruta única que monta App, /dev/plantillas; falta /api/speech-token. 🟡 en parte (Plan 3)
```

**Regla de fronteras:** `features/` y `components/` nunca deciden pedagogía. Solo pintan lo
que ordena `engine/` y le devuelven eventos (acierto, fallo, tiempo). `engine/`, `content/`
y `speech/` (salvo la captura de audio) se prueban sin navegador. `features/` y
`components/` importan solo los barriles `@/engine`, `@/store` y `@/audio`, nunca
`@/content` ni un módulo interno; `src/features/boundaries.test.ts` lo hace cumplir.

---

## Lo que ya está hecho: Plan 1

Plan 1 = **núcleo de contenido, motor de sesión y persistencia**. 22 tareas ejecutadas con
TDD, revisión por tarea y revisión final de rama. Fusionado en `main` mediante el PR #1
(merge `5859408`, 2026-09-19).

### `src/content/`: el currículo

- **143 ítems** y **21 unidades** en orden topológico:
  - **Fase 0, «Oído de explorador»** (4 unidades, sin texto en pantalla):
    `phase0:clap` (contar sílabas), `phase0:rhyme` (rimas), `phase0:initial` (sonido
    inicial vocálico) y `phase0:hear-it` («¿oyes /a/ en pato?»).
  - **Fase 1, «Las vocales»** (5 unidades, en orden a, e, o, i, u): fonema y letra con el
    par mayúscula/minúscula.
  - **Fase 2, «Las sílabas»** (4 unidades, en orden m, l, s, p): fonema, letra, 5 sílabas y
    palabras CV-CV formadas solo con letras ya vistas.
  - **Fase 3** (8 unidades vacías: t, n, d, r, f, ñ, c, b): solo sirven para que el mapa
    muestre el camino futuro bloqueado.
- **9 plantillas de ejercicio**, cada una con sus 3 pistas (`reduce`, `sound`, `model`):
  `listen-tap`, `hear-it`, `count-syllables`, `rhyme`, `initial-sound`, `build`, `trace`,
  `say-it` y `read-word`. El spec habla de 8; `hear-it` se añadió al planificar.
- **35 imágenes** (`picture:*`): palabra hablada con dibujo, compartidas por las fases 0 y 1.
- **Manifiesto de audio** con todas las claves de contenido y de interfaz (131 locuciones).
- **Invariantes con test:** ids únicos, prerrequisitos acíclicos, texto en minúsculas, nunca
  b/d/p/q juntos, y los cuatro invariantes de las palabras de Fase 2 (solo letras ya
  introducidas, sílabas CV o V, sin vocales adyacentes, tilde solo final y con
  `accented: true`).

Plantillas que declara cada fase:

| Fase | Plantillas |
|---|---|
| 0 | `count-syllables`, `rhyme`, `initial-sound`, `hear-it` (una por unidad) |
| 1 | `initial-sound`, `listen-tap`, `trace`, `say-it` |
| 2 | `listen-tap`, `build`, `trace`, `say-it`, `read-word` |

### `src/engine/`: el motor

Todo se importa desde el barril `@/engine`.

| Módulo | Qué decide |
|---|---|
| `planner.ts` | `planSession`: 5-6 ejercicios, máx. 2 presentaciones, 70 % unidad activa y 30 % repaso, sin plantillas iguales seguidas, cierre fácil, determinista por semilla |
| `leitner.ts` | Cajas 1-3 con intervalos de 1, 3 y 7 sesiones |
| `mastery.ts` | Ítem dominado con 3 aciertos al primer intento en sesiones distintas; unidad completa con ≥ 80 % |
| `unlock.ts` | Estados `locked`/`active`/`done`, `activeUnitId` (devuelve `null` si el currículo se agota) |
| `attempts.ts` | Máquina de intentos: libre → reducir → sonar → modelar; el 3.er rung garantiza acierto (`assisted`) |
| `apply.ts` | `applyPresentation`, `applyResolution`, `applySessionEnd`: aplican resultados sin castigos y con crédito una vez por sesión |
| `distractors.ts` | Opciones incorrectas con regla de espejo, dificultad graduada y **solo de lo que el niño ya ha visto** |
| `stars.ts` | 3, 2 o 1 estrellas por aciertos al primer intento; se guarda la mejor marca |
| `rewards.ts` | 8 logros más hitos de 10, 25, 50 y 100 estrellas |

`session.integration.test.ts` simula 40 sesiones seguidas con tres perfiles de niño y
comprueba que nada retrocede.

Refinamientos del spec que introdujo el Plan 1 (documentados en el plan):

- `ItemProgress.presented` e `ItemProgress.lastCreditSession`.
- `ProgressState.counters`.
- El tipo de ítem `picture`.

### `src/store/`: la persistencia

- `schema.ts`: `PersistedState` versión 1 validado con Zod, atado a los tipos del motor.
  `migrate` rescata el documento **clave por clave** en vez de tirarlo entero si una parte
  está corrupta.
- `persist.ts`: `StorageAdapter` inyectable (idb-keyval en el navegador, memoria en tests),
  `loadState` con recuperación, `saveState` que **devuelve `{ saved: boolean }`**, y
  `exportState`/`importState` en JSON.

### Lo que encontró la revisión final (ya corregido)

- **Crítico:** al terminar la Fase 2, las unidades vacías de Fase 3 se marcaban `done` en
  cascada y el planificador producía basura. Corregido en `a10de1f`.
- Los distractores salían de contenido aún no enseñado. Corregido en `71c2662`.
- `migrate` tiraba el documento entero ante un campo corrupto, y `saveState` fallaba en
  silencio. Corregidos en `15181cc` y `04c9aad`.
- Tres huecos de test demostrados por mutación. Cerrados en `8a4024c`.

---

## Lo que ya está hecho: Plan 2

Plan 2 = **primera sesión jugable de `count-syllables`** (9 tareas, ledger en
`docs/superpowers/2026-09-26-plan-2-registro.md`). Fusionado en `main` mediante el PR #3. La
revisión final de rama (Opus) corrigió sus hallazgos (I1-I3, M1; ver el ledger).

- **Motor:** `engine/session.ts` (corrida de sesión pura: plan, intentos, resoluciones y
  cierre); sesión de solo repaso cuando se agota el currículo (`planReviewOnly`); `basePool`
  lanza en vez de caer a un respaldo; el barril `@/engine` está podado y reexporta lo que la
  interfaz necesita.
- **Store:** `createAppStore` (Zustand) guarda tras cada paso; `progress-bridge.ts` une el
  progreso del motor con el documento persistido y escribe el historial de sesiones; barril
  `@/store`.
- **`audio/`:** interfaz `AudioPlayer` (cola, `beat()` para el golpe del tambor), reproductor
  con `speechSynthesis` y reproductor silencioso.
- **`images/`:** `imageFor` con emoji para las 65 claves `img:` del currículo.
- **Interfaz:** `StartScreen` («Toca para empezar»), `MapScreen`, `SessionScreen`,
  `EndScreen`, y las vistas de `count-syllables` (presentación con luces por sílaba, tambor y
  pistas 1-2-3). `SaveWarning` avisa al adulto si no se guardó, y `ExportGesture` exporta el
  progreso manteniendo pulsado el logo 3 s.
- Al acabar el Plan 2 solo `phase0:clap` era jugable. El mapa atenúa las unidades cuyas
  plantillas aún no tienen vista (`isSessionPlayable`).

---

## Lo que ya está hecho: Plan 3

Plan 3 = **el resto de plantillas de toque y la base visual**, en la rama
`feat/plan-3-plantillas-toque` (tareas 1-6 con la 5b; ledger en
`docs/superpowers/2026-09-26-plan-3-registro.md`). Cada tarea pasó revisión; falta la revisión
final de la rama y el PR. Resultado: **la Fase 0 entera es jugable** (`phase0:clap`,
`phase0:rhyme`, `phase0:initial` y `phase0:hear-it`), con 817 tests (1 omitido).

- **Base visual (D8):** tokens de color, tipografía (Andika), radios y tamaño de objetivo en
  `src/app/globals.css`; componentes `OptionCard`, `Picture`, `ReplayButton` y `Icon`. La
  investigación y la tabla de tokens están en `docs/diseno-visual.md`. Tema claro fijo.
- **Audio:** `pickVoice` elige mejor voz del dispositivo (primero el acento, después la
  calidad) y la pausa entre sílabas tiene en cuenta la latencia de las voces «Natural» de red
  de Edge, que alargaba «ga ····· to» en la prueba manual del Plan 2.
- **Motor y contenido:** `engine/answers.ts` (`expectedAnswer`, `expectedPieces`,
  `reducedPieces`), `content/audio-keys.ts`, `rimeOf` y los ítems orales que necesitan
  `rhyme`, `initial-sound` y `hear-it`; el invariante M11 comprueba que cada plantilla de toque
  resuelve `correct` para cada ítem que acepta.
- **Interfaz:** `ChoiceEvaluation` (cuerpo común de `rhyme` e `initial-sound`), `hear-it`,
  `listen-tap` (par minúscula-mayúscula en cada letra) y `build` (tocar **o** arrastrar las
  piezas).
- **Ilustraciones e iconos reales (Tarea 5b):** 65 WebP en `public/images/palabras/` y 6 PNG
  en `public/icons/`, generados con `scripts/optimizar-ilustraciones.py` a partir de las
  ilustraciones originales; `Picture` e `Icon` usan `<img>` y, si la imagen no carga, `Picture`
  cae al emoji de respaldo.
- **Cierre (Tarea 6):** una prueba de integración con vistas, motor y store reales juega la
  Fase 0 de punta a punta (incluido un fallo a propósito en cada rung hasta el modelo), y la
  ruta `/dev/plantillas` (solo en desarrollo; 404 en producción) muestra `listen-tap` y `build`.
- Solo la Fase 0 es jugable: las unidades de la Fase 1 y la 2 declaran `trace` y `say-it`
  (y la 2 también `read-word`) y el mapa las atenúa hasta los Planes 4 y 5 (D10).

---

## Lo que falta: planes 4 a 6

La hoja de ruta original está al final del Plan 1. Esta es la **versión revisada y
confirmada con el autor** (D7), ya con los planes 2 y 3 construidos.

| Plan | Contenido | Resultado visible |
|---|---|---|
| ~~2~~ | ~~Capa `audio/`, Zustand sobre `store/`, inicio, mapa, sesión, fin y `count-syllables` de punta a punta~~ **hecho** | Un niño juega una sesión real de `phase0:clap` |
| ~~3~~ | ~~`rhyme`, `initial-sound`, `hear-it`, `listen-tap` y `build`, con la base visual y las ilustraciones~~ **hecho** (PR #4 fusionado a `main`) | La Fase 0 entera es jugable; `listen-tap` y `build` se ven en `/dev/plantillas` |
| 4 | `trace`: lienzo, eventos táctiles, puntuación con tolerancia y 3 niveles de guía. Es el componente más difícil del proyecto | Escribir letras con el dedo |
| 5 | Voz: `getUserMedia`, VAD, evaluador `parent` pulido, `say-it` y `read-word` | Leer en voz alta con validación del adulto |
| 6 | Recompensas y cosméticos, panel de padres con PIN, importar el progreso (`importState`, con el contrato de D9), PWA y service worker, lista de verificación en iPad | Primera versión completa |
| Después | Spike de Azure, audios neurales en 3 acentos (`do`, `mx`, `neutro`), evaluador `browser`, y **locuciones de sílabas sueltas** para las pistas de `count-syllables` (hoy las dice `speechSynthesis` a partir del texto), más las de `ending:`, `stretch:` y `stretch-in:` | Validación automática de pronunciación |

**La Fase 1 y la 2 siguen atenuadas en el mapa tras el Plan 3.** Todas sus unidades declaran
`trace` y `say-it` (la Fase 2 también `read-word`), así que esperan a los Planes 4 y 5; `listen-tap`
y `build` ya están construidas, pero ninguna unidad las ofrece hasta entonces (D10).

**Voz, en «Después».** Antes de generar el lote entero, una **prueba de Azure con unos 10
audios en `do` y `mx`**. Y **los fonemas sueltos («mmm», «sss», «p») hay que grabarlos con voz
humana**: ninguna voz sintética los dice bien.

**Por qué el Plan 2 cambió respecto a la hoja de ruta original:** el Plan 1 decía que el
Plan 2 construiría `listen-tap`. Pero la primera unidad jugable del currículo es
`phase0:clap`, que solo declara `count-syllables`, y `listen-tap` no aparece hasta la Fase 1.
Con solo `listen-tap`, el motor planificaría ejercicios que la interfaz no sabe dibujar.
`count-syllables` es de toque puro, sin voz ni trazo, y sus ítems ya traen las opciones en
el dato. (Recomendación acordada el 2026-09-19.) `listen-tap` y `hear-it` (que no aparecía en
ningún plan original) se construyeron en el Plan 3.

**El audio no bloquea nada.** Hasta que existan la cuenta de Azure y los audios reales, la
capa `audio/` usa `speechSynthesis` del navegador detrás de la misma interfaz. Las 131
locuciones × 3 acentos (393 ficheros) se generan después sin rehacer nada.

---

## Siguientes pasos concretos

**Plan 3 cerrado (2026-09-27):** revisión final de la rama (Opus, Approved con Minors, 7
mutaciones dirigidas todas muertas) y PR #4 fusionado a `main`. Un hallazgo de la revisión
final quedó como decisión abierta para el Plan 4 (R29 del registro): con nivel `easy` (2
opciones), la pista 1 dejaría solo la respuesta correcta en `listen-tap`/`initial-sound` con
ítems `phoneme`; no es alcanzable hoy porque esas unidades siguen bloqueadas, pero hay que
resolverlo antes de desbloquearlas.

1. **Escribir el Plan 4** (`trace`) con `superpowers:writing-plans`, en
   `docs/superpowers/plans/`, en una rama nueva desde `main`, con `/model opus`; ejecutarlo
   con `superpowers:subagent-driven-development` y `/model sonnet`. Consulta
   [cómo se trabaja](#cómo-se-trabaja-en-este-repo). Antes de escribirlo, revisa las
   [trampas vivas](#trampas-conocidas), sobre todo la 9, y la decisión R29 de arriba.
   Pregunta al autor las decisiones abiertas que queden.
2. Llevar el ledger del plan **versionado desde el primer día** en
   `docs/superpowers/<fecha>-plan-N-registro.md` y hacer commit de él al final de cada
   sesión. `.superpowers/` no se versiona y se pierde al cambiar de máquina.

---

## Decisiones tomadas

Las cuatro decisiones que el Plan 1 dejó abiertas, más las de producto del Plan 2, se
resolvieron con el autor el 2026-09-26. Están en la tabla D1-D7 del
[Plan 2](docs/superpowers/plans/2026-09-26-silabin-sesion.md). D8-D11 son del
[Plan 3](docs/superpowers/plans/2026-09-26-silabin-plantillas-toque.md).

| # | Decisión |
|---|---|
| D1 | Imágenes: detrás de `src/images/`, clave `img:<palabra>`. Las 65 ilustraciones reales (2026-09-26, estilo 3D suave tipo juguete; ver `docs/ilustraciones-prompts.md`) **ya están integradas** como WebP optimizados (Tarea 5b del Plan 3); el **emoji queda solo como respaldo** si la imagen no carga |
| D2 | `basePool` **lanza error** en vez de caer al respaldo global, y un invariante de contenido lo comprueba en `pnpm test` |
| D2b | Consecuencia de D2: las 4 unidades de Fase 2 declaran `initial-sound` con peso 1 |
| D3 | Barril `@/engine`: reexporta `curriculum`, `CurriculumIndex`, `templates`, `TemplateId`, `HintStep`, `Item` y `Unit`; deja de exportar `owningUnits`, `similarity`, `createRng`, `promote`, `demote`, `MASTERY_TARGET`, `REVIEW_SHARE` y `unitMasteryRatio` |
| D4 | Currículo agotado (`activeUnitId === null`): **sesión de solo repaso** planificada por el motor |
| D5 | `saveState` → `{ saved: false }`: **aviso discreto para el adulto** y reintento en el siguiente guardado |
| D6 | **Exportación mínima** con gesto oculto de adulto (mantener pulsado el logo 3 s) |
| D7 | Hoja de ruta de los planes 3 a 6 **confirmada** (la de 4 a 6 sigue en pie; ver [arriba](#lo-que-falta-planes-4-a-6)) |
| D8 | Estilo visual: **base mínima dentro del Plan 3**. Tokens de color, tipografía, radios y tamaño de objetivo en `globals.css` y componentes base. La identidad final (paleta definitiva, ilustraciones, compañero) llegará después y cambiará los tokens sin tocar las vistas. Detalle en [`docs/diseno-visual.md`](docs/diseno-visual.md) |
| D9 | `importState` **va al Plan 6** con el contrato fijado: un import deliberado del adulto **sustituye `doc` entero y quita `readFailed`** (y `recovered`), porque el adulto ha elegido qué documento vale. Hasta entonces no se cablea |
| D10 | Las 5 plantillas de toque (`rhyme`, `initial-sound`, `hear-it`, `listen-tap`, `build`). Tras el Plan 3 **solo la Fase 0 es jugable**: las unidades de Fase 1 y 2 declaran `trace` y `say-it`, y el mapa las atenúa hasta los Planes 4 y 5. `listen-tap` y `build` se prueban con tests y con `/dev/plantillas` |
| D11 | La prueba manual del Plan 2 la hizo el autor **antes** de ejecutar el Plan 3 (Edge y Chrome, sin fallos salvo la pausa larga entre sílabas en Edge, atendida en la Tarea 1) |

Los rulings tomados durante la ejecución están en los registros:
[Plan 2](docs/superpowers/2026-09-26-plan-2-registro.md) (R1-R12) y
[Plan 3](docs/superpowers/2026-09-26-plan-3-registro.md).

---

## Trampas conocidas

Las trampas 1-8 salieron de la cabecera del registro del Plan 1; cada una era un bug real si
se ignoraba. Estado tras el Plan 2:

1. ✅ **El mapa debe recalcular al cargar.** Resuelta: `withProgress` en
   `src/store/progress-bridge.ts` pasa siempre por `recomputeUnitStatuses`, y `startSession`
   (`src/engine/session.ts`) recalcula las unidades antes de decidir la activa (R1).
2. ✅ **`activeUnitId` devuelve `string | null`.** Resuelta: `null` da una sesión de solo
   repaso (D4, `planReviewOnly` en `engine/planner.ts`).
3. ✅ **`saveState` devuelve `{ saved: boolean }`.** Resuelta: el store guarda tras cada paso
   y `SaveWarning` (`src/features/adult/`) avisa al adulto con `saveFailed`; reintenta en el
   siguiente guardado (D5).
4. 🔁 **Regla viva: `unitMasteryRatio` devuelve `1` para una unidad vacía.** Ya no sale del
   barril `@/engine`, así que la interfaz no puede leerlo por error. Si algún día una barra de
   progreso necesita ese dato, usa `isUnitComplete`, que devuelve `false` para una unidad
   vacía.
5. ✅ **El historial de sesiones no se escribía.** Resuelta: `appendSession` en
   `progress-bridge.ts`, llamada desde `app-store.ts` al terminar cada sesión.
6. ✅ **Exportar no tenía interfaz.** Resuelta con una exportación mínima (D6):
   `ExportGesture` en `src/features/adult/`. **Importar** desde la interfaz sigue siendo del
   Plan 6.
7. ✅ **iOS exige un gesto antes de cualquier audio.** Resuelta: la primera pantalla es
   `StartScreen` («Toca para empezar») y todo audio pasa por la cola de `AudioPlayer`.
8. ✅ **Los tests de componentes necesitan `jsdom`.** Resuelta: `jsdom` y Testing Library
   están instalados. `vitest.config.ts` sigue en entorno `node`, así que **cada test de
   interfaz debe llevar** `// @vitest-environment jsdom`.
9. 🔴 **Viva (R6), acotada en el Plan 3: `checkAnswer` lanza para ítems `trace`, `say-it` y
   `read-word`.** `expectedAnswer` (`src/engine/answers.ts`) es ya la única fuente de la
   respuesta esperada y devuelve `null` solo para esas tres plantillas, sin evaluador propio
   todavía; `checkAnswer` lanza ante `null`. El invariante M11 comprueba que las plantillas de
   toque (incluida `build`, que dejó de ser un caso oculto) sí resuelven `correct` para cada
   ítem que aceptan. Es inofensivo hoy porque la única fase jugable es la 0, pero hay que
   tratarla cuando un plan active una unidad con esas plantillas (Planes 4 y 5): sin una guarda
   o un camino propio de evaluación, el niño toparía con una excepción a mitad de sesión. Vale
   también para una sesión de solo repaso con ítems de letras.

---

## Deuda menor aceptada

Nada de esto bloquea, salvo lo que se marca como pendiente. Detalle en los registros (busca
`minor (deferred)`). Las notas visuales están en [`docs/diseno-visual.md`](docs/diseno-visual.md).

**Pendiente de la parte del Plan 2**

- **Prueba manual en iPhone/iPad.** El autor probó el Plan 2 con `pnpm dev` en Edge y Chrome
  (D11): sesiones, pistas y guardado bien. `createIdbAdapter`, `createSpeechPlayer` y
  `downloadInBrowser` reales solo se han comprobado a mano en Chromium, y ningún test las
  cubre en un navegador de verdad.
- **Comprobar en navegador que instrucción y palabra suenan seguidas sin cortarse** al empezar
  una evaluación (la palabra suena sola desde la revisión final, I1). Solo se probó con audio
  falso y por lectura del código.
- **`importState` movido al Plan 6 (D9).** Existe en `persist.ts` pero no está cableado al
  store ni a la interfaz. Contrato fijado: un import deliberado del adulto sustituye `doc`
  entero y quita `readFailed` (y `recovered`); si no, la app quedaría bloqueada sin escribir.
- **Tras un fallo de lectura de IndexedDB no se guarda nada** (I3): `guardar` no escribe
  mientras `readFailed`, para no pisar un documento bueno que solo no se pudo leer. «Reintentar»
  solo desbloquea si el disco está vacío; con un documento real no hace nada visible (no hay
  fusión de documentos) y hay que recargar la app. El niño sigue jugando en memoria y el
  adulto puede exportar desde `SaveWarning`.

**Plan 2, interfaz y accesibilidad** (la base visual del Plan 3 pudo resolver alguna; no se
ha reverificado)

- `EndScreen` con 0 estrellas pinta un `<span>` vacío con `aria-label`; hoy el motor no
  genera una corrida vacía, y un plan de 0 ejercicios haría `isSessionOver` verdadero al
  empezar y registraría 0 estrellas.
- Parpadeo en blanco al cerrar la sesión (`endSession` pone `run: null` antes del guardado).
- Objetivos táctiles por debajo de 72 px: los círculos del modelo (56 px) y el icono de
  `SaveWarning` (~36 px, y su panel sin `aria-modal` ni gestión de foco).
- El tambor usa `onClick` y no `pointerdown` (posible latencia en iPad), mide 224 px fijos
  (~576 px de alto total, con scroll en móvil apaisado), y `Presentation` no tiene botón de
  repetir.
- Con solo `recovered`, «Reintentar» de `SaveWarning` no cambia nada visible (el store no
  limpia `recovered`); con dos guardados en vuelo, un fallo antiguo puede pisar un
  `saveFailed: false` más nuevo (el disco queda bien, solo el aviso).
- `void endSession().then(...)` y `void presentationDone()` sin `.catch`; en StrictMode la
  instrucción puede sonar dos veces.

**Plan 2, motor, audio e imágenes**

- `planReviewOnly` repite unas 30 líneas de `makeExercise`; si cambia la regla del nivel de
  distractor, los dos modos divergen.
- `createSilentPlayer` y un `synth` indefinido no llaman a `onSegment`, así que la interfaz no
  debe depender de él para avanzar. El listener de `voiceschanged` no se quita y `AudioPlayer`
  no tiene `dispose` (un reproductor por aplicación). `startsWith("es")` aceptaría códigos
  de tres letras.
- Emoji de respaldo (ya solo salen si la ilustración no carga): los de Unicode 13/15 (🪽 🫏 🫓 🫖 🛖) pueden salir como cuadrado en
  Android/Windows antiguos, `👎` (mala) y `😠` (malo) rozan el principio de «sin mensajes
  negativos», `🍼` para «pipa» es dudoso, y el invariante I1 no detecta entradas huérfanas.
- Huecos de test conocidos (mutaciones supervivientes): `startSession` con `seed`,
  `masteredAt === now`, el orden de `run.resolutions`, el desempate `lastSessionIndex` del
  modo normal, y un invariante que solo mire el primer elemento de `introduces`.
  `boundaries.test.ts` no detecta `require(...)`.

**Plan 3 (abiertas al cerrar la rama; el detalle está en el registro, busca `minor (deferred)`)**

- **Ilustraciones, a criterio del autor:** `una` (uña) parece una mano con uñas pintadas y puede
  leerse como «mano»; `asa` es una taza entera y puede leerse como «taza»; `sumo` va con el
  torso descubierto; iglú y velo tienen poco contraste sobre `--color-calm` a 96 px. `mama`,
  `mimo`, `pelo`, `uno`, `escoba` y `ala` llegan al borde del cuadro, el estilo es mixto
  (personas más planas que los objetos 3D) y `mala` y `tomate` tienen rojo dominante. `pipa` es
  un biberón a propósito (en República Dominicana «pipa» es el biberón).
- **`scripts/optimizar-ilustraciones.py`:** solo cuenta 65 PNG y no valida los nombres contra
  el currículo (un sobrante no lo caza nadie), y un fallo a mitad deja WebP parciales en
  `public/`. Tampoco se ha corrido contra `/mnt/c` ni comprobado el precacheo de la PWA.
- **Navegadores sin probar:** Safari iOS y Firefox, sobre todo el arrastre de `build` (solo se
  verificó en Chromium); la lista de verificación del Plan 6 debe incluir tocar y arrastrar.
- **Sin medir en 360 × 640:** scroll con tres imágenes (presentación de `phoneme:a` e
  `initial-sound`), la cabecera de `hear-it`, y la bandeja de `build` con unas 13 piezas de
  72 px. La mano de `OptionCard` marcada solapa unos 17 px la tarjeta y en `compact` puede
  rozar la letra. El aspecto de los iconos dentro de `BigButton`/`ReplayButton` tampoco se ha
  visto en un navegador. El emoji de respaldo de `Picture` (~128 px) ocupa menos que la imagen
  de 160 px: pequeño salto de layout.
- **Audio y presentaciones:** si `audio.play` nunca resuelve ni rechaza, las presentaciones de
  `hear-it`, `listen-tap` y `rhyme` (y la `sequence` de `ChoiceEvaluation`) dejan al niño sin
  avanzar; hay que comprobar que el `AudioPlayer` real siempre resuelve o rechaza.
  `PAUSE_MS` de `listen-tap` puede bajar a 0 sin que falle ningún test.
- **Motor y duplicaciones:** el patrón `letter:${phoneme}` está repetido en `answers.ts` y
  `planner.ts` (un `letterIdOf` lo unificaría); `picture:${item.text}` y la partición «inicio +
  resto» (`onsetRequest`) están escritas en línea en `hint-effects.ts` y las presentaciones;
  `expectedPieces` y `reducedPieces` lanzan ante datos incoherentes; M11 barre 200 semillas por
  unidad (determinista, pero de cobertura probabilística).
- **Huecos de test:** `layout="grid"`, la cancelación de la secuencia por `token` y
  `ReplayButton disabled={locked}` en `choice/`; `pointercancel`, `attemptKey` durante un
  arrastre y el `dimmed` del resto de piezas en `build`; el rung 2 de `PlantillasDev.test.tsx`
  (herramienta de desarrollo); `jugarSesion` en `Phase0.integration.test.tsx` solo exige
  `evaluaciones > 0`; `PAUSE_MS`.
- **`build` no sale por la vía normal:** el planificador aún no saca `build` en `phase2:m`, así
  que `build/SessionFlow.test.tsx` inyecta la corrida con `store.setState` (R24). Cuando la
  unidad sea jugable (Planes 4 y 5), sustituir la inyección.
- **Tarea 6:** un `pkill` de procesos `next` en el puerto 3000 durante la implementación y la
  revisión; si el autor tenía un `pnpm dev` en marcha, hay que relanzarlo.
- **Para el Plan 6:** el mapa no enseña ningún avance hasta completar una unidad (5-6 sesiones
  en `phase0:clap`), y ni el niño ni el adulto ven que se guarda.

**Plan 2, tests y limpieza**

- T4: el test de `app-store.test.ts` «abandonar restaura progress desde el documento»
  exagera lo que comprueba (renombrarlo); la guarda `isSessionOver` de `endSession` duplica
  la de `finishSession`, y `beginSession`, `answer` y `presentationDone` no comprueban
  `status === "loading"`; los tests del puente se pasaron a verde antes de verificar el rojo
  (sin efecto duradero).
- T5: `current` en `speakOne` es de solo escritura a propósito (retiene la utterance contra
  el GC) y falta un comentario que lo diga para que nadie lo borre por muerto.
- T6: el test del nombre del fichero de exportación no discrimina fecha local de UTC con
  `TZ=UTC`.
- T7: la guarda `alive` tras `feedback:retry` es defensiva y sin efecto observable.
- T8: `Presentation.tsx:906` `onClick={onDone}` sin guardia propia, neutralizada por `busy`
  de `SessionScreen`.
- T1 (proceso, trivial): el mensaje del commit sobre T1.1 es inexacto: el test falló primero
  por la función inexistente, no por las unidades de Fase 2.

**Plan 1**

- Aviso de peer dependency: vitest 5 pide `@types/node@^22` y está instalado `^20`.
- Vitest avisa de que carga `vitest.config.ts` como CommonJS.
- `biome check src` no cubre los ficheros de configuración de la raíz.
- El orden topológico de `content/index.ts` es O(V²); irrelevante con 21 unidades.
- El algoritmo de no adyacencia del planificador tiene una receta estándar más simple
  documentada en el registro (tarea 17).
- `rewards.unlockedAt` no valida que las claves sean logros reales ni que las fechas sean
  ISO.
- `createMemoryAdapter` guarda por referencia, mientras que el adaptador real serializa.
- Las fixtures de tipos solo protegen con `pnpm typecheck`; `vitest` no comprueba tipos.

---

## Cómo se trabaja en este repo

Las reglas completas para agentes están en `CLAUDE.md`. En resumen:

- **Cada plan se escribe con `superpowers:writing-plans`** y **se ejecuta con
  `superpowers:subagent-driven-development`**: un agente implementador por tarea, una
  revisión sobre su diff, rondas de corrección y re-revisión acotada. Al final, una
  revisión de toda la rama.
- **Prueba por mutación en cada revisión de lógica.** Es la técnica que más defectos reales
  ha encontrado aquí.
- **Modo económico, «lento pero seguro»:** la sesión en `/model opus` solo para escribir el
  plan y en `/model sonnet` para ejecutarlo; subagentes en Sonnet salvo la revisión final de
  rama, en Opus. Subagentes en
  secuencia, sesión nueva cada 2-3 tareas, planes con contratos y tests en vez de código
  completo, revisión proporcional al riesgo y máximo 2 rondas de corrección. Detalle en
  `CLAUDE.md`.
- **El coordinador nunca implementa ni commitea código.**
- TDD, TypeScript estricto (`any` solo en el borde de `JSON.parse`, validado con Zod al
  momento), y `test`, `typecheck` y `lint` en verde antes de cada commit.
- Commits con Conventional Commits, en español.
- Los principios pedagógicos del spec (§2) no son negociables en el código: sonido y no
  nombre, sin castigos, pistas de menos a más, dominio antes de avanzar.

Para Claude Code hace falta el plugin **superpowers** (del marketplace oficial
`claude-plugins-official`), porque las skills anteriores vienen de él:

```
/plugin install superpowers@claude-plugins-official
```
