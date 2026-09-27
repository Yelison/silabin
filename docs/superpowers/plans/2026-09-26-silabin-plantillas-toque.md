# Silabín Plan 3: plantillas de toque (`rhyme`, `initial-sound`, `hear-it`, `listen-tap`, `build`) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** que la Fase 0 entera (`clap`, `rhyme`, `initial`, `hear-it`) se juegue de punta a
punta, que `listen-tap` y `build` queden construidas y visibles en una ruta de desarrollo, y
que toda la interfaz se monte sobre una base visual mínima (tokens y componentes) pensada para
niños de 3 a 6 años.

**Architecture:** el motor gana una sola fuente de la respuesta esperada (`expectedAnswer`,
`expectedPieces` y `reducedPieces`) y las piezas de `build`. El contenido gana las claves de
audio de las pistas (`ending:`, `stretch:`, `stretch-in:`), con invariantes que las comprueban.
La interfaz añade una evaluación de elección compartida (`features/session/choice/`) que usan
`rhyme`, `initial-sound`, `listen-tap` y `hear-it`, y una vista propia para `build`. Las pistas
se ejecutan según `feedback.hint.action`, como en `count-syllables`.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19.2.8, TypeScript estricto, Tailwind 4,
Zod 4, Zustand 5, Vitest 5 + jsdom + Testing Library, Biome 2. `next/font/google` (Andika),
sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md` (§2, §4 Plantillas y Contenido
v1, §5 Pistas, §9). Registros: `docs/superpowers/2026-09-26-plan-2-registro.md` (R6, R13, R14)
y el de este plan, `docs/superpowers/2026-09-26-plan-3-registro.md`.

**Modo económico (CLAUDE.md):** el plan fija contratos, casos de test y criterios de
aceptación. No trae la implementación: el implementador la escribe con TDD. Solo hay código
donde un detalle es delicado.

---

## Decisiones tomadas antes de escribir el plan (2026-09-26)

| # | Decisión | Dónde |
|---|---|---|
| D8 | **Estilo visual: base mínima dentro del Plan 3.** Tokens de color, tipografía, radios y tamaño de objetivo en `globals.css`, y componentes base. La identidad final (paleta definitiva, ilustraciones) llegará después y cambiará los tokens sin tocar las vistas | Tarea 1 |
| D9 | **`importState` va al Plan 6** con este contrato fijado: un import deliberado del adulto sustituye `doc` entero y quita `readFailed` (y `recovered`), porque el adulto ha elegido qué documento vale. Hasta entonces no se cablea | Tarea 6 (README) |
| D10 | **Las 5 plantillas.** Tras este plan solo es jugable la Fase 0: todas las unidades de Fase 1 y 2 declaran `trace` y `say-it` (`phase1.ts:44-47`, `phase2.ts:116-121`), y el mapa las atenúa hasta los Planes 4 y 5. `listen-tap` y `build` se prueban con tests y con la ruta `/dev/plantillas`, que solo existe en desarrollo | Tareas 4-6 |
| D11 | **La prueba manual del Plan 2 la hace el autor antes de ejecutar este plan.** El coordinador no despacha la Tarea 1 hasta que el autor la confirme | Notas para el coordinador |

### Investigación que respalda D8 (resumen; el detalle va a `docs/diseno-visual.md` en la Tarea 1)

- **Objetivos táctiles:** NN/g recomienda al menos 2 × 2 cm para niños de 3 a 5 años, cuatro
  veces el de un adulto, y espacio entre botones para no tocar el de al lado. El spec pide
  ≥ 72 px, que es el mínimo; las opciones de este plan son mucho mayores (≥ 128 px).
- **Arrastrar es difícil a esa edad** («precise dragging … to a specific spot was hard for
  kids»). NN/g recomienda ofrecer tocar **o** arrastrar. Por eso `build` acepta las dos cosas
  (Ruling previsto R15).
- **Color:** los tonos cálidos y poco saturados sostienen la atención. Los primarios saturados
  en toda la pantalla sobreestimulan. Los colores vivos se reservan para lo interactivo y las
  celebraciones. Los estados nunca se marcan solo con color (spec §9): cada estado lleva forma,
  borde o movimiento.
- **Tipografía:** para lectores que empiezan, `a` y `g` de un solo piso, como las que aprenden
  a escribir. Andika (SIL, pensada para alfabetización y recomendada por USAID para materiales
  de lectura inicial) está en Google Fonts y cubre las tildes y la ñ.
- Fuentes: [NN/g, desarrollo físico](https://www.nngroup.com/articles/children-ux-physical-development/),
  [NN/g, UX para niños](https://www.nngroup.com/reports/children-on-the-web/),
  [Lyu 2022, color en interfaces infantiles](https://onlinelibrary.wiley.com/doi/abs/10.1002/col.22726),
  [color en educación infantil](https://www.mcmillanpazdansmith.com/ideas/a-palette-for-learning-the-role-of-color-in-early-childhood-education-design/),
  [tipografía infantil](https://type.today/en/journal/childrens_book_typography),
  [fuentes de Google para primeros lectores](https://www.colourmylearning.com/2025/08/best-child-friendly-print-fonts-from-google-fonts-for-early-readers/).

## Global Constraints

- Principios del spec §2, sin excepción: sonido y no nombre (una letra suena `phoneme:x`,
  nunca su nombre); sin castigos ni mensajes negativos; fallo neutro (`feedback:retry`) de menos
  de 2 s; pistas de menos a más; presentación antes de evaluar.
- Sin texto para el niño: instrucciones con audio e icono. Texto visible solo para lo que se
  lee (letras, sílabas y palabras objetivo) y para el adulto (`aria-label`, avisos).
- Objetivos táctiles ≥ 72 px (opciones ≥ 128 px), separados ≥ 16 px; un solo gesto por
  ejercicio; sin scroll dentro de un ejercicio en 360 × 640 vertical ni en 1024 × 768 apaisado.
- Todo audio pasa por el `AudioPlayer`. **La interfaz no depende de `onSegment` ni de que un
  `play` suene** para avanzar ni para desbloquear la entrada (reproductor silencioso incluido).
- Animaciones solo con `motion-safe:`. Estados con forma o movimiento además de color.
- Colores y fuentes **solo a través de los tokens** de la Tarea 1 (`bg-surface`,
  `text-ink`…). Nada de `bg-amber-400` suelto en código nuevo.
- `features/` y `components/` importan del motor **solo** `@/engine`. **Nunca calculan la
  respuesta correcta**: la marcan con lo que devuelve el motor (`expectedAnswer`,
  `expectedPieces`, `reducedPieces`).
- `engine/` y `content/` no importan React ni tocan el DOM.
- Next.js 16: antes de tocar `layout.tsx`, fuentes o rutas nuevas, lee
  `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`, la guía de fuentes de
  `01-getting-started/` y la de `page.tsx`/`notFound` en `03-api-reference/`.
- TDD; `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit; Conventional
  Commits en español con el porqué. Tests de interfaz con `// @vitest-environment jsdom`.

