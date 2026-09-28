# Silabín Plan 4: `trace`, escribir letras con el dedo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** que `trace` quede construida de punta a punta: el niño repasa con el dedo una
mayúscula de v1 sobre una guía que se desvanece en 3 niveles, el motor decide si el trazo vale
y las 3 pistas funcionan. Se ve en `/dev/plantillas`; la Fase 1 sigue atenuada hasta el Plan 5.

**Architecture:** el contenido gana los trazos de las 9 mayúsculas (`content/glyphs.ts`) y el
motor una puntuación pura por cobertura y precisión (`engine/trace.ts`), el nivel de guía según
la caja Leitner y una entrada propia, `submitTrace`, que comparte con `submitAnswer` el paso
intento → pista o resolución. La interfaz añade un lienzo SVG con eventos `pointer`
(`components/TraceCanvas.tsx`) y las vistas de `trace`; no puntúa nunca. De paso se corrige R29
en la pista 1 de las plantillas de elección.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19.2.8, TypeScript estricto, Tailwind 4,
Zod 4, Zustand 5, Vitest 5 + jsdom + Testing Library, Biome 2. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-27-trace-design.md` (decisiones D12-D17; manda en
todo lo de `trace`), sobre el general `docs/superpowers/specs/2026-09-18-silabin-design.md`
(§2 principios, §5 pistas, §9 orientación). Registro de este plan:
`docs/superpowers/2026-09-27-plan-4-registro.md`.

**Modo económico (CLAUDE.md):** el plan fija contratos, casos de test y criterios de
aceptación. No trae la implementación: el implementador la escribe con TDD. Solo hay código
donde un detalle es delicado (los trazos de las letras y la conversión de coordenadas).

---

## Decisiones

Las de producto están en el spec de `trace` (D12-D17), tomadas con el autor el 2026-09-27:
solo forma, guía según la caja, Fase 1 en el Plan 5, R29 con repetición, solo mayúsculas y
entrada por `submitTrace` con SVG. Al escribir el plan se refinó el spec en dos puntos, ya
incorporados: `EvaluationProps` gana un solo campo **opcional** `trace?` (no tocar las 8 vistas
de toque), y el barril exporta `glyphFor` y, solo para `/dev/plantillas`, `guideLevel` y
`scoreTrace`.

**Prototipo previo (2026-09-27, desechable):** con las constantes de partida
(`TOLERANCE 0.15`, `MIN_COVERAGE 0.75`, `MIN_PRECISION 0.8`) y los trazos de la Tarea 1, las 9
letras pasan con sus propios trazos y con un temblor de ±0.08. Pasan también 5 pares cruzados
(«a sobre b» = trazos de a puntuados contra la letra b): **E sobre S, E sobre P, S sobre E,
O sobre U, U sobre O**. Quedan cerca del umbral, pero fallan: E sobre O, L sobre I, S sobre O y
P sobre S. Con tolerancia 0.10 solo pasaba U sobre O. Se acepta como precio de D12, y la prueba
manual de la Tarea 5 decide si las constantes se mueven.

Márgenes medidos con las constantes exactas, para distinguir «números algo distintos» de
«algoritmo equivocado» al revisar la Tarea 1:

| Caso | Cobertura mínima | Precisión | Resultado |
|---|---|---|---|
| Las 9 letras con el temblor de G2 | 1.000 | 1.000 | valen todas, con margen total |
| L sobre I | 1.000 | **0.780** | falla por solo 0.02: **el par más frágil** |
| E sobre O | 0.720 | 0.784 | falla |
| P sobre S | 0.700 | 0.849 | falla |
| E sobre L | 1.000 | 0.705 | falla |
| S sobre P | 0.804 | 0.700 | falla |

Si G15 da L sobre I como aprobado, lo primero es comparar el remuestreo con la definición
de la Tarea 1 (arrastre del sobrante entre segmentos, primer y último punto incluidos),
antes de pensar en constantes.

## Global Constraints

- Principios del spec §2, sin excepción: sonido y no nombre (la letra suena con su
  `audioKey`, `phoneme:x`); sin castigos ni mensajes negativos; fallo neutro
  (`feedback:retry`) de menos de 2 s; pistas de menos a más; presentación antes de evaluar.
- Sin texto para el niño: instrucciones con audio e icono. Texto visible solo para la letra y
  para el adulto (`aria-label`, el marcador de `/dev/plantillas`).
- Objetivos táctiles ≥ 72 px, separados ≥ 16 px. La letra ocupa al menos el 60 % del lado
  corto del área del ejercicio. Sin scroll dentro de un ejercicio en 360 × 640 vertical ni en
  1024 × 768 apaisado. `touch-action: none` solo en el lienzo.
- Todo audio pasa por el `AudioPlayer`. **La interfaz no depende de que un `play` suene ni
  termine** para desbloquear la entrada: las animaciones de las pistas acaban por
  temporizador (reproductor silencioso incluido).
- Animaciones solo con `motion-safe:`; con movimiento reducido, el trazo resaltado aparece
  entero y la animación acaba igual, por temporizador.
- Colores y fuentes **solo a través de los tokens** de `src/app/globals.css` (`ink`,
  `calm-border`, `mark`, `action`…). Si hace falta uno nuevo (por ejemplo, la tinta del
  niño), se añade allí y en `docs/diseno-visual.md`.
- Coordenadas entre vista y motor **siempre en la caja de la letra**: altura 1, `y` hacia
  abajo, `x` de 0 a `glyph.width`. La tinta puede salirse de la caja.
- `features/` y `components/` importan del motor **solo** `@/engine`, y **nunca deciden si un
  trazo vale ni qué nivel de guía toca**: `scoreTrace` y `guideLevel` solo se usan en
  `src/features/dev/` (test de fronteras, Tarea 2).
- `engine/` y `content/` no importan React ni tocan el DOM.
- TDD; `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit; Conventional
  Commits en español con el porqué. Tests de interfaz con `// @vitest-environment jsdom`.

## Review Focus

1. **Lienzo sin tamaño** (`getBoundingClientRect` con ancho o alto 0: durante el montaje, al
   rotar, en `jsdom` sin simular): el evento se ignora, nunca llegan `NaN` al motor, y
   `scoreTrace` descarta los puntos no finitos por si acaso. → Tarea 1, G12; Tarea 3, V2.
