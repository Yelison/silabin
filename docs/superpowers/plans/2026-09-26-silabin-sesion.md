# Silabín Plan 2: primera sesión jugable (`count-syllables`) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** que un niño juegue de verdad una sesión de `phase0:clap` en el navegador: «Toca para
empezar», mapa, sesión con presentaciones y ejercicios de contar sílabas con pistas, fin de
sesión con estrellas, y el progreso guardado.

**Architecture:** el motor gana una corrida de sesión pura (`engine/session.ts`) que encadena
plan, intentos, resoluciones y cierre; `store/` la envuelve en un store de Zustand que guarda
tras cada paso; `audio/` e `images/` son interfaces con placeholder (`speechSynthesis` y
emoji); `features/` pinta lo que manda la corrida y solo le devuelve respuestas crudas. Una
sola ruta de Next con las pantallas cambiadas en cliente, para no perder el desbloqueo de audio.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19.2.8, TypeScript estricto, Tailwind 4,
Zod 4, Zustand 5 (nuevo), Vitest 5 + jsdom + Testing Library (nuevos), Biome 2.

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md` (§2, §4 Audio, §5, §8
Persistencia, §9). Registro del Plan 1: `docs/superpowers/2026-09-19-plan-1-registro.md`.

**Modo económico (CLAUDE.md):** este plan fija contratos, casos de test y criterios de
aceptación. No trae la implementación completa: el implementador la escribe con TDD. Donde un
detalle es delicado, hay código.

---

## Decisiones de producto tomadas antes de escribir el plan (2026-09-26)

Resueltas con el autor; cierran las «decisiones abiertas» del README.

| # | Decisión | Dónde se aplica |
|---|---|---|
| D1 | Imágenes: **emoji como placeholder** detrás de `src/images/`, clave `img:<palabra>` | Tarea 5 |
| D2 | `basePool` **lanza error** en vez de caer al respaldo global, y un invariante de contenido lo comprueba en `pnpm test` | Tarea 1 |
| D2b | Consecuencia de D2: las 4 unidades de Fase 2 **declaran `initial-sound` con peso 1**, porque es la única plantilla que acepta `phoneme` (hoy la usan sin declararla, por el respaldo) | Tarea 1 |
| D3 | Barril `@/engine`: **reexporta** `curriculum`, `CurriculumIndex`, `templates`, `TemplateId`, `HintStep`, `Item`, `Unit`; **deja de exportar** `owningUnits`, `similarity`, `createRng`, `promote`, `demote`, `MASTERY_TARGET`, `REVIEW_SHARE`, `unitMasteryRatio`. La interfaz importa solo de `@/engine` | Tarea 1 |
| D4 | Currículo agotado (`activeUnitId === null`) → **sesión de solo repaso** planificada por el motor | Tarea 2 |
| D5 | `saveState` → `{ saved: false }`: **aviso discreto para el adulto** y reintento en el siguiente guardado | Tareas 4 y 6 |
| D6 | **Exportación mínima** con gesto oculto de adulto (mantener pulsado el logo 3 s) | Tarea 6 |
| D7 | Hoja de ruta de los planes 3 a 6 del README **confirmada** | Tarea 9 |

## Global Constraints

- Principios del spec §2, sin excepción: sonido y no nombre; sin castigos ni mensajes
  negativos; feedback de fallo neutro («Mmm, otra vez», clave `feedback:retry`) y de menos de
  2 s; pistas de menos a más; presentación antes de evaluar.
- Sin texto para el niño: toda instrucción es audio + icono. Texto visible solo para el adulto
  (avisos, `aria-label`).
- Objetivos táctiles ≥ 72 px; un solo gesto por ejercicio; sin scroll dentro de un ejercicio.
- Ningún audio antes del primer toque (iOS). Todo audio pasa por el `AudioPlayer`.
- Animaciones con `motion-safe:` de Tailwind (respeta `prefers-reduced-motion`). Celebración
  < 4 s y cerrable con un toque.
- `features/` y `components/` importan del motor **solo** `@/engine` (barril), nunca
  `@/content/*` ni `@/engine/<módulo>`. Nunca deciden si una respuesta es correcta.
- `engine/`, `content/`, `images/` y `store/` no importan React ni tocan el DOM.
- Next.js 16 tiene cambios rompedores: antes de escribir código de Next, lee la guía en
  `node_modules/next/dist/docs/01-app/` que corresponda (componentes de cliente, `page.tsx`,
  `layout.tsx`).
- TDD; TypeScript estricto; `any` solo en el borde de `JSON.parse` validado con Zod.
- `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit. Conventional
  Commits en español con el porqué en el asunto.
- Los componentes de React se prueban con `// @vitest-environment jsdom` en la cabecera del
  fichero de test; `vitest.config.ts` sigue en `node` por omisión.

## Review Focus

Cinco situaciones que el spec implica y que ningún test de «camino feliz» cubre. Cada una
tiene su test en la tarea indicada.

1. **Toques mientras suena el audio o después de responder.** Un niño aporrea el tambor:
   los toques durante una pista o tras enviar la respuesta no deben contar ni enviar una
   segunda respuesta. → Tarea 8, casos C6 y C7.
2. **Recargar o salir a mitad de sesión.** El progreso aplicado por ejercicio queda guardado,
   el contador de sesiones no avanza y la sesión siguiente no da crédito de dominio dos veces
   en el mismo índice de sesión. → Tarea 4, caso S9.
3. **Almacenamiento que no guarda** (Safari privado, cuota): el juego sigue, aparece el aviso
   de adulto, y desaparece en cuanto un guardado sale bien. → Tarea 4 (S6, S7) y Tarea 6 (U4).
4. **Documento guardado antes de `a10de1f`** con la Fase 3 en `done`: el mapa la pinta
   bloqueada. → Tarea 4, caso S2, y Tarea 6, caso U3.
5. **Navegador sin `speechSynthesis` o sin voces en español** (y voces que llegan tarde en
   iOS): la sesión se puede jugar sin sonido y sin excepciones. → Tarea 5, casos A6 y A7.

---

## Estructura de archivos

```
src/
  content/
    phase0.ts                modificar: los ítems de clap llevan `syllables`
    phase2.ts                modificar: declarar initial-sound (peso 1)
    invariants.test.ts       modificar: invariante «toda unidad tiene plantilla para sus ítems»
  engine/
    planner.ts               modificar: basePool lanza; modo solo repaso (activeUnitId null)
    apply.ts                 modificar: applySessionEnd acepta unitId null
    session.ts (+ .test.ts)  crear: corrida de sesión pura y checkAnswer
    types.ts                 modificar: SessionLogEntry
    index.ts                 modificar: reexportar y podar (D3)
  store/
    schema.ts                modificar: sessionRecord.unitId nullable
    progress-bridge.ts (+ test)  crear: PersistedState ⇄ ProgressState
    app-store.ts (+ test)    crear: store de Zustand (vanilla)
  audio/
    types.ts                 crear: AudioPlayer, AudioRequest
    speech-player.ts (+ test) crear: placeholder con speechSynthesis y cola
    silent-player.ts         crear: reproductor mudo (sin speechSynthesis, tests)
    index.ts                 crear: barril
  images/
    index.ts (+ test)        crear: imageFor(key) con emoji
  components/
    BigButton.tsx            crear
    use-long-press.ts (+ test) crear
  features/
    app-context.tsx          crear: providers de store y audio
    App.tsx (+ test)         crear: pantallas start | map | session | end
    boundaries.test.ts       crear: nadie en features/components importa lo prohibido
    start/StartScreen.tsx
    map/MapScreen.tsx (+ test)
    adult/SaveWarning.tsx, adult/ExportGesture.tsx (+ tests)
    session/registry.ts (+ test)       qué plantillas sabe pintar la interfaz
    session/SessionScreen.tsx (+ test)
    session/EndScreen.tsx (+ test)
    session/count-syllables/Presentation.tsx, Evaluation.tsx (+ tests)
  app/
    page.tsx, layout.tsx     modificar: montar <App/>; fuente del sistema
```

---

## Tarea 1: Contrato del contenido y del barril

**Riesgo:** motor y contrato motor-interfaz. Revisión completa con mutaciones.

**Files:**
- Modify: `src/engine/planner.ts:37-47` (`basePool`)
- Modify: `src/content/phase2.ts:115-121` (ejercicios declarados de las 4 unidades)
- Modify: `src/content/phase0.ts:21-29` (`clapItems`)
- Modify: `src/content/invariants.test.ts` (o `index.test.ts` si encaja mejor con lo que hay)
- Modify: `src/engine/index.ts`, `src/engine/session.integration.test.ts:4-22`
- Test: `src/engine/planner.test.ts`, `src/engine/index.test.ts` (nuevo)

**Interfaces:**
- Produces: barril `@/engine` con las reexportaciones de D3. Las tareas 6-8 importan de ahí
  `curriculum`, `CurriculumIndex`, `templates`, `TemplateId`, `HintStep`, `Item`, `Unit`.
- Produces: los ítems `oral:clap:*` tienen `syllables: string[]` (las de su imagen), que la
  Tarea 8 usa para las pistas.

**Contrato:**
- `basePool(unit, item)` devuelve las plantillas declaradas por `unit` que aceptan
  `item.kind`; si no hay ninguna, lanza
  `Error("La unidad <unitId> no declara ninguna plantilla para el ítem <itemId> (<kind>)")`.
  Desaparece el respaldo global.
- Las 4 unidades de Fase 2 añaden `{ templateId: "initial-sound", weight: 1 }`.
- Cada `oral:clap:<w>` gana `syllables` igual a las del `picture:<w>`; `task.answer` sigue
  siendo `String(syllables.length)`.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| T1.1 | Invariante sobre `curriculum`: para cada unidad y cada id de `introduces` | existe al menos una plantilla declarada por la unidad cuyo `itemKinds` incluye el `kind` del ítem |
| T1.2 | El mismo invariante sobre un currículo de prueba con una unidad que declara solo `listen-tap` e introduce un `oral-skill` | el invariante lo detecta (el test del invariante debe demostrar que puede fallar) |
| T1.3 | `planSession` con una unidad de prueba así | lanza con un mensaje que contiene el id de la unidad y del ítem |
| T1.4 | `planSession` sobre `phase2:m` activa con `phoneme:m` presentado, varias semillas | los ejercicios de `phoneme:m` usan `initial-sound` (igual que hoy) |
| T1.5 | `oral:clap:pelota` | `syllables` = `["pe","lo","ta"]`, `task.answer` = `"3"` |
| T1.6 | `index.test.ts`: `Object.keys(await import("@/engine"))` | contiene `curriculum`, `templates`; **no** contiene ninguno de los 8 nombres podados |

Los tipos (`TemplateId`, `HintStep`, `Item`, `Unit`, `CurriculumIndex`) se comprueban con
`pnpm typecheck` en un fichero de fixture como los del Plan 1 (`import type {...} from "@/engine"`).

**Pasos:**
- [ ] Escribir T1.1-T1.6 y verlos fallar (T1.1 falla hoy por las unidades de Fase 2: anótalo en el commit).
- [ ] Implementar `basePool`, los datos de `phase2.ts` y `phase0.ts`, y el barril.
- [ ] Mover las importaciones podadas de `session.integration.test.ts` a sus módulos
      (`@/engine/mastery` para `unitMasteryRatio`, etc.). No cambiar su lógica.
- [ ] `grep -rn 'from "@/engine"' src` para confirmar que nadie más usa lo podado.
- [ ] Puertas en verde y commit: `refactor(engine): sin respaldo global de plantillas, el contenido declara todo lo que se planifica`.

**Mutaciones para el revisor:** (1) restaurar el respaldo global en `basePool`; (2) quitar
`initial-sound` de una sola unidad de Fase 2; (3) hacer que el invariante ignore la última
unidad del orden; (4) volver a exportar `unitMasteryRatio` desde el barril. Las cuatro deben
romper un test.

---

## Tarea 2: Sesión de solo repaso y cierre sin unidad

**Riesgo:** motor. Revisión completa con mutaciones.

**Files:**
- Modify: `src/engine/planner.ts` (`planSession`), `src/engine/apply.ts:87-112`
- Modify: `src/engine/types.ts` (añadir `SessionLogEntry`), `src/store/schema.ts:47-53`
- Test: `src/engine/planner.test.ts`, `src/engine/apply.test.ts`, `src/store/schema.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // planner.ts — el parámetro se ensancha
  planSession(input: { content; state; activeUnitId: string | null; sessionLength: 5 | 6; seed: number }): PlannedExercise[]
  // apply.ts
  applySessionEnd(input: { content; state; unitId: string | null; stars: Stars }): ProgressState
  // types.ts
  export type SessionLogEntry = { index: number; unitId: string | null; stars: Stars; endedAt: string };
  ```
- `sessionRecordSchema` pasa a `unitId: z.string().min(1).nullable()` y se ata con
  `satisfies z.ZodType<SessionLogEntry>`, como los demás esquemas del fichero. Ensanchar no
  rompe documentos v1: no hay migración.

**Contrato del modo repaso (`activeUnitId === null`):**
- Candidatos: todos los ítems con `presented === true`.
- Orden: primero los vencidos o presentados en caja 0 (el mismo criterio que el `reviewPool`
  actual), luego por `box` ascendente, `lastSessionIndex` ascendente e id.
- Se toman `sessionLength` evaluaciones, ciclando si hay menos candidatos; todas
  `kind: "evaluation"`, `source: "review"`, sin presentaciones.
- Plantilla: la de la unidad dueña del ítem (`owningUnits`), con el mismo tope por plantilla y
  la misma ordenación final (cierre fácil + sin plantillas iguales seguidas) que el modo normal.
  Reutiliza los helpers; no dupliques la ordenación.
- Opciones: `seen` = todos los ítems introducidos por cualquier unidad.
- Sin candidatos: lanza `Error("No hay nada que repasar: ningún ítem se ha presentado")`.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| T2.1 | Estado con todas las unidades con ítems en `done` (constrúyelo dominando todo con `applyResolution`), `activeUnitId: null`, longitud 5 | 5 ejercicios, todos `evaluation` y `review` |
| T2.2 | Igual, con un ítem en caja 1 y el resto en caja 3 | ese ítem aparece en la sesión |
| T2.3 | Dos llamadas con la misma semilla | resultado idéntico; con otra semilla, distinto en algo |
| T2.4 | Candidatos de varias plantillas | no hay dos plantillas iguales seguidas si existe una disposición posible; el último es de la plantilla de menor dificultad presente |
| T2.5 | `activeUnitId: null` con estado vacío | lanza «No hay nada que repasar…» |
| T2.6 | `applySessionEnd` con `unitId: null`, estrellas 3 | `sessionCounter` y `counters.sessions` +1; ningún `bestStars` cambia |
| T2.7 | `sessionRecordSchema` con `unitId: null` y con `"phase0:clap"` | ambos válidos; con `""` inválido |
| T2.8 | Todos los tests actuales de `planSession` | siguen verdes sin tocarlos (el modo normal no cambia) |

**Pasos:** TDD con T2.1-T2.8, puertas y commit:
`feat(engine): al agotar el currículo la sesión es de solo repaso en vez de fallar`.

**Mutaciones:** (1) en modo repaso incluir ítems no presentados; (2) ordenar por caja
descendente; (3) en `applySessionEnd` con `null` escribir `bestStars` en alguna unidad;
(4) marcar `source: "active-unit"` en el modo repaso.

---

## Tarea 3: Corrida de sesión pura (`engine/session.ts`)

**Riesgo:** motor y contrato con la interfaz. Revisión completa con mutaciones. Es la pieza
que decide la pedagogía de la sesión; la interfaz solo la obedece.

**Files:**
- Create: `src/engine/session.ts`, `src/engine/session.test.ts`
- Modify: `src/engine/index.ts` (exportar lo nuevo)

**Interfaces:**
- Consumes: `planSession`, `activeUnitId`, `applyPresentation`, `applyResolution`,
  `applySessionEnd`, `createAttemptState`, `recordAttempt`, `starsForSession`,
  `newlyEarnedRewardIds`, `totalStars`, `SessionLogEntry` (Tarea 2).
- Produces (todo exportado desde `@/engine`):
  ```ts
  export type SessionRun = {
    sessionIndex: number;            // progress.sessionCounter al empezar
    unitId: string | null;           // unidad activa, o null en sesión de repaso
    exercises: PlannedExercise[];
    cursor: number;                  // ejercicio en curso; === exercises.length al acabar
    attempt: AttemptState;           // del ejercicio en curso
    resolutions: ExerciseResolution[]; // una por evaluación resuelta, en orden
    progress: ProgressState;         // progreso con todo lo aplicado hasta ahora
  };
  export type AttemptFeedback = { hint: HintStep | null; resolution: ExerciseResolution | null };
  export type SessionSummary = {
    progress: ProgressState; stars: Stars; newRewardIds: string[]; entry: SessionLogEntry;
  };

  export function startSession(input: { content: CurriculumIndex; progress: ProgressState; sessionLength: 5 | 6; seed: number }): SessionRun;
  export function currentExercise(run: SessionRun): PlannedExercise | null;
  export function isSessionOver(run: SessionRun): boolean;
  export function completePresentation(run: SessionRun): SessionRun;
  export function checkAnswer(exercise: PlannedExercise, item: Item, answer: string): AttemptOutcome;
  export function submitAnswer(input: { content: CurriculumIndex; run: SessionRun; answer: string; now: string }): { run: SessionRun; feedback: AttemptFeedback };
  export function nextExercise(run: SessionRun): SessionRun;
  export function finishSession(input: { content: CurriculumIndex; run: SessionRun; alreadyUnlocked: readonly string[]; now: string }): SessionSummary;
  ```

**Reglas:**
- `startSession` calcula `unitId = activeUnitId(content, progress)` y llama a `planSession`.
  Recalcula `progress.units` con `recomputeUnitStatuses` antes de planificar.
- `checkAnswer`: si `exercise.correctOptionId !== null`, compara `answer` con él; si no, con
  `item.task?.answer`; si el ítem no tiene respuesta esperable, lanza (plantillas de trazo y
  voz llegarán con su propio evaluador). Nunca normaliza en silencio: `"2"` ≠ `" 2"`.
- `completePresentation`: solo si el ejercicio en curso es `presentation` (si no, lanza);
  aplica `applyPresentation` y avanza el cursor.
- `submitAnswer`: solo sobre una `evaluation` no resuelta (si no, lanza). Delega en
  `recordAttempt`; cuando hay `resolution`, aplica `applyResolution` a `run.progress` y la
  añade a `resolutions`. **No avanza el cursor**: la interfaz aún tiene que celebrar o mostrar
  el modelo.
- `nextExercise`: solo si el ejercicio en curso es una evaluación resuelta (si no, lanza);
  avanza y reinicia `attempt`.
- `finishSession`: solo si `isSessionOver` (si no, lanza). `stars = starsForSession(resolutions)`;
  `progress = applySessionEnd(...)`; `newRewardIds = newlyEarnedRewardIds(alreadyUnlocked, { content, state: progress, totalStars: totalStars(progress) })`;
  `entry = { index: sessionIndex, unitId, stars, endedAt: now }`.
- Todas las funciones son puras: devuelven objetos nuevos, nunca mutan `run`.

**Casos de test** (usa `curriculum` real y `phase0:clap`; `emptyProgressState()` como inicio):

| Id | Entrada | Esperado |
|---|---|---|
| R1 | `startSession` sobre estado vacío, longitud 5, semilla 1 | `unitId: "phase0:clap"`, 2 presentaciones primero, `cursor: 0`, `sessionIndex: 0` |
| R2 | `checkAnswer` con ejercicio sin opciones e ítem `oral:clap:mesa` | `"2"` → `correct`; `"3"` → `wrong`; `" 2"` → `wrong` |
| R3 | `checkAnswer` con `correctOptionId: "x"` | `"x"` → `correct`, cualquier otro → `wrong` |
| R4 | `submitAnswer` sobre una presentación | lanza |
| R5 | `completePresentation` × 2 | cursor 2; los dos ítems con `presented: true` en `run.progress` |
| R6 | Evaluación: respuesta correcta al primer intento | `feedback.resolution = mastery-credit`, `hint: null`, `firstTryCorrect` del ítem = 1, cursor sin cambiar |
| R7 | Evaluación: fallo, fallo, fallo | pistas `reduce`, `sound` y luego `model` con `resolution: assisted`; `assisted` del ítem = 1 |
| R8 | Fallo y luego acierto | `resolution: correct-with-hint (hintsUsed 1)`; el ítem baja a caja 1 |
| R9 | `submitAnswer` sobre evaluación ya resuelta | lanza; `nextExercise` antes de resolver: lanza |
| R10 | Tras `nextExercise` | `attempt` vuelve a `{ attempt: 1, hintsShown: 0, resolved: false }` |
| R11 | Sesión entera acertando todo al primer intento | `finishSession`: 3 estrellas, `entry.index = 0`, `progress.sessionCounter = 1`, `bestStars` de `phase0:clap` = 3 |
| R12 | Sesión con una evaluación asistida de 4 | estrellas según `starsForSession` (las presentaciones no cuentan: `resolutions.length` = nº de evaluaciones) |
| R13 | `finishSession` antes de acabar | lanza |
| R14 | `alreadyUnlocked` contiene un logro que se gana en la sesión | no aparece en `newRewardIds` |
| R15 | Inmutabilidad: guardar la referencia de `run` antes de cada llamada | el objeto original no cambia (`structuredClone` antes y `toEqual` después) |

**Pasos:** TDD con R1-R15, puertas y commit:
`feat(engine): corrida de sesión pura para que la interfaz solo pinte y responda`.

**Mutaciones:** (1) avanzar el cursor dentro de `submitAnswer`; (2) no reiniciar `attempt` en
`nextExercise`; (3) contar las presentaciones en `resolutions`; (4) `entry.index =
sessionIndex + 1`; (5) normalizar la respuesta con `trim()`.

---

## Tarea 4: Puente con la persistencia y store de la aplicación

**Riesgo:** `store/`. Revisión completa con mutaciones.

**Files:**
- Create: `src/store/progress-bridge.ts` (+ test), `src/store/app-store.ts` (+ test)
- Modify: `package.json` (`pnpm add zustand`)

**Interfaces:**
- Consumes: Tarea 3 completa; `loadState`, `saveState`, `exportState`, `StorageAdapter`,
  `createMemoryAdapter` (Plan 1).
- Produces:
  ```ts
  // progress-bridge.ts
  export function toProgress(doc: PersistedState, content: CurriculumIndex): ProgressState; // units recalculadas
  export function withProgress(doc: PersistedState, progress: ProgressState): PersistedState;
  export function appendSession(doc: PersistedState, entry: SessionLogEntry): PersistedState;
  export function unlockRewards(doc: PersistedState, ids: readonly string[], now: string): PersistedState; // no pisa fechas existentes

  // app-store.ts — zustand/vanilla, sin React
  export type AppStoreDeps = { adapter: StorageAdapter; content: CurriculumIndex; now: () => string; seed: () => number };
  export type AppState = {
    status: "loading" | "ready";
    doc: PersistedState;
    progress: ProgressState;          // siempre = toProgress(doc) o run.progress durante una sesión
    recovered: boolean;               // loadState tuvo que rescatar
    saveFailed: boolean;              // último guardado devolvió saved: false
    run: SessionRun | null;
    summary: SessionSummary | null;   // la última sesión terminada, para la pantalla de fin
    load(): Promise<void>;
    beginSession(): void;             // lanza si ya hay run
    presentationDone(): Promise<void>;
    answer(value: string): Promise<AttemptFeedback>;
    next(): void;
    endSession(): Promise<void>;      // lanza si !isSessionOver(run)
    abandonSession(): void;           // salida del adulto: descarta run, conserva lo guardado
    clearSummary(): void;
    retrySave(): Promise<void>;
    exportJson(): string;
  };
  export function createAppStore(deps: AppStoreDeps): StoreApi<AppState>;
  ```
- **Cuándo se guarda:** después de `presentationDone`, de cada `answer` que devuelve
  `resolution`, y de `endSession`. Cada guardado es `saveState(adapter, doc)`; `saveFailed`
  toma `!saved`. El fallo no lanza ni corta la sesión. `retrySave` repite el último documento.
- **`endSession`:** `finishSession` → `withProgress` → `unlockRewards(newRewardIds)` →
  `appendSession(entry)` → guardar → `summary` = resumen, `run = null`.
- `beginSession` usa `doc.settings.sessionLength` y `deps.seed()`.

**Casos de test** (con `createMemoryAdapter` y un adaptador de prueba que falla a voluntad):

| Id | Entrada | Esperado |
|---|---|---|
| B1 | `toProgress` / `withProgress` ida y vuelta | se conservan `settings`, `sessions` y `rewards`; los campos de progreso se sustituyen |
| S1 | `load()` con adaptador vacío | `status: ready`, `recovered: false`, `phase0:clap` activa en `progress.units` |
| S2 | `load()` con un documento que tiene toda la Fase 3 en `done` y nada dominado | `progress.units` las da `locked` (trampa 1 del README) |
| S3 | Sesión completa de clap acertando todo (`beginSession`, `presentationDone`, `answer(String(n))`, `next`… `endSession`) | `doc.sessions` tiene 1 entrada con `index: 0`, `unitId: "phase0:clap"`, `stars: 3`; `summary` no es null; `run` es null |
| S4 | Tras S3, leer el adaptador | el documento guardado es el de S3 y pasa `persistedStateSchema` |
| S5 | Logro ganado en la sesión | `doc.rewards.unlockedAt[id]` = `now()`; una segunda sesión no cambia esa fecha |
| S6 | Adaptador que falla en `write` | `answer` resuelve normalmente; `saveFailed: true` |
| S7 | El adaptador vuelve a funcionar; siguiente guardado (o `retrySave`) | `saveFailed: false` |
| S8 | `endSession` con la sesión a medias | lanza; el estado no cambia |
| S9 | Acertar el primer ítem evaluado, `abandonSession`, `beginSession` de nuevo y acertar el mismo ítem | `sessionCounter` sigue en 0 y `firstTryCorrect` de ese ítem sigue en 1 (sin doble crédito) |
| S10 | `exportJson()` | `importState(exportJson())` devuelve el mismo documento con `recovered: false` |

**Pasos:** `pnpm add zustand`; TDD con los casos; puertas y commit:
`feat(store): store de la aplicación que guarda tras cada paso y avisa si no pudo`.

**Mutaciones:** (1) no recalcular `units` en `toProgress`; (2) no volver a poner
`saveFailed: false` tras un guardado bueno; (3) `unlockRewards` que pisa fechas existentes;
(4) no guardar tras `answer`; (5) incrementar `sessionCounter` en `abandonSession`.

---

## Tarea 5: Audio con placeholder e imágenes con emoji

**Riesgo:** infraestructura. Revisión de cumplimiento más 2 mutaciones sobre la cola.

**Files:**
- Create: `src/audio/types.ts`, `src/audio/speech-player.ts` (+ test), `src/audio/silent-player.ts`, `src/audio/index.ts`
- Create: `src/images/index.ts` (+ test)

**Interfaces:**
```ts
// audio/types.ts
export type PlayStyle = "normal" | "by-syllable" | "beats";
export type AudioRequest = {
  key: string;                          // clave del manifiesto de audio
  style?: PlayStyle;                    // "normal" por omisión
  syllables?: readonly string[];        // obligatorio en by-syllable y beats
  onSegment?: (index: number) => void;  // se llama al empezar cada sílaba
};
export interface AudioPlayer {
  readonly unlocked: boolean;
  unlock(): Promise<void>;              // se llama dentro del gesto «Toca para empezar»
  play(request: AudioRequest): Promise<void>; // resuelve al terminar de sonar
  stop(): void;                         // corta lo que suena y vacía la cola
}

// audio/speech-player.ts
export function createSpeechPlayer(deps: {
  synth: SpeechSynthesis | undefined;
  accent: Accent;
  textFor?: (key: string) => string | undefined; // por omisión, audioManifest
  beat?: () => void;                              // golpe audible; por omisión, un clic con AudioContext
}): AudioPlayer;
export const SYLLABLE_GAP_MS = 350;
export function createSilentPlayer(): AudioPlayer; // resuelve todo al instante; unlocked tras unlock()

// images/index.ts
export type PictureImage = { emoji: string; alt: string };
export function imageFor(imageKey: string): PictureImage | null;
```

**Reglas:**
- `play` antes de `unlock`: resuelve sin sonar (iOS lo bloquearía igualmente).
- Las peticiones se encolan: una no empieza hasta que la anterior resuelve. `stop()` cancela la
  actual (`synth.cancel()`), resuelve las pendientes sin sonar y vacía la cola.
- `by-syllable`: una locución por sílaba, separadas `SYLLABLE_GAP_MS`, llamando a `onSegment(i)`.
  `beats`: igual, con `beat()` antes de cada sílaba.
- Voz: la primera cuyo `lang` coincida con el acento (`do`→`es-DO`, `mx`→`es-MX`,
  `neutro`→`es-US`), si no cualquier `es-*`, y si no la de omisión con `lang` del acento. Las
  voces de iOS llegan tarde: vuelve a elegir en `voiceschanged`.
- Clave sin texto en el manifiesto: `play` rechaza con `Error` (es un error de programación).
- `unlock()` dice una locución vacía y crea y reanuda el `AudioContext` del golpe, todo dentro
  del gesto.
- `imageFor`: tabla con los 35 `img:<palabra>` de `pictures.ts`; `alt` = la palabra. `null`
  para claves desconocidas.

**Casos de test** (con un `SpeechSynthesis` falso que registra utterances y dispara `onend` a mano):

| Id | Entrada | Esperado |
|---|---|---|
| A1 | `play` sin `unlock` | resuelve y no llama a `speak` |
| A2 | `unlock`; `play({key:"word:mesa"})` | una utterance con texto «mesa» |
| A3 | Dos `play` seguidos | la segunda utterance no se crea hasta el `onend` de la primera |
| A4 | `by-syllable` con `["me","sa"]` | dos utterances «me», «sa»; `onSegment` con 0 y 1 en orden |
| A5 | `beats` | `beat` se llama antes de cada sílaba |
| A6 | `synth: undefined` | `unlock` y `play` resuelven sin lanzar |
| A7 | Voces vacías y luego `voiceschanged` con `es-MX` y acento `mx` | la siguiente utterance usa la voz `es-MX` |
| A8 | `stop()` con una sonando y otra en cola | se llama a `cancel`; ambas promesas resuelven; la de la cola nunca llama a `speak` |
| A9 | Clave inexistente | `play` rechaza |
| I1 | Todo `imageKey` de `curriculum.items` | `imageFor` devuelve un emoji no vacío |
| I2 | `imageFor("img:nada")` | `null` |

**Pasos:** TDD, puertas y commit: `feat(audio): voz del navegador tras la interfaz de audio mientras no haya locuciones reales`
(las imágenes pueden ir en un commit aparte: `feat(images): emoji como imagen provisional de cada palabra`).

**Mutaciones:** (1) no esperar a que termine la anterior (A3); (2) `stop` que no resuelve las
pendientes (A8).

---

## Tarea 6: Base de la interfaz: inicio, mapa y avisos de adulto

**Riesgo:** contrato motor-interfaz y datos del niño (exportación). Revisión completa;
mutaciones sobre la jugabilidad de unidades y el gesto.

**Files:**
- Modify: `package.json` (`pnpm add -D jsdom @testing-library/react @testing-library/dom @testing-library/user-event`)
- Modify: `src/app/page.tsx`, `src/app/layout.tsx` (fuente del sistema; quitar Geist y
  `next/font/google`, que necesita red y el spec pide funcionar sin ella)
- Create: `src/components/BigButton.tsx`, `src/components/use-long-press.ts` (+ test)
- Create: `src/features/app-context.tsx`, `src/features/App.tsx` (+ test),
  `src/features/start/StartScreen.tsx`, `src/features/map/MapScreen.tsx` (+ test),
  `src/features/adult/SaveWarning.tsx` (+ test), `src/features/adult/ExportGesture.tsx` (+ test),
  `src/features/session/registry.ts` (+ test), `src/features/boundaries.test.ts`

**Interfaces:**
- Consumes: `createAppStore`/`AppState` (Tarea 4), `AudioPlayer`, `createSpeechPlayer`,
  `createSilentPlayer` (Tarea 5), barril `@/engine` (Tarea 1).
- Produces:
  ```ts
  // app-context.tsx ("use client")
  export function AppProviders(props: { store: StoreApi<AppState>; audio: AudioPlayer; children: ReactNode }): JSX.Element;
  export function useApp<T>(selector: (s: AppState) => T): T;
  export function useAudio(): AudioPlayer;

  // components/use-long-press.ts
  export function useLongPress(onLongPress: () => void, ms: number): {
    onPointerDown; onPointerUp; onPointerLeave; onPointerCancel;
  };

  // features/session/registry.ts — qué sabe pintar la interfaz hoy
  export type TemplateViews = { Presentation: ComponentType<PresentationProps>; Evaluation: ComponentType<EvaluationProps> };
  export const templateViews: Partial<Record<TemplateId, TemplateViews>>; // la Tarea 8 registra count-syllables
  export function isSessionPlayable(content: CurriculumIndex, progress: ProgressState, implemented: ReadonlySet<TemplateId>): boolean;
  export const IMPLEMENTED_TEMPLATES: ReadonlySet<TemplateId>; // new Set(["count-syllables"])
  ```
  Los tipos de props se declaran ya aquí; las tareas 7 y 8 los consumen:
  ```ts
  export type PresentationProps = { exercise: PlannedExercise; item: Item; onDone(): void };
  export type EvaluationProps = {
    exercise: PlannedExercise;
    item: Item;
    attemptKey: number;               // cambia con cada intento nuevo: el componente reinicia su entrada
    feedback: AttemptFeedback | null; // la última respuesta del motor a este ejercicio
    locked: boolean;                  // true mientras suena el feedback: ignorar toques
    onAnswer(answer: string): void;
    onModelDone(): void;              // el niño reprodujo el modelo del 3.er rung
  };
  ```
- `App` tiene el estado de pantalla en React: `"start" | "map" | "session" | "end"`. Carga el
  store en `useEffect` (IndexedDB solo existe en cliente). `page.tsx` es un Server Component
  que monta `<App/>`, y `App` es `"use client"` y crea store y audio una sola vez
  (`createIdbAdapter`; el reproductor, tras `load()`, con
  `createSpeechPlayer({ synth: globalThis.speechSynthesis, accent: doc.settings.accent })`, o
  `createSilentPlayer()` si `speechSynthesis` no existe).

**Reglas de pantalla:**
- **Inicio:** un botón grande con icono ▶ y ningún texto para el niño. El toque llama a
  `audio.unlock()` y pasa al mapa. Nada suena antes.
- **Mapa:** las unidades de `curriculum.unitOrder` agrupadas por fase, con el estado sacado de
  `progress.units` (nunca de `doc.units` sin recalcular). `done` muestra `bestStars`; `locked`,
  un candado; la activa, destacada. **No se pinta ninguna barra de dominio** (trampa 4: nada
  de `unitMasteryRatio`). Tocar la unidad activa inicia sesión solo si `isSessionPlayable`; si
  no, se ve atenuada con el `aria-label` «Llega en una próxima versión» y el toque no hace nada.
  Con `activeUnitId === null` se muestra un botón de repaso, sujeto a la misma comprobación.
- **`isSessionPlayable`:** con unidad activa, todas las plantillas que declara deben estar en
  `implemented`. En modo repaso, todas las de las unidades con algún ítem presentado.
- **SaveWarning:** visible solo con `saveFailed` o `recovered`. Icono gris pequeño en una
  esquina (no rojo, sin aspa), `aria-label` para el adulto. Al tocarlo abre un panel con el
  texto: «El progreso no se está guardando en este dispositivo. Suele pasar en navegación
  privada o sin espacio libre. Exporta el progreso para no perderlo.» (con `recovered`: «Una
  parte del progreso guardado estaba dañada y se ha recuperado lo que se pudo.»), un botón
  «Reintentar» (`retrySave`) y otro «Cerrar».
- **ExportGesture:** envuelve el logo del mapa. Mantenerlo 3 s (`useLongPress`) llama a
  `download(filename, exportJson())`, con `filename = silabin-progreso-<YYYY-MM-DD>.json`. La
  función `download` se inyecta por props (en producción, Blob + `URL.createObjectURL` + `<a
  download>`); así el test no toca el DOM de descargas.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| U1 | Render de `App` con store en memoria y reproductor falso | se ve el botón de inicio; `play` no se ha llamado |
| U2 | Tocar inicio | `unlock` llamado; se ve el mapa con `phase0:clap` activa |
| U3 | Store cargado con la Fase 3 en `done` en disco | el mapa la pinta bloqueada |
| U4 | Adaptador que falla + una sesión que guarda | aparece el aviso; tras un guardado bueno, desaparece |
| U5 | Pulsar el logo 2,9 s y soltar; luego 3 s | 0 descargas; después 1, con JSON válido para `importState` |
| U6 | `isSessionPlayable` con `phase0:clap` activa y `{count-syllables}` | `true`; con `phase0:rhyme` activa, `false`; con el conjunto vacío, `false` |
| U7 | Tocar una unidad activa no jugable | no cambia de pantalla |
| U8 | `boundaries.test.ts`: recorre `src/features` y `src/components` | ningún import de `@/content`, `@/engine/…`, `@/store/persist` ni `@/store/schema` |
| U9 | `useLongPress` con temporizadores falsos | dispara a los `ms` exactos; `pointerup`, `pointerleave` o `pointercancel` antes lo cancelan |

**Pasos:** instalar dependencias; TDD; comprobar a mano con `pnpm dev` que carga en el
navegador; puertas y commit (se pueden separar):
`feat(ui): inicio y mapa que leen el progreso recalculado y avisan al adulto si no se guarda`.

**Mutaciones:** (1) el mapa lee `doc.units` en vez de `progress.units`; (2) `isSessionPlayable`
con «alguna» en vez de «todas»; (3) `useLongPress` sin cancelar en `pointerleave`.

---

## Tarea 7: Pantalla de sesión y de fin

**Riesgo:** contrato motor-interfaz. Revisión completa; mutaciones sobre el orden de los
eventos.

**Files:**
- Create: `src/features/session/SessionScreen.tsx` (+ test), `src/features/session/EndScreen.tsx` (+ test)
- Modify: `src/features/App.tsx` (pantallas `session` y `end`)

**Interfaces:** consume `PresentationProps`, `EvaluationProps` y `templateViews` de
`registry.ts` (Tarea 6), y el store completo (Tarea 4).

**Flujo de `SessionScreen`** (obedece al store, no decide nada):
1. Arriba, barra de progreso con `cursor / exercises.length` y, en una esquina, el botón de
   salir para el adulto: `useLongPress` de 1,5 s → `abandonSession()` → mapa. Un toque corto no
   hace nada, para que el niño no salga sin querer.
2. Ejercicio `presentation` → `templateViews[templateId].Presentation`; `onDone` →
   `presentationDone()`.
3. Ejercicio `evaluation` → `Evaluation`. Al montarse cada ejercicio suena
   `instruction:<templateId>`. `onAnswer(a)` → `locked = true` → `answer(a)` → según el feedback:
   - `resolution` y no `assisted`: suena `celebrate:correct`, animación breve, `next()`.
   - `hint` sin `resolution`: suena `feedback:retry` (el único sonido de fallo), luego la
     `Evaluation` ejecuta la pista; `attemptKey + 1`; `locked = false`.
   - `assisted`: la `Evaluation` muestra el modelo; al completarlo llama a `onModelDone` →
     `next()`. No suena `feedback:retry` dos veces.
4. Cuando `isSessionOver(run)` → `endSession()` → pantalla `end`.
5. Una plantilla sin vista registrada no debería llegar aquí (el mapa lo impide); si llega,
   `abandonSession()` y vuelta al mapa, sin error visible para el niño.

**`EndScreen`:** tantas estrellas como `summary.stars` (icono, `aria-label` «N estrellas»);
suena `celebrate:session`; si hay `newRewardIds`, además `reward:new` y un icono de premio
por logro (su nombre, de `REWARDS`, solo en `aria-label`). Dura menos de 4 s de animación;
un toque en cualquier sitio → `clearSummary()` → mapa.

**Casos de test** (vistas falsas registradas en el test para aislar la pantalla de la Tarea 8):

| Id | Entrada | Esperado |
|---|---|---|
| E1 | Sesión que empieza por presentación | se pinta la `Presentation` falsa; `onDone` avanza a la siguiente |
| E2 | La `Evaluation` falsa responde bien | se reproduce `celebrate:correct` y el cursor avanza |
| E3 | Responde mal | `feedback:retry` y **ningún** `celebrate:*`; `attemptKey` cambia; la `Evaluation` recibe la pista `reduce` |
| E4 | Tres fallos | la tercera vez `feedback` trae `model` y `assisted`; el cursor no avanza hasta `onModelDone` |
| E5 | `onAnswer` dos veces seguidas sin esperar | solo se registra un intento (`locked`) |
| E6 | Toque corto en salir; luego 1,5 s | lo primero no hace nada; lo segundo vuelve al mapa y `run` es null |
| E7 | Última evaluación resuelta | aparece la pantalla de fin con las estrellas de `summary` |
| E8 | `EndScreen` con un logro nuevo | suenan `celebrate:session` y `reward:new`; un toque vuelve al mapa |

**Pasos:** TDD, puertas y commit: `feat(ui): pantalla de sesión que obedece a la corrida del motor`.

**Mutaciones:** (1) avanzar tras `assisted` sin esperar a `onModelDone`; (2) no bloquear la
entrada durante el feedback; (3) sonar `celebrate:correct` también en `assisted`.

---

## Tarea 8: `count-syllables` de punta a punta

**Riesgo:** pedagogía (pistas) y contrato. Revisión completa con mutaciones.

**Files:**
- Create: `src/features/session/count-syllables/Presentation.tsx` (+ test),
  `src/features/session/count-syllables/Evaluation.tsx` (+ test)
- Modify: `src/features/session/registry.ts` (registrar la plantilla)

**Interfaces:** consume `PresentationProps`/`EvaluationProps` (Tarea 6), `useAudio`,
`imageFor`. Produce `templateViews["count-syllables"]`.

**Constantes:** `TAP_SETTLE_MS = 1500` (silencio que cierra la respuesta) y `MAX_TAPS = 5`.

**Presentación** (introducción sin error, spec §2): imagen grande (emoji de
`imageFor(item.imageKey)`), suena la palabra (`word:<w>`) y luego la misma con estilo `beats` y
una luz por sílaba (`onSegment`). Cuando termina, aparece un botón grande «siguiente» (icono) →
`onDone`. No hay nada que acertar.

**Evaluación:**
- Imagen grande, un botón de volver a oír (icono de altavoz, suena `word:<w>`), un tambor
  grande (≥ 72 px, idealmente mucho mayor) y una fila de círculos que se encienden con cada toque.
- Cada toque en el tambor: enciende un círculo y suena `beat`. Tope de `MAX_TAPS`.
- Tras `TAP_SETTLE_MS` sin toques y con al menos uno → `onAnswer(String(toques))`. Durante
  `locked`, los toques se ignoran y no reinician el temporizador.
- Pista según `feedback.hint.action` (las acciones son las de `templates["count-syllables"]`):
  - `replay-by-syllable+light-per-syllable`: `play({ key: word, style: "by-syllable", syllables, onSegment })`, con una luz por sílaba.
  - `replay-with-audible-beats`: `play({ key: word, style: "beats", syllables })`.
  - `prefill-circles+await-taps`: se pintan `syllables.length` círculos marcados; el niño los
    toca uno a uno (cada toque, un `beat`); al tocar el último → `onModelDone`. No hay
    `onAnswer`: el 3.er rung garantiza el acierto.
- Con cada `attemptKey` nuevo, los círculos vuelven a cero.
- Las sílabas salen de `item.syllables` (Tarea 1). Las pistas no dicen el número: sonido, no
  cifra.

**Casos de test** (temporizadores falsos y un `AudioPlayer` falso que registra peticiones):

| Id | Entrada | Esperado |
|---|---|---|
| C1 | Presentación de `oral:clap:mesa` | peticiones `word:mesa` y luego `beats` con `["me","sa"]`; `onDone` solo tras tocar siguiente |
| C2 | Dos toques y 1500 ms | `onAnswer("2")` una sola vez |
| C3 | Dos toques, 1400 ms, un toque, 1500 ms | `onAnswer("3")` |
| C4 | Siete toques | como mucho 5 círculos; `onAnswer("5")` |
| C5 | Ningún toque y 5 s | no se llama a `onAnswer` |
| C6 | `locked: true` y tres toques | ni círculos ni `onAnswer` |
| C7 | Tras `onAnswer`, más toques antes de que llegue el feedback | no hay segundo `onAnswer` |
| C8 | `feedback` con el rung `reduce` | petición `by-syllable` con las sílabas; se enciende una luz por `onSegment` |
| C9 | Rung `sound` | petición `beats` |
| C10 | Rung `model` en `pelota` | 3 círculos marcados; `onModelDone` solo al tocar el tercero; ningún `onAnswer` |
| C11 | Cambia `attemptKey` | los círculos vuelven a cero |
| C12 | Integración: `App` con store en memoria, `phase0:clap`, pantalla por pantalla hasta el fin acertando con los toques correctos | aparece `EndScreen` con 3 estrellas y el adaptador tiene la sesión guardada |

**Pasos:** TDD; `pnpm build` en verde; prueba manual con `pnpm dev` en el navegador (y, si
se puede, en un iPhone o iPad en la misma red con `pnpm dev --hostname 0.0.0.0`) jugando una
sesión completa; puertas y commit:
`feat(ui): contar sílabas con el tambor, con pistas de menos a más`.

**Mutaciones:** (1) reiniciar el temporizador con toques durante `locked`; (2) llamar a
`onAnswer` en el rung `model`; (3) no reiniciar los círculos al cambiar `attemptKey`;
(4) `TAP_SETTLE_MS` contado desde el primer toque y no desde el último.

---

## Tarea 9: Cierre de documentación

**Riesgo:** documentación. Revisión de cumplimiento, sin mutación.

**Files:** `README.md`

- [ ] Estado: el Plan 2 se puede jugar (sesión de `phase0:clap`); número de tests.
- [ ] «Decisiones abiertas»: pasan a «Decisiones tomadas» con D1-D7 y un enlace a este plan.
- [ ] Trampas: marcar como resueltas las 1, 2, 3, 5, 6, 7 y 8 y dónde; la 4 queda como regla
      viva (`unitMasteryRatio` ya no sale del barril).
- [ ] Arquitectura: `audio/`, `images/`, `features/` y `components/` pasan a hechos en parte.
- [ ] Hoja de ruta 3-6 confirmada (D7), quitando «propuesta sin confirmar». Añadir al Plan 3
      que `hear-it` es suya, y a «Después», las locuciones de sílabas sueltas para las pistas
      de `count-syllables` (hoy las dice `speechSynthesis` a partir del texto).
- [ ] Deuda menor nueva que haya salido en el registro del Plan 2.
- [ ] Commit: `docs: README con el Plan 2 jugable y las decisiones cerradas`.

---

## Fuera de alcance de este plan

- Framer Motion: las animaciones de este plan son transiciones CSS de Tailwind. Llega con las
  celebraciones del Plan 6 si hace falta.
- Serwist/PWA, Playwright y el panel de padres con PIN: Plan 6.
- El resto de plantillas: Plan 3 en adelante. El mapa las muestra atenuadas hasta entonces.
- Importar progreso desde la interfaz: Plan 6 (exportar sí entra, D6).

## Notas para el coordinador

- Rama `feat/plan-2-sesion`. Ledger versionado desde el primer día en
  `docs/superpowers/2026-09-26-plan-2-registro.md`, con el del Plan 1 como modelo.
- Orden estricto 1 → 9; cada tarea depende de las anteriores. Sesión nueva cada 2-3 tareas:
  cortes naturales tras la 2, la 4, la 6 y la 8.
- Briefs con `sed -n` sobre este fichero (`grep -n '^## Tarea' docs/superpowers/plans/2026-09-26-silabin-sesion.md`).
- Rulings ya previsibles para el ledger: el mapa decide la **jugabilidad** (qué sabe pintar la
  interfaz), no la pedagogía; `abandonSession` no cuenta la sesión (el crédito ya aplicado se
  conserva y el índice de sesión se reutiliza, sin doble crédito por S9).