## Review Focus

1. **Toques sobre una opción atenuada, o durante el audio de una pista.** No cuentan como
   respuesta, porque la pista 1 dijo «quedan dos». → Tarea 3, casos X5 y X6.
2. **Tercer rung: el niño toca una opción que no está marcada.** No pasa nada: ni `onAnswer`
   ni `onModelDone`. Solo la marcada cierra, y el rung 3 garantiza el acierto. → Tarea 3, X9;
   Tarea 5, B9.
3. **`build` aporreado:** tocar piezas muy rápido o seguir tocando tras llenar las dos casillas
   da un solo `onAnswer`, y quitar una pieza colocada antes de completar funciona. → Tarea 5,
   B3-B5.
4. **Navegador sin voz (reproductor silencioso, `onSegment` que nunca llega):** las pistas
   «sonar», que marcan opción por opción mientras suenan, terminan y dejan la entrada
   desbloqueada. → Tarea 3, X8.
5. **`hear-it` cuya respuesta es «no»:** el modelo marca el botón «no». Una vista que
   supusiera «sí» enseñaría lo contrario. → Tarea 4, H5.
6. **Una ilustración que no carga** (sin red y aún sin service worker, o un fichero que
   falta): la tarjeta no puede quedarse vacía, porque el niño no sabría qué nombrar. Se ve el
   emoji de respaldo. → Tarea 5b, I3 e I7.

---

## Estructura de archivos

```
docs/diseno-visual.md                crear: investigación, tokens y reglas (T1)
src/
  app/globals.css, layout.tsx        modificar: tokens, Andika, tema claro fijo (T1)
  app/dev/plantillas/page.tsx        crear: vista de desarrollo de las plantillas (T6)
  components/
    BigButton.tsx                    modificar: tokens (T1)
    OptionCard.tsx (+ test)          crear: tarjeta de opción con estados (T1)
    ReplayButton.tsx                 crear: botón de volver a oír (T1)
    Picture.tsx                      crear: imagen (emoji); sustituye a `Imagen` de parts.tsx (T1);
                                     ilustración WebP con emoji de respaldo (T5b)
    Icon.tsx (+ test)                crear: iconos de interfaz (T5b)
  images/index.ts (+ test)           modificar: src de la ilustración y slugFor (T5b)
  content/
    audio-keys.ts (+ test)           crear: endingKey, stretchKey, stretchInKey, rimeOf, textos (T2)
    audio-manifest.ts                modificar: claves de pistas y ui:hear-yes/no (T2)
    phase0.ts                        modificar: sílabas en los ítems de hear-it (T2)
    invariants.test.ts               modificar: rimas, audio de letras, respuesta evaluable (T2)
  engine/
    answers.ts (+ test)              crear: expectedAnswer, expectedPieces, reducedPieces (T2)
    planner.ts                       modificar: piezas de build (T2)
    session.ts                       modificar: checkAnswer usa expectedAnswer (T2)
    index.ts                         modificar: reexportar lo nuevo (T2)
  features/session/
    registry.ts                      modificar: registrar cada plantilla (T3-T5)
    count-syllables/*                modificar: tokens y Picture (T1)
    choice/ChoiceEvaluation.tsx (+ test)   crear: evaluación de elección compartida (T3)
    choice/hint-effects.ts (+ test)        crear: acción de pista → efecto (T3)
    rhyme/Presentation.tsx, Evaluation.tsx (+ tests)          (T3)
    initial-sound/Presentation.tsx, Evaluation.tsx (+ tests)  (T3)
    hear-it/Presentation.tsx, Evaluation.tsx (+ tests)        (T4)
    listen-tap/Presentation.tsx, Evaluation.tsx (+ tests)     (T4)
    build/Presentation.tsx, Evaluation.tsx (+ tests)          (T5)
  features/Phase0.integration.test.tsx   crear: la Fase 0 de punta a punta (T6)
public/images/palabras/*.webp, public/icons/ui-*.png   crear: assets (T5b)
scripts/optimizar-ilustraciones.py   crear: PNG → WebP 384 px (T5b)
```

---

## Tarea 1: Base visual mínima

**Riesgo:** estilos y configuración. Revisión de cumplimiento, sin mutación, salvo el test de
estados de `OptionCard` y la elección de voz (lógica de `audio/`, con mutaciones; ver el final
de la tarea).

**Files:**
- Create: `docs/diseno-visual.md`, `src/components/OptionCard.tsx` (+ test),
  `src/components/ReplayButton.tsx`, `src/components/Picture.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/BigButton.tsx`,
  `src/features/session/count-syllables/*.tsx` (y `parts.tsx`: `Imagen` → `Picture`),
  `SessionScreen.tsx`, `EndScreen.tsx`, `MapScreen.tsx`, `StartScreen.tsx`, `adult/*.tsx`
  (solo clases de color y fuente)

**Tokens** (en `@theme` de Tailwind 4; los valores son la propuesta inicial, y el contraste se
comprueba con AA ≥ 4.5:1 para `ink` sobre `surface` y ≥ 3:1 para bordes de estado):

| Token | Uso | Valor inicial |
|---|---|---|
| `--color-surface` | fondo de pantalla, crema cálido poco saturado | `#FFF8EC` |
| `--color-card` | fondo de tarjetas y opciones | `#FFFFFF` |
| `--color-ink` | letras, sílabas, iconos | `#2B2A33` |
| `--color-ink-soft` | texto de adulto y controles secundarios | `#6B6772` |
| `--color-action` | lo que se toca: tambor, botón siguiente | `#F5B83D` |
| `--color-action-ink` | contenido sobre `action` | `#3A2A00` |
| `--color-calm` | borde y fondo de opciones en reposo, azul suave | `#DCEBFA` / borde `#7FA7D6` |
| `--color-mark` | opción marcada por el modelo (con borde grueso y pulso) | `#FFE27A` / borde `#C98A00` |
| `--color-celebrate` | solo celebraciones y estrellas | `#FF9F1C` |
| `--radius-card` | tarjetas y botones | `1.5rem` |
| `--spacing-target` | lado mínimo de una opción | `8rem` (128 px) |
| `--font-reading` | letras, sílabas y palabras que el niño lee | Andika (`next/font/google`, pesos 400 y 700) |
| `--font-sans` | interfaz del adulto | la fuente del sistema actual |