2. **Segundo dedo o palma mientras traza:** no pinta ni corta el trazo del primer dedo. →
   Tarea 3, V3.
3. **`pointercancel` a mitad de trazo** (gesto del sistema en iOS): el trazo se cierra con lo
   que llevaba, una sola vez, y empieza a contar la inactividad. → Tarea 3, V4.
4. **Navegador sin voz:** la pista 2 (punto + fonema) y el modelo acaban y desbloquean el
   lienzo aunque el audio no suene nunca. → Tarea 3, E6 y E7.
5. **El niño sigue tocando cuando no toca:** durante el feedback (`locked`), durante una
   animación o tras enviar el intento, no hay tinta ni un segundo `onTrace`. → Tarea 3, V6,
   E4 y E10.

---

## Estructura de archivos

```
src/
  content/
    glyphs.ts (+ test)               crear: tipos, trazos de las 9 mayúsculas, glyphFor (T1)
    invariants.test.ts               modificar: invariante de trazos (T1)
  engine/
    trace.ts (+ test)                crear: scoreTrace, guideLevel, constantes (T1)
    session.ts (+ test)              modificar: resolveAttempt, submitTrace, traceGuide, guarda (T2)
    index.ts                         modificar: reexportar lo nuevo (T2)
  store/app-store.ts (+ test)        modificar: answerTrace (T2)
  features/boundaries.test.ts        modificar: scoreTrace y guideLevel solo en dev (T2)
  components/TraceCanvas.tsx (+ test)          crear: lienzo SVG (T3)
  features/session/
    registry.ts                      modificar: EvaluationProps.trace? (T3); registrar trace (T4)
    SessionScreen.tsx (+ test)       modificar: resolver genérico y prop trace (T3)
    trace/Evaluation.tsx (+ test)    crear (T3)
    trace/hint-effects.ts (+ test)   crear: acción de pista → efecto (T3)
    trace/Presentation.tsx (+ test)  crear (T4)
    choice/hint-effects.ts (+ test)  modificar: R29 (T4)
  features/dev/PlantillasDev.tsx (+ test)      modificar: panel de trace con marcador (T4)
  features/Trace.integration.test.tsx          crear: trace de punta a punta (T5)
README.md                            modificar (T5)
```

---

## Tarea 1: Geometría del trazo

**Riesgo:** lógica del motor que decide pedagogía. Revisión completa con mutaciones.

**Files:**
- Create: `src/content/glyphs.ts` (+ `glyphs.test.ts`), `src/engine/trace.ts` (+ `trace.test.ts`)
- Modify: `src/content/invariants.test.ts`

**Interfaces (Produces):**

```ts
// content/glyphs.ts
export type GlyphPoint = { x: number; y: number };
/** Caja de altura 1, `y` hacia abajo, `x` de 0 a `width`. Trazos en el orden escolar. */
export type Glyph = { width: number; strokes: GlyphPoint[][] };
export type LetterCase = "upper" | "lower";
export const UPPER_GLYPHS: Readonly<Record<string, Glyph>>; // clave: item.text ("a", "m"…)
export function glyphFor(item: Item, letterCase: LetterCase): Glyph;
//   lanza si item.kind !== "letter", si no hay trazo para item.text, y siempre con "lower"
//   (mensaje que diga que las minúsculas llegan en el Plan 6).

// engine/trace.ts
export const TOLERANCE = 0.15;      // en alturas de letra
export const MIN_COVERAGE = 0.75;   // por cada trazo de la letra
export const MIN_PRECISION = 0.8;   // sobre toda la tinta
export const SAMPLE_STEP = 0.02;    // paso de remuestreo, en alturas de letra
export type TraceStroke = GlyphPoint[];
export type TraceScore = { correct: boolean; coverage: number[]; precision: number };
export function scoreTrace(glyph: Glyph, strokes: readonly TraceStroke[]): TraceScore;
export type GuideLevel = 1 | 2 | 3;
export function guideLevel(box: Box, hintsShown: 0 | 1 | 2 | 3): GuideLevel;
```

**Trazos de las letras (delicado: son los del prototipo).** Dos ayudantes internos:
`line(...[x, y])` y `arc(cx, cy, rx, ry, desdeGrados, hastaGrados, pasos)`, con punto
`(cx + rx·cos θ, cy + ry·sin θ)`. Como `y` crece hacia abajo, θ = −90° es arriba, y al
**bajar** θ se gira en sentido antihorario en pantalla. `arc` redondea cada coordenada a 4
decimales, porque si no `sin(−450°)` deja `y = −1e−16` y el invariante de la caja falla.

| Letra | `width` | Trazos, en orden |
|---|---|---|
| A | 0.8 | `(0.4,0)→(0,1)`; `(0.4,0)→(0.8,1)`; `(0.152,0.62)→(0.648,0.62)` |
| E | 0.6 | `(0,0)→(0,1)`; `(0,0)→(0.6,0)`; `(0,0.5)→(0.5,0.5)`; `(0,1)→(0.6,1)` |
| I | 0.2 | `(0.1,0)→(0.1,1)` |
| O | 0.8 | `arc(0.4, 0.5, 0.4, 0.5, −90, −450, 48)`: empieza arriba y baja por la izquierda |
| U | 0.7 | uno solo: `(0,0)`, `arc(0.35, 0.65, 0.35, 0.35, 180, 0, 24)`, `(0.7,0)` |
| M | 0.9 | `(0,0)→(0,1)`; `(0,0)→(0.45,0.6)→(0.9,0)`; `(0.9,0)→(0.9,1)` |
| L | 0.6 | `(0,0)→(0,1)`; `(0,1)→(0.6,1)` |
| S | 0.6 | uno solo: `arc(0.3, 0.25, 0.25, 0.25, −20, −270, 24)` seguido de `arc(0.3, 0.75, 0.25, 0.25, −90, 160, 24)` sin su primer punto (repetido) |
| P | 0.6 | `(0,0)→(0,1)`; `(0,0)`, `arc(0.3, 0.275, 0.275, 0.275, −90, 90, 20)`, `(0,0.55)` |