- **Sin rojo ni verde de «bien/mal» en ninguna parte.** El fallo es neutro (spec §2).
- **Tema claro fijo:** se quita el bloque `prefers-color-scheme: dark` y se declara
  `color-scheme: light`. Una pantalla infantil que cambia de colores según el sistema del
  adulto confunde, y la paleta está pensada para fondo claro (Ruling previsto R16).

**`OptionCard`** (`components/`, sin lógica de pedagogía):

```ts
export type OptionState = "idle" | "dimmed" | "pulsing" | "marked";
type Props = {
	state: OptionState;
	disabled: boolean;          // locked o atenuada: no llama a onSelect
	"aria-label": string;       // para el adulto: nombre de la opción
	onSelect(): void;
	children: ReactNode;        // Picture, letra o sílaba
};
```

Estados visibles sin depender del color: `dimmed` = opacidad 30 % y escala 0,9; `pulsing` =
`motion-safe:animate-pulse` y borde de 4 px; `marked` = fondo `mark`, borde de 8 px y un icono
de mano 👆 en la esquina. `data-state` en el botón, para tests. `aria-disabled` cuando está
deshabilitada; se sigue pintando.

**Casos de test de `OptionCard`:**

| Id | Entrada | Esperado |
|---|---|---|
| V1 | `state: "idle"`, toque | `onSelect` una vez; `data-state="idle"` |
| V2 | `disabled: true`, toque | `onSelect` no se llama; `aria-disabled="true"` |
| V3 | `state: "marked"` | `data-state="marked"` y el icono de mano presente (no solo color) |
| V4 | `state: "dimmed"` | `data-state="dimmed"` |

**`docs/diseno-visual.md`:** la investigación de D8 con sus fuentes, la tabla de tokens, las
reglas (sin rojo/verde, estados con forma, colores vivos solo en lo interactivo y las
celebraciones) y que la identidad final queda pendiente: paleta definitiva, ilustraciones en
lugar de emoji y compañero.

**Aceptación:** `grep -rn "amber-\|yellow-\|gray-" src --include=*.tsx` no devuelve nada fuera
de los tests; los tests existentes siguen en verde sin tocar sus aserciones de
comportamiento; `pnpm build` en verde.

**Commit:** `feat(ui): tokens y componentes base pensados para niños de 3 a 6 años`.

### Elección de la voz más natural del dispositivo (añadido el 2026-09-26 a petición del autor)

**Files:** Modify `src/audio/speech-player.ts` (`pickVoice`, exportada para test) y
`src/audio/speech-player.test.ts`.

Hoy `pickVoice` coge la primera voz del idioma del acento y, si no hay, la primera en español.
Los dispositivos traen voces mucho mejores que la primera de la lista: en iOS, las
«mejoradas» o «premium»; en Edge, las de Microsoft «Natural», que van por la red. Hasta que
lleguen los audios pregrabados, elegir bien es la mejora de voz más barata.

**Contrato:** el orden sigue siendo **primero el acento, después la calidad**. Una voz
estándar `es-MX` gana a una «Natural» `es-US` con el acento `mx`, porque el acento que oye el
niño importa más que la calidad (Ruling previsto R19). Dentro de cada grupo (idioma exacto; luego
cualquier `es`), gana la de mayor puntuación, y en empate, la primera de la lista:

- +2 si el nombre casa con `/natural|neural|premium|enhanced|mejorad/i`;
- −2 si es una voz de fantasía de Apple (`/\b(eddy|flo|grandma|grandpa|abuel[oa]|reed|rocko|sandy|shelley)\b/i`),
  que suenan raras para enseñar sonidos.

**Casos de test:**

| Id | Voces (en este orden), acento | Esperado |
|---|---|---|
| A8 | `es-MX "Paulina"`, `es-MX "Paulina (Mejorada)"`; `mx` | la mejorada |
| A9 | `es-MX "Microsoft Dalia Online (Natural)"` tras `es-MX "Microsoft Sabina"`; `mx` | Dalia |
| A10 | `es-US "Paloma (Natural)"`, `es-MX "Paulina"`; `mx` | Paulina (el acento manda) |
| A11 | `es-MX "Eddy"`, `es-MX "Paulina"`; `mx` | Paulina |
| A12 | solo `es-ES "Mónica (Premium)"` y `es-ES "Jorge"`; `do` | Mónica (grupo `es`, gana la calidad) |
| A13 | solo `es-MX "Grandma"`; `mx` | Grandma (penalizar no es excluir: mejor una voz que ninguna) |
| A14 | los casos A1-A7 actuales | siguen en verde sin cambios |

**Mutaciones:** (1) ordenar por calidad antes que por acento; (2) excluir las voces de fantasía
en vez de penalizarlas; (3) romper el empate por la última y no por la primera.

**Commit aparte:** `feat(audio): la voz del dispositivo más natural del acento, mientras no haya audios grabados`.

### Pausa entre sílabas con voces de red (añadido el 2026-09-26, lo vio el autor en Edge)

**Por qué:** en Edge las voces «Natural» se generan en la red y cada sílaba (`by-syllable` y
`beats` en `perform`) espera su propia respuesta. A la pausa de `SYLLABLE_GAP_MS` (350 ms) se
le suma esa espera, y el autor oye «ga ····· to» (en Chrome no pasa). Con la elección de voz
de arriba, que prefiere las «Natural», iría a peor. Además, la luz (`onSegment`) y el golpe
(`beat`) salen antes de pedir la sílaba, así que en Edge se adelantan a la voz.

**Contrato:**
- `speakOne` mide la **latencia de arranque**: el tiempo entre `synth.speak` y el primer
  `onstart` de esa utterance. Si `onstart` no llega, la latencia es 0.
- La pausa antes de la sílaba `i` es `max(0, SYLLABLE_GAP_MS − latencia de la sílaba i−1)`.
  Es una estimación: la red tarda parecido en sílabas seguidas.
- `onSegment(i)` y `beat()` se lanzan en el `onstart` de la sílaba `i`, así que la luz y el
  golpe coinciden con la voz. Si `onstart` no llega en 250 ms (`SEGMENT_FALLBACK_MS`), se
  lanzan igual, **una sola vez**. Nunca bloquean la cola (spec: la interfaz no depende de
  `onSegment`).
- `style: "normal"` no cambia.

**Casos de test** (el `synth` falso gana un retraso configurable antes de `onstart`):

| Id | Entrada | Esperado |
|---|---|---|
| A15 | `by-syllable` `["ga","to"]`, latencia 0 | pausa de 350 ms entre sílabas (como hoy) |
| A16 | Latencia de 400 ms por sílaba | pausa de 0 ms tras la primera; el total no pasa de 400 + habla + 400 + habla |
| A17 | Latencia de 200 ms | pausa de 150 ms |
| A18 | `beats` con latencia de 300 ms | `beat` y `onSegment(0)` en el `onstart`, no antes |
| A19 | `onstart` que nunca llega | `onSegment` y `beat` a los 250 ms, una vez cada uno; la cola sigue |
| A20 | `onstart` que llega a los 300 ms (tras el respaldo) | no se repiten `onSegment` ni `beat` |
| A21 | `stop()` durante la espera de `onstart` | ni `onSegment` ni `beat` tardíos |

**Mutaciones:** (1) restar la latencia de la sílaba actual y no la de la anterior; (2) dejar que
la pausa sea negativa (`setTimeout` negativo = 0, pero el test de A16 mide el orden); (3)
lanzar `beat` dos veces cuando `onstart` llega tras el respaldo; (4) no limpiar el respaldo en
`stop()`.

**Commit aparte:** `fix(audio): la pausa entre sílabas descuenta la espera de las voces de red`.

---

## Tarea 2: Motor y contenido para las plantillas nuevas

**Riesgo:** lógica del motor y contrato motor-interfaz. Revisión completa con mutaciones.

**Files:**
- Create: `src/engine/answers.ts` (+ test), `src/content/audio-keys.ts` (+ test)
- Modify: `src/engine/session.ts`, `src/engine/planner.ts` (+ tests), `src/engine/index.ts`,
  `src/content/phase0.ts`, `src/content/audio-manifest.ts` (+ test),
  `src/content/invariants.test.ts`

**Por qué:** hoy `build` no tiene opciones y los ítems `syllable` no llevan `task`, así que
`checkAnswer` **lanzaría** a mitad de un ejercicio de `build` (la trampa 9 en otra forma).
Además, las pistas de las plantillas nuevas piden audios que no existen: el final de una
palabra («-ato»), un sonido alargado («mmma») o una vocal alargada dentro de la palabra
(«paaato»).

**Interfaces (Produces, todo reexportado por `@/engine`):**

```ts
// engine/answers.ts: la única fuente de la respuesta esperada
export function expectedAnswer(exercise: PlannedExercise, item: Item): string | null;
//   correctOptionId ?? item.task?.answer ?? (templateId === "build" ? item.text : null)
//   null solo para las plantillas con evaluation "trace" | "voice".
export function expectedPieces(exercise: PlannedExercise, content: CurriculumIndex, item: Item): string[];
//   build: ids de las piezas correctas en orden, p. ej. ["letter:m", "letter:a"]. [] en el resto.
export function reducedPieces(exercise: PlannedExercise, content: CurriculumIndex, item: Item): string[];
//   build, rung 1: las piezas que siguen activas: la consonante correcta y las 5 vocales.

// content/audio-keys.ts
export function rimeOf(word: string): string;             // "gato" → "ato", "ratón" → "ón", "sol" → "ol"
export function endingKey(pictureId: string): string;     // "picture:gato" → "ending:gato"
export function stretchKey(itemId: string): string;       // "syllable:ma" → "stretch:syllable:ma"
export function stretchInKey(itemId: string): string;     // "oral:hear:a-pato" → "stretch-in:a-pato"
export function picturesStartingWith(phoneme: string, n: number): Item[]; // en orden de `pictures`
```

- `checkAnswer` usa `expectedAnswer` y lanza solo si es `null`, con el mismo mensaje de hoy.
- **Piezas de `build`** (en `buildOptions` del planificador): `optionIds` = las 5 vocales
  (`letter:a`…`letter:u`) más las consonantes cuya letra ya se ha presentado (`seen`) más la
  del ítem, sin duplicados y mezcladas con el `rng`; `correctOptionId: null`. Nunca b/d/p/q
  juntas (`isForbiddenDistractor`).
- `rimeOf`: con tilde, desde la vocal acentuada; sin tilde y terminada en vocal, n o s, desde
  la penúltima vocal; si no, desde la última vocal. Se compara sin tildes.
- Textos del manifiesto: `ending:<w>` → `rimeOf(w)`; `stretch:<id>` → sonido alargado del
  primer fonema más el resto (`letter:a` → «aaa», `syllable:ma` → «mmma», `syllable:pa` →
  «pa»); `stretch-in:<f>-<w>` → la palabra con la primera aparición de la vocal alargada
  (`a-pato` → «paaato»). Se crean solo para los ítems que las usan: `ending:` para el objetivo
  y las opciones de cada ítem de rima; `stretch:` para letras, sílabas y palabras de
  `listen-tap`; `stretch-in:` para los ítems de `hear-it` cuya respuesta es «si».
- `uiAudio` añade `ui:hear-yes` («Si lo oyes, toca aquí.») y `ui:hear-no` («Si no lo oyes,
  toca aquí.»).
- Los ítems de `hear-it` llevan `syllables` (como los de `clap`), para la pista «despacio».

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| M1 | `expectedAnswer` en rhyme / initial-sound / listen-tap | `correctOptionId` |
| M2 | `expectedAnswer` en hear-it (`oral:hear:a-sol`) | `"no"` |
| M3 | `expectedAnswer` en build de `syllable:ma` | `"ma"` |
| M4 | `expectedAnswer` en trace / say-it / read-word | `null`; `checkAnswer` lanza igual que hoy |
| M5 | `checkAnswer` en build con `"ma"` / `"am"` | `correct` / `wrong` |
| M6 | Plan de `phase2:m` con build | `optionIds` = 5 vocales + `letter:m`; `correctOptionId` null |
| M7 | `expectedPieces` / `reducedPieces` en `syllable:lo` con `m` y `l` vistas | `["letter:l","letter:o"]` / `letter:l` + 5 vocales, sin `letter:m` |
| M8 | `rimeOf`: gato, pato, ratón, limón, sol, pan, luna, cuna | ato, ato, on, on, ol, an, una, una |
| M9 | Invariante: en cada ítem de rima, `rimeOf(objetivo) === rimeOf(correcta)` y ≠ `rimeOf(distractor)` | pasa con el contenido actual |
| M10 | Invariante: toda letra y todo fonema tienen `audioKey` que empieza por `phoneme:` | pasa (sonido, no nombre) |
| M11 | **Invariante de la trampa 9:** para cada unidad, cada plantilla declarada de evaluación `tap`/`taps`/`drag` y cada ítem introducido que la plantilla acepta, se planifica el ejercicio con semilla fija y `checkAnswer(ex, item, expectedAnswer(ex, item)!)` da `correct` sin lanzar | pasa |
| M12 | Manifiesto: `ending:gato` = «ato», `stretch:syllable:ma` = «mmma», `stretch-in:a-pato` = «paaato»; sin claves huérfanas | pasa |
| M13 | `picturesStartingWith("a", 3)` | 3 imágenes cuyo `phonemes[0]` es `a` |