**Puntuación (delicado: el remuestreo debe ser este para que los números del prototipo
valgan).**
- `resample(stroke)`: el primer punto, después un punto cada `SAMPLE_STEP` de longitud
  recorrida, **arrastrando el sobrante de un segmento al siguiente** (no reinicia en cada
  vértice), y el último punto. Un trazo de un solo punto se queda en ese punto.
- Distancia de un punto a un trazo = mínima a sus **segmentos** (un segmento de longitud 0 es
  su punto; un trazo de un solo punto es ese punto). Cuenta como cerca si `≤ TOLERANCE`.
- `coverage[i]` = muestras del trazo `i` de la letra cerca de alguna tinta / sus muestras.
- `precision` = muestras de tinta cerca de algún trazo de la letra / muestras de tinta; 0 si
  no hay tinta.
- `correct` = hay tinta, todos los `coverage[i] ≥ MIN_COVERAGE` y `precision ≥ MIN_PRECISION`.
- Antes de nada se descartan los puntos con coordenadas no finitas; un trazo que se queda sin
  puntos se ignora. El orden de los trazos y su dirección no cuentan (D12).

**Nivel de guía:** base por caja: 0 → 1; 1 → 2; 2 y 3 → 3. Con `hintsShown` 1 o 2, la base
menos 1 (mínimo 1). Con 3, siempre 1.

**Casos de test** (`G`; letras sintéticas en `trace.test.ts`, reales en `glyphs.test.ts`):

| Id | Entrada | Esperado |
|---|---|---|
| G1 | Letra sintética `L` (vertical 1 + base 0.6) con su propia tinta | `correct`, `coverage` `[1, 1]`, `precision` 1 |
| G2 | La misma con temblor: cada trazo remuestreado y su muestra `i` desplazada `x + (i impar ? 0.08 : −0.08)`, `y + (i % 3 ≠ 0 ? 0.04 : −0.04)` | `correct` |
| G3 | Letra sintética `T_CORTA` (vertical 1 + barra 0.4 desde su extremo superior) con tinta solo en la vertical | `correct: false`, con `coverage[1] < MIN_COVERAGE` (la cobertura total superaría 0.75: fija que se mide por trazo) |
| G4 | `L` con un garabato: 11 líneas horizontales de `x` −0.1 a 0.7, a `y` = 0, 0.1 … 1 | `correct: false` por `precision` |
| G5 | `L` con dedo rápido: cada trazo solo con sus 2 extremos | `correct` (distancia al segmento) |
| G6 | `[]` y `[[]]` | `correct: false`, `precision` 0, `coverage` `[0, 0]` |
| G7 | `L` con los trazos en orden inverso y cada uno al revés | `correct` (D12) |
| G8 | `L` con la tinta desplazada +0.3 en x | `correct: false` |
| G9 | `L` con la tinta desplazada +0.1 en x | `correct` |
| G10 | `L` con un solo toque (un punto) en `(0, 0.5)` | `correct: false`, sin lanzar |
| G11 | `L` dibujada de un solo trazo continuo `(0,0)→(0,1)→(0.6,1)` | `correct` (el número de trazos no cuenta) |
| G12 | Tinta de G1 más un trazo `[{x: NaN, y: 0}]` y un punto `{x: Infinity, y: 1}` dentro del primer trazo | `correct`, mismos números que G1 |
| G13 | `guideLevel`: tabla completa caja 0-3 × pistas 0-3 | caja 0 → 1,1,1,1; caja 1 → 2,1,1,1; cajas 2 y 3 → 3,2,2,1 |
| G14 | Cada una de las 9 letras reales con sus propios trazos, y con el temblor de G2 | `correct` |
| G15 | **Cruzada:** para cada par ordenado distinto (a, b), `scoreTrace(UPPER_GLYPHS[b], trazos de a)` | `correct: false`, salvo los pares de `CONFUSABLE_PAIRS` = E→S, E→P, S→E, O→U y U→O, que se permite que pasen (no se afirma nada de ellos). Un par nuevo que pase se **reporta**, no se esconde ni se añade a la lista sin decisión del coordinador |
| G16 | `glyphFor` con `letter:a` / `"upper"`; con `"lower"`; con `phoneme:a`; con una letra sin trazo | el `Glyph` de A / lanza / lanza / lanza |
| G17 | **Invariante** (`invariants.test.ts`): para cada unidad que declara `trace` y cada ítem `letter` que introduce, `glyphFor(item, "upper")` no lanza; todo punto cumple `0 ≤ x ≤ width` y `0 ≤ y ≤ 1`; todo trazo tiene ≥ 2 puntos | pasa con el contenido actual (vocales y m, l, s, p) |

**Mutaciones (4-5):** (1) cobertura total en vez de por trazo (G3); (2) distancia al punto más
cercano en vez de al segmento (G5); (3) sin la condición de precisión (G4); (4) `guideLevel`
sin la vuelta a 1 con la pista 3, o bajando 2 niveles (G13); (5) remuestreo que reinicia el
paso en cada vértice (G15 debería seguir en pie: si cambia el conjunto de pares, se reporta).

**Commit:** `feat(engine): puntuar el trazo por forma, con tolerancia, para no frustrar a quien empieza`.

---

## Tarea 2: Contrato de sesión y store

**Riesgo:** contrato motor-interfaz y `store/`. Revisión completa con mutaciones.

**Files:**
- Modify: `src/engine/session.ts` (+ test), `src/engine/index.ts`,
  `src/store/app-store.ts` (+ test), `src/features/boundaries.test.ts`

**Interfaces:**
- Consumes (T1): `scoreTrace`, `guideLevel`, `glyphFor`, `TraceStroke`, `GuideLevel`, `Glyph`.
- Produces:

```ts
// engine/session.ts
export function submitTrace(input: {
	content: CurriculumIndex;
	run: SessionRun;
	strokes: readonly TraceStroke[];
	now: string;
}): { run: SessionRun; feedback: AttemptFeedback };
export type TraceGuide = { glyph: Glyph; level: GuideLevel };
export function traceGuide(content: CurriculumIndex, run: SessionRun): TraceGuide;

// store/app-store.ts (AppState)
answerTrace(strokes: readonly TraceStroke[]): Promise<AttemptFeedback>;
```