**Mutaciones (3-5):** (1) `expectedAnswer` devuelve `item.task?.answer` antes que
`correctOptionId`; (2) las piezas de build no incluyen la consonante del ítem cuando no está en
`seen`; (3) `rimeOf` sin la regla de la tilde; (4) M11 recorriendo solo la primera plantilla de
cada unidad; (5) `reducedPieces` deja todas las consonantes.

**Commit:** `feat(engine): una sola fuente de la respuesta esperada para que build no lance a mitad de sesión`.

---

## Tarea 3: Evaluación de elección compartida, `rhyme` e `initial-sound`

**Riesgo:** pedagogía (pistas) y contrato. Revisión completa con mutaciones.

**Files:**
- Create: `src/features/session/choice/ChoiceEvaluation.tsx` (+ test),
  `src/features/session/choice/hint-effects.ts` (+ test),
  `src/features/session/rhyme/{Presentation,Evaluation}.tsx` (+ tests),
  `src/features/session/initial-sound/{Presentation,Evaluation}.tsx` (+ tests)
- Modify: `src/features/session/registry.ts` (`templateViews` e `IMPLEMENTED_TEMPLATES`)

**Interfaces:**
- Consumes: `EvaluationProps`/`PresentationProps` (`registry.ts`), `OptionCard`, `Picture`,
  `ReplayButton` (T1), `expectedAnswer`, `endingKey`, `picturesStartingWith` (T2), `useAudio`.
- Produces (lo reutiliza la Tarea 4):

```ts
// choice/hint-effects.ts: puro, sin React
export type ChoiceEffect =
	| { kind: "none" }
	| { kind: "dim"; optionId: string; replay: AudioRequest }        // rung 1 de initial-sound/listen-tap
	| { kind: "replay"; request: AudioRequest }                      // rung 1 de rhyme/hear-it
	| { kind: "sequence"; steps: { optionId: string; request: AudioRequest }[] } // rung 2: pulsa cada opción mientras suena
	| { kind: "pulse"; optionId: string | null; request: AudioRequest } // rung 2 de listen-tap; null en hear-it (solo audio)
	| { kind: "mark"; optionId: string };                            // rung 3
export function choiceEffect(input: {
	action: string; exercise: PlannedExercise; item: Item;
	optionIds: readonly string[];            // en el orden de pantalla; en hear-it, ["si", "no"]
	expected: string;                        // expectedAnswer(exercise, item)
	lookup(id: string): Item | undefined;    // curriculum.items.get, del barril
}): ChoiceEffect;

// choice/ChoiceEvaluation.tsx
export function ChoiceEvaluation(props: EvaluationProps & {
	options: { id: string; label: string; content: ReactNode }[];
	effectFor(action: string): ChoiceEffect;
	layout?: "row" | "grid";
}): JSX.Element;
```

- **Qué distractor se atenúa** en `dim`: el primero de `exercise.optionIds` que no es la
  respuesta. Es determinista porque el motor ya mezcló (Ruling previsto R17).
- `ChoiceEvaluation` guarda `dimmed`, `pulsing` y `marked`. Con cada `attemptKey` nuevo
  **conserva** `dimmed` (la pista 1 sigue valiendo en el intento 3) y limpia `pulsing`. Durante
  una `sequence` la entrada está bloqueada; se desbloquea al resolver el último `play`, aunque no
  suene nada. Con `marked`, solo la opción marcada responde, y llama a `onModelDone`, nunca a
  `onAnswer`.
- **`rhyme`.** Presentación: imagen del objetivo y la que rima, lado a lado; suenan
  `word:<objetivo>`, `word:<rima>` y `ending:<objetivo>`, y las dos tarjetas pulsan juntas;
  después, botón siguiente → `onDone`. Evaluación: 2 `OptionCard` con `Picture`, arriba la
  imagen del objetivo y un `ReplayButton` (`item.audioKey`). Pistas:
  `replay-target-ending` → `replay` de `ending:<objetivo>`; `replay-each-option-ending` →
  `sequence` de `ending:<opción>`; `mark-correct+await-tap` → `mark`.
- **`initial-sound`.** Presentación: con un ítem oral de Fase 0, su imagen (`task.answer`),
  `item.audioKey` (el fonema) y la palabra partida en inicio y resto (`style: "by-syllable"`,
  `syllables: [s[0], s.slice(1).join("")]` de la imagen). Con un ítem `phoneme`,
  `picturesStartingWith(fonema, 3)` presentadas una a una igual. Evaluación: 2-3 opciones de
  imagen y `ReplayButton` del fonema. Pistas: `dim-one-distractor+replay-phoneme` → `dim`;
  `replay-each-option-onset` → `sequence` con la palabra partida de cada opción;
  `mark-correct+await-tap` → `mark`.

**Casos de test** (`AudioPlayer` falso que registra peticiones y resuelve al instante; otro que
nunca llama a `onSegment`):

| Id | Entrada | Esperado |
|---|---|---|
| X1 | `choiceEffect` para cada acción de rhyme e initial-sound | el efecto de la tabla; `mark` con el id de `expectedAnswer` |
| X2 | Acción desconocida | `{ kind: "none" }`, sin excepción |
| X3 | Toque en una opción | `onAnswer(optionId)` una vez |
| X4 | `locked: true` y toque | nada |
| X5 | Tras `dim`, toque en la atenuada | nada; en el siguiente `attemptKey` sigue atenuada |
| X6 | Durante una `sequence`, toque | nada; al acabar la secuencia, un toque sí cuenta |
| X7 | `sequence`: orden de peticiones | `ending:` de cada opción en el orden de pantalla, y cada tarjeta `pulsing` mientras suena la suya |
| X8 | `sequence` con el reproductor sin `onSegment` | termina y la entrada queda desbloqueada |
| X9 | `mark`: toque en otra opción, luego en la marcada | lo primero no hace nada; lo segundo llama a `onModelDone` y nunca a `onAnswer` |
| X10 | Presentación de `oral:rhyme:gato` | `word:gato`, `word:pato`, `ending:gato` en orden; `onDone` solo al tocar siguiente |
| X11 | Presentación de `oral:initial:avion` | fonema y luego `by-syllable` con `["a","vión"]` |
| X12 | Presentación de `phoneme:a` | 3 imágenes que empiezan por a |
| X13 | `isSessionPlayable` con `phase0:rhyme` activa | `true` |