- `resolveAttempt(content, run, exercise, outcome)` **interno** (sin exportar): lo que hoy
  hace `submitAnswer` desde `recordAttempt` hasta devolver `{ run, feedback }`. Tanto
  `submitAnswer` como `submitTrace` lo usan; la conducta de `submitAnswer` no cambia.
- Guardas de `submitTrace`, en este orden: sesión terminada → «La sesión ya ha terminado»;
  presentación → «no es una evaluación»; plantilla distinta de `trace` → mensaje que nombra
  `submitAnswer`; ya resuelto → «ya está resuelto». Ítem desconocido → lanza como hoy.
- `submitAnswer` lanza ante un ejercicio `trace` **antes** de llamar a `checkAnswer`, con un
  mensaje que nombra `submitTrace`. `checkAnswer` no cambia y conserva su mensaje («no tiene
  respuesta que comparar»): el test M4 de `answers.test.ts` lo llama directamente y sigue
  igual. C5 comprueba el mensaje nuevo a propósito; no se debilita la guarda para conservar
  el viejo.
- `traceGuide`: lanza si no hay ejercicio en curso o si no es una evaluación `trace`.
  `glyph = glyphFor(item, "upper")` (D16: `lowercaseTracing` se ignora hasta el Plan 6) y
  `level = guideLevel(itemProgressOf(run.progress, itemId).box, run.attempt.hintsShown)`.
- Barril `@/engine`: añade `submitTrace`, `traceGuide`, `glyphFor`, `scoreTrace`,
  `guideLevel` y los tipos `TraceGuide`, `TraceStroke`, `TraceScore`, `GuideLevel`, `Glyph`,
  `GlyphPoint`, `LetterCase`.
- `answerTrace` hace lo mismo que `answer` (actualiza `run` y `progress`, guarda solo si hay
  resolución), pero con `submitTrace`.

**Casos de test** (`C`; el ejercicio `trace` se monta a mano como `SessionRun` con
`letter:a`, como ya hacen los tests de sesión, o con una unidad de prueba que solo declara
`trace`):

| Id | Entrada | Esperado |
|---|---|---|
| C1 | `submitTrace` con los trazos de A en el 1.er intento | `mastery-credit`, `attempt.resolved`, `counters.traces` +1 |
| C2 | `submitTrace` con `[]` en el 1.er intento | `hint` de rung `reduce` (`restore-previous-guide-level`), `resolution` null, `attempt` 2, `hintsShown` 1 |
| C3 | Tres fallos seguidos | 3.er `feedback`: pista `model` y `assisted`; `counters.traces` +1 una sola vez |
| C4 | Fallo y después acierto | `correct-with-hint` con `hintsUsed` 1 |
| C5 | `submitAnswer` sobre un ejercicio `trace` | lanza con un mensaje que contiene `submitTrace` (no el de «no tiene respuesta que comparar») |
| C6 | `submitTrace` sobre `listen-tap`; sobre una presentación; ya resuelto; con la sesión terminada | lanza en cada caso, con el mensaje de la guarda |
| C7 | `traceGuide` con `letter:a` en caja 0, sin pistas; en caja 2; tras 1 fallo en caja 2; tras 3 fallos | `{ glyph: glyphFor(A), level: 1 }`; nivel 3; nivel 2; nivel 1 |
| C8 | `traceGuide` con un ejercicio `listen-tap` en curso, o con la sesión terminada | lanza |
| C9 | Store: `answerTrace` con un fallo y después un acierto (adaptador en memoria que cuenta guardados) | 0 guardados tras el fallo, 1 tras el acierto; devuelve el `feedback` del motor |
| C10 | `boundaries.test.ts`, caso nuevo U9: ningún fichero de `src/features/` o `src/components/` fuera de `src/features/dev/` contiene `scoreTrace` ni `guideLevel` | pasa |

**Mutaciones (4):** (1) `submitTrace` da siempre `correct` (C2); (2) `traceGuide` ignora
`hintsShown` (C7); (3) quitar la guarda de `submitAnswer` (C5); (4) `answerTrace` guarda
también tras un fallo (C9). El revisor comprueba además que U9 falla si se añade `scoreTrace`
a una vista.

**Commit:** `feat(engine): el trazo entra al motor por submitTrace para que ninguna vista decida si vale`.

---

## Tarea 3: Lienzo y evaluación de `trace`

**Riesgo:** pedagogía (pistas), contrato y entrada táctil. Revisión completa con mutaciones.

**Files:**
- Create: `src/components/TraceCanvas.tsx` (+ test),
  `src/features/session/trace/Evaluation.tsx` (+ test),
  `src/features/session/trace/hint-effects.ts` (+ test)
- Modify: `src/features/session/registry.ts` (solo `EvaluationProps`),
  `src/features/session/SessionScreen.tsx` (+ test)

**Interfaces:**
- Consumes (T2, por `@/engine`): `traceGuide`, `TraceGuide`, `TraceStroke`, `Glyph`,
  `GuideLevel`; `answerTrace` del store.
- Produces:

```ts
// components/TraceCanvas.tsx
export const ANIMATION_MS_PER_UNIT = 900;  // por unidad de longitud de trazo
export function animationMs(glyph: Glyph): number; // suma de longitudes × MS_PER_UNIT, mínimo 800
export type TraceAnimation = "none" | "dot" | "full";
export function TraceCanvas(props: {
	glyph: Glyph;
	level: GuideLevel;
	/** Tinta ya cerrada que pinta el lienzo; el trazo en curso lo lleva el propio lienzo. */
	strokes: readonly TraceStroke[];
	animation: TraceAnimation;
	/** Una vez por animación, a los `animationMs(glyph)`, suene o no el audio. */
	onAnimationEnd?(): void;
	/** Pulso breve en el punto de inicio 1 (pista 1). */
	pulseStart?: boolean;
	disabled: boolean;
	onStrokeStart(): void;
	onStrokeEnd(stroke: TraceStroke): void;
}): ReactElement;

// features/session/registry.ts
export type EvaluationProps = { /* lo de hoy */ trace?: TraceInput };
export type TraceInput = { guide: TraceGuide; onTrace(strokes: TraceStroke[]): void };

// features/session/trace/Evaluation.tsx
export const TRACE_IDLE_MS = 1500;
export function Evaluation(props: EvaluationProps): ReactElement; // lanza si falta props.trace

// features/session/trace/hint-effects.ts
export type TraceEffect =
	| { kind: "none" }
	| { kind: "pulse-start" }
	| { kind: "dot"; request: AudioRequest }
	| { kind: "model" };
export function traceEffect(input: { action: string; item: Item }): TraceEffect;
//   restore-previous-guide-level → pulse-start
//   animate-dot-along-stroke+play-phoneme → dot con { key: item.audioKey }
//   animate-full-stroke+await-retrace → model;  cualquier otra → none
```

**Lienzo:**
- SVG con `viewBox` = caja de la letra más un margen de 0.2 por lado:
  `(-0.2, -0.2, width + 0.4, 1.4)`, con `preserveAspectRatio="xMidYMid meet"`.
- **Conversión de coordenadas (delicado: con `meet` hay bandas).** Con
  `rect = svg.getBoundingClientRect()` y `vb` el `viewBox`:

  ```ts
  if (rect.width === 0 || rect.height === 0) return null; // el evento se ignora
  const s = Math.min(rect.width / vb.w, rect.height / vb.h);
  const ox = rect.left + (rect.width - vb.w * s) / 2;
  const oy = rect.top + (rect.height - vb.h * s) / 2;
  return { x: vb.x + (clientX - ox) / s, y: vb.y + (clientY - oy) / s };
  ```

- Entrada: `pointerdown` (solo si `isPrimary` y no `disabled`: `setPointerCapture`,
  `onStrokeStart`, empieza el trazo), `pointermove` (añade punto si es ese mismo puntero),
  `pointerup` y `pointercancel` (cierran el trazo una sola vez con `onStrokeEnd`). Un trazo de
  un solo punto también se entrega.
- Capas y niveles (con `data-level` en el SVG y `data-testid` para los tests):

  | Nivel | Carril (`guide-lane`) | Punteada (`guide-dash`) | Inicios (`guide-start-N`) | Flechas (`guide-arrow-N`) |
  |---|---|---|---|---|
  | 1 | grueso, visible | sí | todos, numerados | una por trazo, hacia su dirección |
  | 2 | tenue | no | todos, numerados | no |
  | 3 | muy tenue | no | solo el 1 | no |

- La tinta (`ink`) es gruesa y de puntas redondas. `animation` `"dot"` recorre los trazos en
  orden con un punto y `"full"` los dibuja trazo a trazo; el movimiento va solo con
  `motion-safe:` y el final siempre lo marca un `setTimeout(animationMs(glyph))`, que llama a
  `onAnimationEnd` una vez (en `jsdom` no hay eventos de animación).

**Evaluación:**
- Guarda los trazos cerrados del intento. Tras cada `onStrokeEnd` arranca
  `TRACE_IDLE_MS`; `onStrokeStart` lo cancela. Al vencer, envía **una vez por intento**
  `trace.onTrace(trazos)`, o `onModelDone()` si está en modo modelo.
- `attemptKey` nuevo: borra la tinta y cancela el temporizador pendiente.
- Lienzo `disabled` si `locked`, durante una animación o tras enviar el intento.
- Pista según `traceEffect(feedback.hint.action)`: `pulse-start` activa `pulseStart`; `dot`
  pide el audio (sin esperarlo) y anima `"dot"`; `model` anima `"full"` y pasa a modo
  modelo, en el que cualquier intento cerrado con al menos un trazo llama a `onModelDone()`
  **sin puntuar ni llamar a `onTrace`** (el rung 3 garantiza el acierto).
- **Guía congelada tras acertar:** pinta `trace.guide` mientras no esté `locked`. Mientras
  está `locked` conserva la última, porque tras un acierto el motor ya subió la caja y
  `traceGuide` daría otro nivel durante la celebración.
- `ReplayButton` que vuelve a sonar `item.audioKey`, como en las otras evaluaciones.

**`SessionScreen`:** `resolver` pasa a recibir la llamada al store
(`() => answer(a)` o `() => answerTrace(trazos)`), con la misma guarda `busy` y el mismo
`setLocked(true)`. Solo en evaluaciones `trace` pasa
`trace={{ guide: traceGuide(curriculum, run), onTrace }}`, con `run` del store.

**Casos de test** (`V` lienzo, `E` evaluación, `H` efectos, `S` pantalla; relojes falsos y
`getBoundingClientRect` simulado):

| Id | Entrada | Esperado |
|---|---|---|
| V1 | Rect 400 × 300 en (10, 20), letra `width` 0.8 (`vb` 1.2 × 1.4): toque en el centro del rect | punto `(0.4, 0.5)`; un toque en el borde izquierdo del rect cae fuera de la caja (x < −0.2), porque hay bandas |
| V2 | Rect 0 × 0 | `pointerdown/move/up` no llaman a nada ni dejan tinta |
| V3 | Traza el puntero 1 (primario); entra el 2 (`isPrimary: false`), se mueve y se levanta | el trazo del 1 no se corta; el 2 no pinta ni llama a `onStrokeEnd` |
| V4 | `pointercancel` a mitad de trazo | `onStrokeEnd` una vez con los puntos hasta ese momento |
| V5 | Niveles 1, 2 y 3 con la letra E (4 trazos) | inicios 4 / 4 / 1; flechas 4 / 0 / 0; punteada sí / no / no; `data-level` correcto |
| V6 | `disabled` | ni tinta ni llamadas |
| V7 | `animation="dot"` | `onAnimationEnd` una sola vez a los `animationMs(glyph)`, ni antes ni dos veces |
| E1 | Un trazo y se levanta el dedo | a los 1499 ms nada; a los 1500, `onTrace` una vez con ese trazo |
| E2 | Trazo, 1000 ms, otro trazo, 1500 ms | `onTrace` una vez con los 2 trazos |
| E3 | Trazo y `attemptKey` cambia antes de 1500 ms | sin tinta; no llega ningún `onTrace` tardío |
| E4 | `locked` | lienzo `disabled`, sin `onTrace` |
| E5 | `feedback` con la pista 1 | `pulseStart` activo en el inicio 1 |
| E6 | Pista 2 con un `AudioPlayer` cuyo `play` no resuelve nunca | pide `{ key: item.audioKey }`; lienzo bloqueado hasta `animationMs` y desbloqueado después |
| E7 | Pista 3 (`assisted`) | animación `"full"`; después, trazo + 1500 ms → `onModelDone` una vez y `onTrace` nunca; también con el audio que no resuelve |
| E8 | Acierto: `locked` sigue en `true` y `trace.guide.level` pasa de 1 a 2 | `data-level` sigue en 1 |
| E9 | Sin `props.trace` | lanza |
| E10 | Tras enviar, más trazos antes del siguiente `attemptKey` | sin tinta y sin un segundo `onTrace` |
| H1 | `traceEffect` con las 3 acciones y una desconocida | `pulse-start` / `dot` con `item.audioKey` / `model` / `none` |
| S1 | `SessionScreen` con una evaluación `trace` y vistas inyectadas | la vista recibe `trace.guide` igual a `traceGuide(curriculum, run)`; `onTrace` llama a `answerTrace`; dos `onTrace` seguidos dan una sola llamada |
| S2 | Fallo con `letter:a` en caja 2 | suena `feedback:retry`, sube `attemptKey` y la vista pasa del nivel 3 al 2 (más guía) |
| S3 | Evaluación que no es `trace` | la vista no recibe `trace` |