**Mutaciones:** (1) limpiar `dimmed` al cambiar `attemptKey`; (2) `mark` que llama a
`onAnswer`; (3) desbloquear la entrada al empezar la secuencia y no al terminarla; (4) marcar
`optionIds[0]` en vez de `expectedAnswer`.

**Commit:** `feat(ui): rimas y sonido inicial con pistas de menos a más`.

---

## Tarea 4: `hear-it` y `listen-tap`

**Riesgo:** pedagogía y contrato. Revisión completa con mutaciones.

**Files:**
- Create: `src/features/session/hear-it/{Presentation,Evaluation}.tsx` (+ tests),
  `src/features/session/listen-tap/{Presentation,Evaluation}.tsx` (+ tests)
- Modify: `registry.ts`, `choice/hint-effects.ts` (+ test)

**Interfaces:** consume `ChoiceEvaluation` y `choiceEffect` (T3), `expectedAnswer`,
`stretchKey` y `stretchInKey` (T2), `OptionCard` y `ReplayButton` (T1).

- **`hear-it`.** Dos botones grandes, siempre en el mismo sitio: «sí» (👍, izquierda,
  valor `"si"`) y «no» (✋, derecha, valor `"no"`), con `aria-label` «sí» y «no». Nada de 👎 ni
  ❌: «no» no es un error (spec §2). Arriba, la imagen de la palabra y un `ReplayButton` de
  `item.audioKey` (la pregunta). Presentación, sin error: suena la pregunta, luego
  `ui:hear-yes` con el botón «sí» pulsando y `ui:hear-no` con «no» pulsando; después suena la
  palabra (alargada con `stretch-in:` si la respuesta es «si») y se marca el botón correcto;
  el niño lo toca → `onDone`. Pistas: `replay-word-slowly` → `replay` de `word:<w>` con
  `by-syllable` e `item.syllables`; `lengthen-target-phoneme-in-word` → `pulse` sin opción
  (solo audio) de `stretch-in:` si la respuesta es «si», o `word:<w>` normal si es «no»;
  `mark-correct-button+await-tap` → `mark` del botón de `expectedAnswer`.
- **`listen-tap`.** Opciones de texto con `--font-reading`: una letra se pinta con su par
  (minúscula grande y mayúscula al lado, spec §2 «par A/a siempre visible»; Ruling previsto
  R18); sílabas y palabras, en minúscula. Presentación: el ítem grande, suena `item.audioKey`
  dos veces con pausa, botón siguiente → `onDone`. Evaluación: `ReplayButton` de
  `item.audioKey` y 2-3 opciones. Pistas: `dim-one-distractor+replay` → `dim` con
  `item.audioKey`; `pulse-correct+lengthen-first-phoneme` → `pulse` de la correcta con
  `stretch:<itemId>`; `mark-correct+await-tap` → `mark`.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| H1 | Toque en «sí» / «no» | `onAnswer("si")` / `onAnswer("no")` |
| H2 | Presentación de `oral:hear:a-pato` | pregunta, `ui:hear-yes`, `ui:hear-no`, `stretch-in:a-pato`; «sí» marcado; `onDone` solo al tocarlo |
| H3 | Rung 1 | `word:pato` con `by-syllable` `["pa","to"]` |
| H4 | Rung 2 en `oral:hear:a-sol` (respuesta «no») | `word:sol` normal; no se pide ningún `stretch-in:` |
| H5 | Rung 3 en `oral:hear:a-sol` | se marca «no»; tocar «sí» no hace nada |
| H6 | Ningún emoji de la lista `👎 ❌ ✖️ 🚫` en la vista | pasa |
| L1 | Opciones de `letter:a` | cada letra con minúscula y mayúscula; con `font-reading` |
| L2 | Rung 1 | una opción atenuada y `phoneme:a` |
| L3 | Rung 2 en `syllable:ma` | pulsa la correcta y suena `stretch:syllable:ma` |
| L4 | Ningún audio pedido por la vista empieza por `letter:` (nombre de letra) | pasa |
| L5 | `phase0:hear-it` activa | `isSessionPlayable` es `true`; con `phase1:vowel-a` activa sigue en `false` (faltan trace y say-it) |

**Mutaciones:** (1) el modelo de `hear-it` marca siempre «sí»; (2) la pista 2 de `hear-it`
pide `stretch-in:` también cuando la respuesta es «no»; (3) `listen-tap` pinta solo la
mayúscula; (4) la pista 2 de `listen-tap` pulsa `optionIds[0]`.

**Commit:** `feat(ui): oír un sonido dentro de la palabra y tocar lo que suena`.

---

## Tarea 5: `build`, tocar o arrastrar

**Riesgo:** pedagogía, contrato y entrada táctil. Revisión completa con mutaciones.

**Files:**
- Create: `src/features/session/build/{Presentation,Evaluation}.tsx` (+ tests)
- Modify: `registry.ts`

**Interfaces:** consume `expectedPieces`, `reducedPieces` (T2), `OptionCard`, `ReplayButton`.

- Dos casillas (consonante, vocal) arriba y la bandeja de piezas (`exercise.optionIds`) abajo,
  en `--font-reading`. **Tocar** una pieza la lleva a la primera casilla libre; tocar una
  pieza colocada la devuelve a la bandeja. **Arrastrar** (pointer events, `touch-action:
  none`) una pieza y soltarla sobre una casilla también la coloca; soltarla fuera la devuelve.
  Las dos formas llevan al mismo estado (Ruling previsto R15, respaldado por NN/g).
- Al llenar la segunda casilla → `onAnswer(texto1 + texto2)` una sola vez. Tras eso, y con
  `locked`, las piezas no responden. Con cada `attemptKey` nuevo, las casillas se vacían.
- Pistas: `dim-nonmatching-pieces` → se atenúan y se deshabilitan las piezas que no están en
  `reducedPieces` (se mantiene en los intentos siguientes); `pulse-vowel-piece+play-vowel` → la
  pieza `expectedPieces[1]` pulsa y suena su `audioKey`; `highlight-both-pieces-in-order` → las
  dos quedan marcadas con su número de orden (1, 2), y solo se acepta colocarlas en ese orden.
  Al colocar la segunda → `onModelDone`, nunca `onAnswer`.