**Mutaciones (4):** (1) `onStrokeStart` no cancela el temporizador (E2); (2) aceptar punteros
no primarios (V3); (3) el modelo llama a `onTrace` (E7); (4) desbloquear tras la pista 2
esperando al audio (E6). El revisor mira además la guía congelada (E8).

**Commit:** `feat(ui): lienzo de trazo con guía que se desvanece y pistas que no dependen del audio`.

---

## Tarea 4: Presentación, registro, `/dev/plantillas` y R29

**Riesgo:** interfaz y una regla de pista (R29). Revisión de cumplimiento, con la mutación de
R29.

**Files:**
- Create: `src/features/session/trace/Presentation.tsx` (+ test)
- Modify: `src/features/session/registry.ts` (+ test), `src/features/dev/PlantillasDev.tsx`
  (+ test), `src/features/session/choice/hint-effects.ts` (+ test)

**Interfaces:** consume `TraceCanvas`, `animationMs` (T3), `Evaluation` de `trace` (T3),
`glyphFor`, `guideLevel` y `scoreTrace` (T2, estos dos últimos solo en `features/dev/`),
`Written` de `listen-tap`, `BigButton`.

- **Presentación:** el par con `Written` (spec §2, «par A/a siempre visible») y debajo el
  lienzo con `glyphFor(item, "upper")` en nivel 1 y `animation="full"`. Al montar suena
  `item.audioKey` una vez (el patrón de `listen-tap/Presentation`, incluido el doble montaje
  del modo estricto). El `BigButton` «Siguiente» aparece al acabar la animación, suene o no el
  audio. El niño puede repasar la letra: se pinta su tinta, pero no se evalúa ni se envía nada.
- **Registro:** `trace` entra en `templateViews` y en `IMPLEMENTED_TEMPLATES`.
- **`/dev/plantillas`:** el panel de `trace` añade un selector de nivel 1/2/3 (caja 0/1/2) a
  lo que ya hay (ítem y rung). Construye `trace = { guide: { glyph: glyphFor(item, "upper"),
  level: guideLevel(caja, pistas del rung) }, onTrace }`. `onTrace` enseña
  `scoreTrace(glyph, trazos)` (cobertura por trazo, precisión, «vale» o «no vale») y deja
  volver a intentar (`attemptKey` + 1). El marcador es texto para el adulto, solo en
  desarrollo.
- **R29** (`choiceEffect`): en `dim-one-distractor+replay` y
  `dim-one-distractor+replay-phoneme`, si `exercise.optionIds.length <= 2`, devuelve
  `{ kind: "replay", request: { key: item.audioKey } }` y no atenúa nada. Con 3 opciones no
  cambia.

**Casos de test** (`P`, `D`, `X`):

| Id | Entrada | Esperado |
|---|---|---|
| P1 | Presentación de `letter:a` | se ven «a» y «A»; lienzo en nivel 1 con animación `"full"` |
| P2 | Montaje en modo estricto | `item.audioKey` suena una vez |
| P3 | Audio que no resuelve nunca | «Siguiente» aparece a los `animationMs(glyph)`; al pulsarlo, `onDone` |
| P4 | El niño traza durante la presentación | se ve la tinta; no se llama a nada |
| P5 | `isSessionPlayable` con `phase1:vowel-a` activa | `false` (falta `say-it`); con la Fase 0, `true` como hoy |
| D1 | `/dev/plantillas` con `trace` | selector con las 9 letras y nivel 1/2/3; cambiar de nivel cambia `data-level` |
| D2 | Un trazo sintético sobre A y 1500 ms | el marcador enseña los números de `scoreTrace` y «vale» |
| X1 | `listen-tap` con 2 opciones, pista 1 | `{ kind: "replay", request: { key: item.audioKey } }` |
| X2 | `initial-sound` con ítem `phoneme` y 2 opciones, pista 1 | `replay` con `item.audioKey` |
| X3 | Las mismas con 3 opciones, **y un ítem oral de `phase0:initial`** (sus 3 opciones vienen del dato y `buildOptions` las pasa todas a `exercise.optionIds`) | `dim` de un distractor, nunca de la correcta; en `phase0:initial` nunca `replay`, porque es la única unidad que un niño puede jugar hoy (los tests de hoy siguen en verde) |
| X4 | `ChoiceEvaluation` con 2 opciones tras la pista 1 | las dos opciones siguen activas y tocables |

**Mutación:** quitar la guarda de R29 (X1 y X4 deben fallar).

**Commits:** `feat(ui): presentar la letra dibujándose sola antes de pedir que se trace` y
`fix(ui): con dos opciones la pista 1 repite el audio en vez de dejar solo la correcta`.

---

## Tarea 5: Integración, prueba manual y README

**Riesgo:** prueba y documentación. Revisión de cumplimiento.