- Presentación: la consonante y la vocal entran desde los lados y se juntan en el centro
  (`motion-safe:`); suenan `stretch:` de la consonante, `item.audioKey` de la vocal y luego la
  sílaba; botón siguiente → `onDone`.

**Casos de test** (con `fireEvent.pointerDown/Move/Up` para arrastrar):

| Id | Entrada | Esperado |
|---|---|---|
| B1 | Tocar `m`, luego `a` | `onAnswer("ma")` una vez |
| B2 | Arrastrar `m` a la casilla 1 y `a` a la 2 | `onAnswer("ma")` |
| B3 | Cuatro toques rápidos en piezas | un solo `onAnswer`; las piezas sobrantes no entran |
| B4 | Tocar `m`, tocar la `m` colocada, tocar `l`, tocar `a` | `onAnswer("la")` |
| B5 | `locked: true` | ni tocar ni arrastrar colocan nada |
| B6 | Soltar una pieza fuera de las casillas | vuelve a la bandeja; sin `onAnswer` |
| B7 | Rung 1 en `syllable:lo` con `m` en bandeja | `m` atenuada y deshabilitada; sigue así en el intento 3 |
| B8 | Rung 2 | la pieza `o` pulsa y suena `phoneme:o` |
| B9 | Rung 3: tocar la vocal primero, luego la consonante y la vocal | lo primero no coloca; al final `onModelDone`, ningún `onAnswer` |
| B10 | `attemptKey` nuevo | casillas vacías |
| B11 | Presentación de `syllable:ma` | `stretch:letter:m`, `phoneme:a`, `syllable:ma` en orden |

**Mutaciones:** (1) enviar `onAnswer` otra vez al tocar tras llenar; (2) no vaciar las casillas
con el `attemptKey` nuevo; (3) el modelo acepta cualquier orden; (4) la pista 1 atenúa también
la consonante correcta.

**Commit:** `feat(ui): formar sílabas tocando o arrastrando, porque arrastrar cuesta a los 3 años`.

---

## Tarea 5b: Ilustraciones e iconos reales

**Añadida el 2026-09-26** con el autor, después de escribir el plan: las 65 ilustraciones y los
iconos ya están generados. Va antes de la Tarea 6 para que la prueba manual de la Fase 0 se
haga con lo que verá el niño. Estilo decidido: ilustraciones en 3D suave tipo juguete, iconos
planos (`docs/ilustraciones-prompts.md`).

**Riesgo:** contrato entre `images/` y la interfaz, y assets. Revisión de cumplimiento con dos
mutaciones (abajo). No decide pedagogía.

**Origen de los ficheros** (fuera del repo; si la sesión no ve estas carpetas, pídeselas al
autor antes de despachar):
- Ilustraciones: `/mnt/c/Users/Yelisson/Downloads/ilustraciones_lectura_3d_36-65 (1)/img-<palabra>.png`
  (65, 1024 × 1024, RGBA, ~750 KB cada una; nombres sin tildes ni ñ). **No** la carpeta sin
  «(1)»: tiene ficheros truncados.
- Iconos: `/mnt/c/Users/Yelisson/Downloads/ui-icons/ui-<nombre>.png` (256 × 256, RGBA, ~30 KB).
  Se ignora `ui-no-viejo.png`.

**Files:**
- Create: `scripts/optimizar-ilustraciones.py` (Pillow, ya instalado con soporte WebP; sin
  dependencias nuevas en `package.json`)
- Create: `public/images/palabras/<slug>.webp` (65), `public/icons/ui-{replay,next,drum,hand,yes,no}.png`
- Create: `src/components/Icon.tsx` (+ test)
- Modify: `src/images/index.ts` (+ `index.test.ts`), `src/components/Picture.tsx` (+ test)
- Modify (sustituir el emoji de interfaz por `Icon`): `ReplayButton.tsx` (🔊 → `replay`),
  `OptionCard.tsx` (👆 → `hand`), `count-syllables/Evaluation.tsx` (🥁 → `drum`),
  `count-syllables/Presentation.tsx` y los botones «siguiente» de las Presentaciones de T3-T5
  (➡️ → `next`), los botones sí/no de `hear-it` (T4) (→ `yes` / `no`).

**Interfaces:**
- Consume: `imageFor` y `PictureImage` (Plan 2), `Picture` (T1); lo que T3-T5 hayan pintado
  con emoji de interfaz.
- Produce:

```ts
// src/images/index.ts
export type PictureImage = { src: string; emoji: string; alt: string };
export function slugFor(word: string): string;       // "ratón" → "raton", "uña" → "una"
export function imageFor(imageKey: string): PictureImage | null;
// src = `/images/palabras/${slugFor(palabra)}.webp`; emoji se queda como respaldo; alt sin cambios.

// src/components/Icon.tsx
export type IconName = "replay" | "next" | "drum" | "hand" | "yes" | "no";
export function Icon(props: { name: IconName; size?: number /* px, por defecto 48 */ }): JSX.Element;
// <img src={`/icons/ui-${name}.png`} alt="" aria-hidden width height draggable={false}>
```

- **Script** (`python3 scripts/optimizar-ilustraciones.py <carpeta-origen>`): por cada
  `img-<slug>.png`, redimensiona a 384 × 384 (LANCZOS), guarda
  `public/images/palabras/<slug>.webp` (calidad 80, con alfa) y falla si algún PNG está
  truncado o si no están los 65. Imprime el tamaño total. Objetivo: < 60 KB por fichero
  (medido al escribir la tarea, con `method=6`: 1,3 MB en total, el mayor 39 KB, `mimo`).
  `method=6` es lento sobre `/mnt/c`: más de 2 minutos para las 65, así que conviene lanzarlo
  en segundo plano.
  Los iconos se copian tal cual (ya pesan ~30 KB).
- **`Picture`:** pinta `<img>` con `src`, `alt`, `width`/`height` fijos (`lg` 160 px, `md`
  96 px), `draggable={false}` y `select-none`. Si el `<img>` dispara `error`, cambia al emoji
  con `role="img"` y `aria-label`, como hoy. **`<img>` y no `next/image`**: los ficheros ya
  vienen a su tamaño y la PWA los precacheará tal cual (spec §8); el optimizador de Next no
  aporta nada y no funciona sin servidor. Si Biome marca `noImgElement`, suprímelo con
  `biome-ignore` y ese motivo (Ruling previsto R21).
- **`Icon`** es decorativo: el botón que lo contiene ya lleva `aria-label`. La mano de
  `OptionCard` (ui-hand señala hacia abajo) va centrada encima de la tarjeta, no en la esquina.
- `ui-star` no se usa todavía (la celebración es del Plan 6) y no se copia.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| I1 | (se amplía) todo `imageKey` del currículo | `imageFor` no nulo, `emoji` no vacío, `alt` = palabra y `src` = `/images/palabras/<slug>.webp` |
| I3 | todo `imageKey` del currículo | existe `public/<src>` en disco (`node:fs`) y pesa < 60 KB |
| I4 | todas las palabras del currículo | `slugFor` da `[a-z]+` y no hay dos palabras con el mismo slug |
| I5 | `slugFor("ratón")`, `slugFor("uña")`, `slugFor("árbol")` | `"raton"`, `"una"`, `"arbol"` |
| I6 | `<Picture imageKey="img:gato" />` | un `img` con `alt="gato"`, `src` que acaba en `/gato.webp`, 160 × 160 |
| I7 | `<Picture>` y `fireEvent.error` sobre el `img` | desaparece el `img`; queda `role="img"` con `aria-label="gato"` y el emoji |
| I8 | `<Picture imageKey={undefined} />` o clave desconocida | no pinta nada (como hoy) |
| I9 | `<Icon name="replay" />` | `img` con `src="/icons/ui-replay.png"`, `alt=""`, `aria-hidden`, 48 × 48 |
| I10 | todo `IconName` | existe `public/icons/ui-<nombre>.png` en disco |
| I11 | `ReplayButton`, `OptionCard` marcada, botones sí/no de `hear-it` | pintan su `Icon` y ya no contienen el emoji; los tests existentes de esas vistas siguen en verde |

**Mutaciones:** (1) `slugFor` sin quitar tildes → I3/I5 deben fallar; (2) `Picture` sin el
respaldo de `onError` → I7 debe fallar.

**Pasos:** script y assets (un commit), luego TDD de `images/` + `Picture` + `Icon` y la
sustitución de emoji (otro commit). Puertas en verde y `pnpm build`. Commits:
`chore(assets): ilustraciones en WebP a 384 px, porque los PNG pesaban 49 MB` y
`feat(ui): ilustraciones e iconos reales, con el emoji de respaldo si la imagen no carga`.

---

## Tarea 6: La Fase 0 de punta a punta, ruta de desarrollo y cierre

**Riesgo:** integración y documentación. Revisión de cumplimiento, con una mutación sobre la
guarda de la ruta.

**Files:**
- Create: `src/features/Phase0.integration.test.tsx`, `src/app/dev/plantillas/page.tsx`
- Modify: `README.md`, `docs/superpowers/2026-09-26-plan-3-registro.md`

- **Integración** (store en memoria, `AudioPlayer` falso, contestando con `expectedAnswer`):
  con `phase0:clap` ya hecha, una sesión de `phase0:rhyme` hasta `EndScreen`; lo mismo con
  `initial` y `hear-it` partiendo de progresos preparados; y una sesión con un fallo a
  propósito en cada rung hasta el modelo, que acaba igual. Cada sesión deja la sesión guardada
  en el adaptador.
- **`/dev/plantillas`**: en producción, `notFound()` (`process.env.NODE_ENV === "production"`).
  En desarrollo, un selector de plantilla e ítem que monta `Presentation` y `Evaluation` con un
  ejercicio planificado por el motor, y botones para simular el rung 1, 2 o 3 (`feedback`
  falso) y `locked`. Sirve para ver `listen-tap` y `build` a mano, porque ninguna unidad las
  ofrece todavía (D10).
- **README:** estado del Plan 3 (Fase 0 jugable; número de tests); D8-D11 en «Decisiones
  tomadas»; D1 actualizada (ilustraciones reales integradas, emoji solo de respaldo); la hoja
  de ruta corregida (tras el Plan 3 la Fase 1 y la 2 esperan a `trace` y
  `say-it`); trampa 9 actualizada (`expectedAnswer` y el invariante M11 la acotan a
  `trace`/`say-it`/`read-word`); en «Deuda menor», `importState` con el contrato de D9 movido al
  Plan 6; enlace a `docs/diseno-visual.md`; la deuda nueva del registro.
- **Pasos:** tests, puertas y `pnpm build` en verde; el autor prueba a mano la Fase 0 con
  `pnpm dev` y mira `/dev/plantillas`. Commits:
  `test(ui): la Fase 0 entera se juega de punta a punta` y
  `docs: README con la Fase 0 jugable y las decisiones D8-D11`.

**Mutación:** quitar la guarda de producción de `/dev/plantillas` (un test que monte la página
con `NODE_ENV=production` debe fallar).

---

## Fuera de alcance de este plan

- La identidad visual final (paleta definitiva, compañero): D8 la deja para después. Las
  ilustraciones y los iconos sí entran (Tarea 5b); `ui-star` y los emoji de `EndScreen`
  esperan a la celebración y las recompensas del Plan 6.
- `trace` (Plan 4), `say-it` y `read-word` (Plan 5): hasta entonces la Fase 1 y la 2 siguen
  atenuadas en el mapa.
- `importState` en la interfaz: Plan 6 (D9).
- Locuciones reales de `ending:`, `stretch:` y `stretch-in:`: hoy las dice `speechSynthesis`
  a partir del texto del manifiesto, y van al lote de Azure.
- La deuda menor del Plan 2 que no toca estas vistas.

## Notas para el coordinador

- Rama `feat/plan-3-plantillas-toque`. Ledger versionado desde el primer día en
  `docs/superpowers/2026-09-26-plan-3-registro.md`.
- **No despaches la Tarea 1 hasta que el autor confirme la prueba manual del Plan 2 (D11).**
  Si encuentra fallos, se arreglan antes, en esta rama y con su propia revisión.
- Orden estricto 1 → 5 → 5b → 6. Cortes de sesión naturales tras la 2, tras la 4 y tras la 5b.
- Briefs con `sed -n` sobre este fichero (`grep -n '^## Tarea' <plan>`).
- Rulings previstos para el ledger: R15 (`build` acepta tocar y arrastrar), R16 (tema claro
  fijo), R17 (se atenúa el primer distractor en el orden del motor), R18 (`listen-tap` pinta
  el par minúscula-mayúscula en cada opción de letra), R19 (en `pickVoice`, el acento pesa
  más que la calidad), R21 (`<img>` y no `next/image` en `Picture` e `Icon`).
- README (Tarea 6): en «Después», la voz. Prueba de Azure con unos 10 audios en `do` y `mx`
  antes del lote, y **los fonemas sueltos («mmm», «sss», «p») grabados con voz humana**:
  ninguna voz sintética los dice bien.