**Files:**
- Create: `src/features/Trace.integration.test.tsx`
- Modify: `README.md`, `next.config.ts` (`allowedDevOrigins` desde `DEV_ORIGINS`);
  `src/engine/trace.ts` y `glyphs.test.ts` solo si la prueba manual mueve constantes o la
  lista de pares

**Integración** (modelo: `src/features/Phase0.integration.test.tsx`): vistas, motor y store
reales con adaptador en memoria y relojes falsos, sobre un **currículo de prueba** con los
ítems reales y una sola unidad `test:trace` que introduce `letter:a` y solo declara `trace`
(la Fase 1 real sacaría `say-it`). La tinta se genera con eventos `pointer` a partir de los
trazos de A, convertidos a coordenadas de pantalla con el mismo rect simulado.

| Id | Recorrido | Esperado |
|---|---|---|
| I1 | Presentación → «Siguiente» → evaluación trazando A bien | celebración y siguiente ejercicio; `letter:a` sube de caja |
| I2 | Evaluación con tres intentos lejos de la letra | pista 1 (la guía pasa al nivel anterior, si no era ya el 1), pista 2 (animación y desbloqueo), modelo; repasarlo avanza |
| I3 | Fin de la sesión | `counters.traces` igual al número de evaluaciones `trace`; `assisted` 1 en `letter:a` |

**Prueba manual (el autor, antes de cerrar la tarea).** El coordinador para y se la pide.
- **Acceso desde otro dispositivo (delicado: si falla, parece un lienzo muerto).** Next 16
  bloquea en desarrollo las peticiones de origen cruzado a sus recursos de desarrollo
  (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md`):
  solo permite `localhost`, sus subdominios y el host con el que arrancó. Desde el móvil, el
  origen es la IP de la red local, y sin permiso la página se pinta pero **no se hidrata**:
  el lienzo no respondería, un artefacto del arnés como el de R28 que haría dudar de las
  constantes. Por eso esta tarea añade en `next.config.ts`
  `allowedDevOrigins: process.env.DEV_ORIGINS?.split(",").filter(Boolean) ?? []` (solo
  afecta a `next dev`) y una línea en «Cómo ejecutarlo» del README.
- Arranque: `DEV_ORIGINS=<ip-lan> pnpm dev -H 0.0.0.0` y `/dev/plantillas` desde un
  dispositivo táctil real. La entrada es la IP sola, sin esquema ni puerto. Desde WSL2 puede
  hacer falta la red en modo *mirrored* o un `netsh interface portproxy`. Antes de trazar,
  comprobar que la página responde: por ejemplo, que cambiar de letra en el selector cambia la
  guía. Si no hay dispositivo táctil, se usa la emulación táctil de Chrome y se anota en el
  registro.
- Por cada letra, en los niveles 1 y 3: repasarla con cuidado (debe valer), repasarla torpe
  pero reconocible (debe valer), garabatear (no debe valer) y dibujar otra letra encima
  (anotar qué pasa). Anotar también si 1.5 s de espera se sienten bien.
- Si cambian `TOLERANCE`, `MIN_COVERAGE`, `MIN_PRECISION` o `TRACE_IDLE_MS`: Ruling con los
  números, G15 se vuelve a correr y `CONFUSABLE_PAIRS` se actualiza, con commit aparte.

**README:** Plan 4 hecho (qué se construyó y dónde se ve), D12-D17 en la tabla de decisiones,
**trampa 9** cerrada para `trace` y abierta para `say-it` y `read-word`, R29 resuelto,
«Siguientes pasos» apuntando al Plan 5 con el desbloqueo de la Fase 1 (D14) y los pares
confundibles como dato conocido.

**Commits:** `test(ui): trace de punta a punta con motor y store reales` y
`docs: README con trace construida y la Fase 1 esperando a say-it`.

---

## Tarea 6: hallazgos de la prueba manual — motion-safe, marcadores, guía de dirección animada

**Añadida durante la ejecución** (la prueba manual de la Tarea 5 encontró estos hallazgos en
ficheros que las Tareas 3/4 ya habían cerrado y revisado; detalle completo en el registro,
sección de la Tarea 5). **Riesgo:** interfaz y una regla de pista — revisión completa con
mutación en `TraceCanvas.tsx`/`hint-effects.ts`; el ajuste de tamaño de `Presentation.tsx` en
768×1024 es solo cumplimiento (dato/CSS, sin mutación).

**Files:**
- Modify: `src/components/TraceCanvas.tsx`, `src/features/session/trace/Presentation.tsx`,
  `src/features/session/trace/hint-effects.ts`, y sus tests.

**Contrato:**

1. **Fix `motion-safe` (bug confirmado, no es una decisión de diseño).** Añadir
   `motion-reduce:transition-none` junto a `motion-safe:transition-[stroke-dashoffset]`
   (`animation==="full"`) y junto a `motion-safe:transition-[offset-distance]`
   (`animation==="dot"`/la nueva flecha del punto 3). Causa: con `prefers-reduced-motion:
   reduce`, la clase `motion-safe:` no aplica, pero `transition-property` cae a su valor
   inicial `all` (no hay reset de Preflight que lo lleve a `none`) — y como
   `transitionDuration`/`transitionDelay` se ponen por estilo en línea (aplican siempre), el
   elemento se anima igual, ignorando la preferencia del sistema. Verificado de forma aislada
   con Playwright (`reducedMotion: 'reduce'` sobre el CSS compilado real del proyecto, sin
   pasar por la app): sin el fix, decae de 0.36→0 en varias muestras (anima); con
   `motion-reduce:transition-none`, salta a `0` en la primera muestra (no anima). Con
   `no-preference`, sigue animando igual que antes en ambos casos. Detalle completo, con los
   JSON de las dos corridas, en el registro de la Tarea 5. Test: assertar que ambas clases
   están presentes en los dos elementos animados (`jsdom` no ejecuta transiciones reales, así
   que el test es de presencia de clase — la evidencia de comportamiento real vive en el
   registro, no es reproducible en CI).

2. **Marcadores de inicio de trazo superpuestos (candidato D18, Ruling del coordinador — el
   autor lo revisa al leer/aprobar este añadido antes de dispatch).** `A`, `E`, `M` y `P`
   definen (en `src/content/glyphs.ts`) dos trazos que empiezan en el mismo punto exacto; el
   círculo+número del segundo trazo se pinta encima del primero en las mismas coordenadas
   (`TraceCanvas.tsx`, el bloque que mapea `guide-start-{n}`), tapando el «1» por completo.
   Fix: cuando el punto de inicio de un trazo coincide con el de otro trazo de la misma letra,
   desplazar el marcador de cada uno a lo largo de la dirección inicial de *su propio* trazo
   (mismo cálculo que ya existe para el ángulo de la flecha, pero desde el principio del trazo
   en vez del final) lo suficiente para que los círculos no se toquen: el círculo mide 0.07 de
   radio, hacen falta ≥0.14 de distancia entre centros — con A y M, que están casi alineados,
   eso pide ~0.19-0.22 unidades, no un valor pequeño (0.09 no alcanza, quedan a ~0.06 de
   distancia). Trazos con inicio único no se tocan. Test: recorrer las 9 letras de
   `UPPER_GLYPHS` y comprobar que, para cada letra, ningún par de marcadores `guide-start-*`
   queda a menos de 0.14 de distancia entre sí (mutación: quitar el desplazamiento debe romper
   este test para A, E, M y P).

3. **Guía de dirección animada, nueva (decisión del autor, 2026-09-27): reemplaza la pista 2
   de `trace` (el punto simple), no añade un nivel de pista nuevo.** Reutiliza el mecanismo que
   ya existe para `animation="dot"` (`offsetPath`/`offsetDistance` sobre `combinedPathD`, que ya
   recorre los trazos en orden): en vez de un `<circle>`, un marcador con forma de flecha
   (triángulo) con `offset-rotate: auto` para que apunte en la dirección de avance en cada
   instante. Dos usos:
   - **Presentación** (`Presentation.tsx`): tras `onAnimationEnd` del dibujo completo
     (`animation="full"`), encadena esta animación de flecha — no simultánea con el dibujo, va
     después, con la letra ya completa y quieta un instante. Más corta que el dibujo completo
     (el implementador decide la proporción, p. ej. 60% de `animationMs`). Al acabar, se
     muestra «Siguiente» como hoy (el gancho de `onAnimationEnd` se encadena, no se duplica).
   - **Pista 2 de evaluación** (`hint-effects.ts`, acción `animate-dot-along-stroke+play-phoneme`):
     usa esta misma flecha en vez del punto simple, con el mismo audio del fonema. Mismo lugar
     en la secuencia de pistas (1 = pulsar inicio, 2 = esta flecha, 3 = modelo completo) — D15/R29
     no cambian.
   - Con `prefers-reduced-motion: reduce`: en vez de la flecha viajando, se ve la flecha
     estática de fin de trazo (nivel 1, ya existente, ver punto 4) — mismo patrón que `full` con
     el trazo entero.

4. **Flecha estática (nivel 1, fin de cada trazo) más grande.** De ~0.03-0.05 a ~0.06-0.08
   unidades (mismo color `calm-border`, ya al mínimo de contraste aceptado — no se cambia de
   token). Sigue siendo el respaldo visible bajo movimiento reducido para el punto 3.

5. **`trace/Presentation.tsx` no llega al 60% en 768×1024 (Ruling del coordinador — dispositivo
   principal declarado en el README, «uso principal en iPad/iPhone»; no se pregunta, se
   arregla).** Medido con `browser-qa`/Playwright: 47.6% del lado corto en vez de ≥60%.
   Recalcular la fórmula de tamaño con el mismo método que las Tareas 3/4
   (`min(w/vb.w, h/vb.h)` contra el lado corto del viewport) y documentarlo en un comentario,
   igual que el resto del fichero.

**Fuera de esta tarea (Ruling, deferred):** los 58px de más sobre el presupuesto de
`SessionScreen` en 640×360 (apaisado de móvil pequeño), en `trace/Evaluation.tsx` y
`trace/Presentation.tsx`, quedan aplazados — no es el dispositivo principal, y el coste si hace
falta arreglarlo después queda contenido a las mismas clases CSS ya identificadas.

**Commits:** al menos `fix(ui): la animación de trace respeta el movimiento reducido de
verdad` (puntos 1, separado por ser un bug de accesibilidad puro) y
`feat(ui): flecha de dirección animada tras la presentación y en la pista 2, marcadores
separados y lienzo de presentación a tamaño en tableta` (puntos 2-5, o divididos si el
implementador lo ve más claro).

---

## Fuera de alcance de este plan

- Las minúsculas y el interruptor `lowercaseTracing` (Plan 6, D16).
- Desbloquear la Fase 1 y el test Playwright de una sesión de Fase 1 con `trace` (Plan 5,
  D14).
- Exigir orden o dirección de los trazos (D12).
- Reconocer una letra dibujada sin guía, en cualquier posición y tamaño (D13).
- La deuda menor de planes anteriores que no toca estas vistas.

## Notas para el coordinador

- Rama `feat/plan-4-trace` (desde `main` en `8f51a2c`). Ledger versionado desde el primer
  día en `docs/superpowers/2026-09-27-plan-4-registro.md`.
- **Puerta de modelo:** coordinador en Sonnet (`/model sonnet`); implementadores y revisores
  de tarea `model: "sonnet"`; revisión final de la rama `model: "opus"`.
- Orden estricto 1 → 2 → 3 → 4 → 5 → 6. Cortes de sesión tras la 2 y tras la 4; la 5 encontró
  hallazgos en la prueba manual que dieron pie a la 6 (ver el registro); la revisión final va
  después de la 6, en su propia sesión.
- Briefs con `sed -n` sobre este fichero (`grep -n '^## Tarea' <plan>`); el implementador lee
  también la sección del spec que le toca.
- Rulings previstos (desde R30): R30, los pares confundibles aceptados (E↔S, E→P, O↔U), con
  los números del prototipo; R31, `lowercaseTracing` ignorado hasta el Plan 6; R32, el test
  Playwright de §10 aplazado al Plan 5; R33, `EvaluationProps.trace?` opcional para no tocar
  las vistas de toque.
