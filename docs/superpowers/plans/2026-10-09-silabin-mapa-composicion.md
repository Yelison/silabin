# Silabín Plan 9, composición completa del mapa: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** llevar el mapa a la composición de `docs/visual-refactor/map-preview.html`:
- una cabecera fija con el wordmark, «★ n» y el candado de padres;
- una tarjeta de capítulo por fase con su color de mundo;
- un camino de una columna con ondas en teléfono;
- un pie fijo con «Mis premios», ▶ Jugar y el compañero;
- Nunito en la interfaz;
- y la app abre directamente en el mapa, sin pantalla de inicio.

**Architecture:**
- `MapScreen` pasa a ser una pantalla de alto fijo en tres filas: cabecera, zona desplazable con el camino, y pie.
- Cabecera, pie y tarjeta son componentes propios de `features/map/`.
- `serpentine.ts` gana la disposición en onda (función pura, sin medir el DOM, como MP7) y sustituye a la rejilla de 2 columnas. Las de 3 y 5 no cambian.
- La lógica del primer toque (desbloquear el audio y comprobar la actualización, S11) sale de `StartScreen` a un gancho que usa `App` al iniciar sesión.
- El motor no cambia.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Vitest, Biome y Playwright. Sin dependencias nuevas; Nunito llega por `next/font/google`, como hoy Andika.

**Spec:** `docs/superpowers/2026-10-09-plan-9-registro.md`. Su primera parte es el spec de este plan: D46-D60 con el autor y los rulings MC1-MC14. Por encima de él están `docs/superpowers/specs/2026-09-18-silabin-design.md` §2 y §9 y la skill `.claude/skills/silabin-design/SKILL.md`.

**Ledger:** el mismo fichero. Cada despacho registra allí rondas, mutaciones y rulings nuevos (prefijo `MC` a partir de MC15).

## Global Constraints

- `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit. Conventional Commits en español, con el porqué en el asunto.
- `features/` y `components/` importan solo `@/engine`, `@/speech`, `@/store` y `@/audio` (`boundaries.test.ts`). Lo que viene de `content/` se reexporta por `@/engine`.
- El mapa pinta lo que dicen `progress.units`, `activeUnitId`, `unitProgress`, `totalStars` e `isSessionPlayable`. No decide qué unidad se juega.
- Colores solo por utilidad de token (`bg-world-0`…), sin hex en las vistas. Un color nuevo es un token en `globals.css` con su par en `tokens.test.ts`.
- Clases de Tailwind siempre literales: nada de plantillas que monten nombres de clase (MC13 y E4). Sin `px` en `style`.
- Todo texto o indicador va sobre una superficie opaca de token (LE1-LE5). Se atenúa el contenido, nunca el botón.
- Bloqueado y «soon» llevan `aria-disabled="true"`, nunca `disabled` (MP1).
- Objetivos del niño ≥ 72 px. El candado es control de adulto: pequeño, unos 44 px, y solo con pulsación larga de 3 s (`AdultDoor`).
- Nada de lenguaje de castigo. Las estrellas muestran solo lo ganado (D59).
- Las animaciones nuevas, si las hay, van tras `motion-safe:`. No se añade ninguna obligatoria.
- Toda la tarjeta de capítulo va en `ink`, también el antetítulo. `ink-soft` no llega a 4,5 : 1 sobre las bases lila y cielo.
- Los nombres visibles exactos son:
  - `aria-label` «Jugar», «Repasar» y «Llega en una próxima versión» (`LLEGA_DESPUES`);
  - «Mis premios»;
  - candado «Panel de padres»;
  - antetítulo «MUNDO N»;
  - mundos «Oído de explorador», «Las vocales», «Las sílabas» y «Más letras».

## Review Focus

1. **Doble toque durante la primera comprobación de actualización** (hasta 1 s): debe arrancar una sola sesión. Test AR6 de la Tarea 2.
2. **Teléfono en horizontal** (844 × 390, `apaisado-bajo:`): entre la cabecera y el pie tienen que verse el nodo activo entero y su aro, sin scroll horizontal. Lo cubre el e2e LY3 de la Tarea 4.
3. **El aviso de fallo de guardado** (`SaveWarning`, arriba a la derecha) y `SavedMark` **no pueden tapar el candado**: si lo tapan, el adulto no llega al panel cuando más falta hace. Lo cubre el e2e LY4 de la Tarea 4.
4. **Texto de aprendizaje que no lleva `font-reading`**: con Nunito como `--font-sans` pasaría a una «a» de dos pisos (D28). Lo cubren la auditoría y el test FN3 de la Tarea 1.
5. **Fondo equipado oscuro (Espacio)**: «Jugar», «Mis premios», «MUNDO N» y los nombres de mundo tienen que ir sobre una superficie opaca. Lo cubre la ampliación de `legibility.test.tsx` (LE6) en la Tarea 4.

---

## Tarea 1: nombres de mundo, tokens y Nunito

**Riesgo:** datos, tokens y configuración. **Effort:** `medium`. Revisión de cumplimiento, sin mutación.

**Files:**
- Create: `src/content/worlds.ts`, `src/content/worlds.test.ts`
- Modify: `src/engine/index.ts` (reexporta `worldName`)
- Modify: `src/app/globals.css` (tokens y `--font-sans`, peso base)
- Modify: `src/app/tokens.test.ts` (pares nuevos)
- Modify: `src/app/layout.tsx`, `src/app/layout.test.ts`

**Interfaces (produce):**
```ts
// src/content/worlds.ts
/** Nombre del mundo de cada fase, para el adulto (D58). La fase 0 es el «Mundo 1» (MC5). */
export const WORLD_NAMES: Readonly<Record<number, string>>;
/** El nombre de la fase; lanza RangeError si la fase no tiene nombre. */
export function worldName(phase: number): string;
```
- Tokens: `--color-world-0` #d8ccff (lila), `--color-world-1` #cbeaff (cielo), `--color-world-2` #ffd8c2 (melocotón) y `--color-world-3` #e9e2d7 (beis).
- `--color-brand`: un ámbar oscuro para el wordmark (MC8). El implementador elige el valor más cercano a #b86f13 que pase 4,5 : 1 sobre `card`; algo como #9a5b00. Se pide 4,5 y no 3 para no abrir una categoría de «texto grande» en el test. Lo registra como ruling.
- Nunito con `variable: "--font-nunito"` y pesos `600`, `700` y `800`. `--font-sans` pasa a `var(--font-nunito), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. `body` lleva `font-weight: 600` (skill: «nunca por debajo de 600»). `--font-reading` sigue siendo Andika.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| MW1 | cada `unit.phase` de `curriculum.units` | `worldName(phase)` no lanza y no es vacío |
| MW2 | fases 0, 1, 2 y 3 | «Oído de explorador», «Las vocales», «Las sílabas» y «Más letras» |
| MW3 | `worldName(99)` | lanza `RangeError` |
| CO1 (ampliado) | `ink` sobre `world-0` … `world-3`, y `brand` sobre `card` | ≥ 4,5 : 1. Además, `ink` sobre cada `world-*` ≥ 7 : 1, en un `it` propio como pide la skill |
| CO2 | los tokens nuevos | ninguno es rojo ni verde intenso (ya lo cubre el bucle) |
| FN1 | fuente de `layout.tsx` | importa `Nunito` con los pesos `600`, `700` y `800` y `variable: "--font-nunito"`; el `className` de `<html>` lleva `andika.variable` y `nunito.variable` |
| FN2 | `globals.css` | `--font-sans` empieza por `var(--font-nunito)`, `--font-reading` sigue en `var(--font-andika)` y `body` lleva `font-weight: 600` |

- [ ] **Paso 1:** escribe MW1-MW3 y los pares de CO1 y FN1-FN2. Comprueba que fallan.
- [ ] **Paso 2:** implementa `worlds.ts`, la reexportación, los tokens, Nunito y el peso base. Comprueba que pasan.
- [ ] **Paso 3, auditoría (Review Focus 4):** busca en `src/features/session/` y `src/components/` todo texto de aprendizaje (letras, sílabas o palabras que el niño lee) que no herede `font-reading`. Revisa `OptionCard` y las nueve plantillas.
  - Si encuentras alguno, añade `font-reading` y un test FN3 en `legibility.test.tsx` (o en el test de la plantilla) que asegure la clase en ese elemento.
  - Si no hay ninguno, añade igualmente FN3 sobre `OptionCard` con texto: el `font-reading` está en el elemento que pinta la etiqueta.
  - Reporta la lista revisada.
- [ ] **Paso 4:** `pnpm test 2>&1 | tail -15`, `pnpm typecheck` y `pnpm lint`. Commit: `feat(map): nombres de mundo, tokens de capítulo y Nunito en la interfaz, sin tocar la letra de lectura`.

**Aceptación:**
- MW1-MW3, CO1, FN1, FN2 y FN3 en verde.
- `--font-reading` sin cambios.
- Ningún hex fuera de `globals.css`.

---

## Tarea 2: la app abre en el mapa, y el primer toque hace lo que hacía `StartScreen`

**Riesgo:** contrato de arranque, con el audio de Safari y las actualizaciones de la PWA (S11). **Effort:** `high`. Revisión completa con 3-5 mutaciones.

**Files:**
- Create: `src/features/start/use-arranque.ts`, `src/features/start/use-arranque.test.tsx`
- Delete: `src/features/start/StartScreen.tsx`, `src/features/start/StartScreen.test.tsx`
- Modify: `src/features/App.tsx`
- Modify: `src/features/App.test.tsx` (líneas 37 y 70)
- Modify: `src/features/Panel.integration.test.tsx:58`
- Modify: `e2e/helpers/documentos.ts:64-67`, `e2e/fase1.spec.ts:19-21` y `e2e/offline.spec.ts:9,71`

**Interfaces:**
```ts
// src/features/start/use-arranque.ts
/**
 * Devuelve `arrancar`, que va dentro del gesto (onClick) que inicia una sesión.
 * Siempre: `audio.unlock()` síncrono, sin await (Safari exige que empiece en el gesto).
 * Solo la primera vez por montaje: la comprobación de S11 con los tiempos de hoy
 * (ESPERA_ACTUALIZACION_MS = 1000, ESPERA_RECARGA_MS = 3000) antes de llamar a `onStart`.
 * Mientras esa primera comprobación está pendiente, las llamadas nuevas se ignoran.
 * Después: `onStart()` directamente.
 */
export function useArranque(
	onStart: () => void,
	applyUpdate?: (signal: AbortSignal) => Promise<boolean>,
): () => void;
```
- La lógica actual está en `StartScreen.tsx:7-80`: `contenedorReal`, `actualizacionReal` y el cuerpo del `onClick`. Se mueve tal cual, con su comentario.
- Para no recrear la función en cada render, el estado (ya comprobado / pendiente) vive en `useRef`.
- En `App.tsx`, el estado inicial de `screen` pasa a `"map"` y desaparece `"start"` del tipo `Screen`.
- `Screens` llama al gancho **antes** del `return null` de carga (regla de los hooks):
  ```ts
  const arrancar = useArranque(() => { beginSession(); setScreen("session"); });
  ```
  y pasa `onStart={arrancar}` a `MapScreen`. `MapScreen` no cambia su contrato.

**Casos de test (`use-arranque.test.tsx`, con `renderHook` y temporizadores falsos).** Los cinco primeros son los de `StartScreen.test.tsx`, portados; monta el audio de prueba como lo hace ese fichero.

| Id | Situación | Esperado |
|---|---|---|
| AR1 (H4) | `applyUpdate` resuelve `true` | `onStart` no se llama antes de 3 s |
| AR2 (M2) | resuelve `true` y la recarga no llega | a los 3 s, `onStart` una vez |
| AR3 (M2) | pasa 1 s sin resolver | la señal está abortada y `onStart` se llamó una vez; resolver tarde no lo vuelve a llamar |
| AR4 (H4) | resuelve `false` | `onStart` una vez, sin esperar al segundo |
| AR5 | `applyUpdate` rechaza | `onStart` una vez |
| AR6 (Review Focus 1) | `arrancar()` dos veces seguidas con `applyUpdate` pendiente, luego resuelve `false` | `onStart` una sola vez y `applyUpdate` llamado una sola vez |
| AR7 | primera llamada resuelta; segunda `arrancar()` | `onStart` se llama en el acto (síncrono) y `applyUpdate` no se vuelve a llamar |
| AR8 | cualquier `arrancar()` | `audio.unlock` se llama de forma síncrona en esa misma llamada, antes de cualquier `await` |

**`App.test.tsx`:**
- `iniciar` ya no busca «Empezar»: tras cargar, espera el mapa (el botón «Jugar» o `[data-status="active"]`).
- El test de la línea 70 pasa a asertar que, durante la carga, no hay mapa.
- Añade **AP1**: tras cargar, sin ningún toque, se ve el mapa y no existe ningún botón «Empezar».

**e2e:**
- `empezar(page)` en `documentos.ts` pasa a esperar el mapa (`[data-status="active"]` o el wordmark) sin hacer clic. Se queda el nombre de la función para no tocar a sus llamadores.
- En `fase1.spec.ts` y `offline.spec.ts`, quita el clic en «Empezar».
- J3 (`offline.spec.ts:11-20`) sigue manteniendo el `heading` «Silabín» hasta la Tarea 4, que lo mueve al candado.

**Mutaciones que hay que probar y reportar:**
1. Quitar la bandera de «primera vez»: debe morir AR7.
2. Quitar el ignorar mientras está pendiente: debe morir AR6.
3. Mover `unlock` dentro del `.then`: debe morir AR8.
4. No abortar la señal al vencer el segundo: debe morir AR3.
5. La primera vez, llamar a `onStart` antes de que se resuelva la comprobación: debe morir AR1.

- [ ] **Paso 1:** escribe AR1-AR8 y AP1. Comprueba que fallan.
- [ ] **Paso 2:** crea el gancho moviendo la lógica, cambia `App` y borra `StartScreen` y su test.
- [ ] **Paso 3:** ajusta `App.test`, `Panel.integration` y los e2e. Corre `pnpm exec playwright test e2e/fase1.spec.ts e2e/offline.spec.ts 2>&1 | tail -15`.
- [ ] **Paso 4:** puertas y commit: `feat(app): la app abre en el mapa y el primer toque de juego desbloquea el audio y busca la actualización`.

**Aceptación:**
- AR1-AR8 y AP1 en verde, y las cinco mutaciones mueren.
- No queda ninguna referencia a `StartScreen` ni a «Empezar» en `src/` ni en `e2e/`.
- Los e2e tocados, en verde.

---

## Tarea 3: onda de una columna en teléfono, tarjetas de capítulo y estrellas sin ☆

**Riesgo:** lógica nueva de disposición y el contrato visual del mapa. **Effort:** `high`. Revisión completa con 3-5 mutaciones. Skills: `silabin-design` y `frontend-design:frontend-design`.

**Files:**
- Modify: `src/features/map/serpentine.ts`, `src/features/map/serpentine.test.ts`
- Create: `src/features/map/ChapterCard.tsx`, `src/features/map/ChapterCard.test.tsx`
- Modify: `src/features/map/MapScreen.tsx`
  - `FASES`, `CAMINO`, `CELDA`, `posicion` y `Camino` (líneas 32-61 y 158-228);
  - el separador y la sección de fase (284-316);
  - `UnitDots` (140-155), que se mueve a `ChapterCard`.
- Modify: `src/features/map/MapNode.tsx:53` (☆) y `MapNode.test.tsx`
- Modify: `src/features/map/MapScreen.test.tsx`: S1, S2, E2 y «una unidad terminada muestra sus mejores estrellas»
- Modify: `e2e/mapa.spec.ts` si algún selector depende de `data-columns`

**Interfaces:**
```ts
// serpentine.ts. Se conservan Cell, serpentine y serpentinePath.
/** Las tres disposiciones, por punto de corte: base (< 768 px), md y lg. */
export const DISPOSICIONES = ["base", "md", "lg"] as const;
export type Disposicion = (typeof DISPOSICIONES)[number];
/** Columnas de la rejilla de cada disposición: la onda usa 5 para que el vaivén sea suave. */
export const COLUMNAS: Record<Disposicion, number>; // { base: 5, md: 3, lg: 5 }
/** Onda de una columna: un nodo por fila, columnas 2, 3, 2, 1 en ciclo (MC3). */
export function wave(count: number): Cell[];
/** Curvas que unen los centros fila a fila, con tangente vertical; "" con menos de 2 celdas. */
export function wavePath(cells: readonly Cell[]): string;
/** Celdas de cada disposición: base → wave, md → serpentine(n, 3), lg → serpentine(n, 5). */
export function layoutCells(count: number): Record<Disposicion, Cell[]>;
/** El trazo de una disposición: wavePath en base, serpentinePath en las otras. */
export function layoutPath(d: Disposicion, cells: readonly Cell[]): string;
/** Filas de la rejilla: count en base, ceil(count / columnas) en las otras. */
export function layoutRows(d: Disposicion, count: number): number;

// ChapterCard.tsx
export function ChapterCard(props: {
	phase: number;
	/** Ítems dominados de la unidad activa si es de esta fase y > 0; si no, null. */
	mastered: number | null;
}): React.ReactElement;
```

**La onda (código delicado).** Centro de la celda: `(col + 0.5, row + 0.5)`. Entre dos celdas consecutivas:
```ts
d += `C${x0} ${y0 + 0.5} ${x1} ${y1 - 0.5} ${x1} ${y1}`;
```
- La línea parte de `M${x0} ${y0}`.
- El `viewBox` de la onda es `0 0 5 ${count}`, con `preserveAspectRatio="none"` y `vector-effect="non-scaling-stroke"`, como hoy.
- La rejilla base pasa de `grid-cols-2` a `grid-cols-5`.
- Las variables CSS de la base se renombran de `--c2`/`--r2` a `--cb`/`--rb`.
- El `data-columns` del SVG pasa a `data-layout="base|md|lg"`.

**`ChapterCard`:**
- No es una región propia. La `<section aria-label="Fase N">` de hoy se conserva y envuelve, en este orden, la `ChapterCard` (un `<div>`) y el `<div>` de la rejilla del camino, que se queda con las clases `relative grid …` que hoy lleva la sección. Así el test «pinta las unidades agrupadas por fase» no se reescribe.
- Fondo `bg-world-N` por un registro literal fase → clase (MC13). Las fases sin token caen en `bg-world-3`.
- Antetítulo «MUNDO {phase + 1}» en mayúsculas pequeñas con tracking, y el nombre (`worldName`) en Nunito 800. Todo en `text-ink`.
- Borde inferior de 4 px, como la referencia, con un token existente y sin opacidad (por ejemplo `border-node-locked-depth`). El implementador elige el token y lo registra como ruling.
- A la derecha, si `mastered !== null`, los puntos de `UnitDots`, movidos tal cual: mismos `role`, `aria-label` y `data-unit-dot`. Sin icono (MC2).
- El separador discontinuo desaparece: la tarjeta lo sustituye y el camino se corta en ella (D50).

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| ON1 | `wave(5)` | filas 0-4 y columnas 2, 3, 2, 1, 2 |
| ON2 | `wave(0)`, `wave(1)` | `[]` y una celda; `wavePath` de ellas, `""` |
| ON3 | `wavePath(wave(2))` | `"M2.5 0.5C2.5 1 3.5 1 3.5 1.5"` |
| ON4 | `wave(-1)`, `wave(1.5)` | `RangeError` |
| ON5 | `layoutRows("base", 8)`, `("md", 8)`, `("lg", 8)` | 8, 3 y 2 |
| ON6 | `layoutCells(8)` | `md` y `lg` iguales a `serpentine(8, 3)` y `serpentine(8, 5)` |
| S1 (reescrito) | la séptima unidad de la Fase 3 | `--cb`/`--rb` son (3, 7) en base; las de 3 y 5 columnas, como hoy |
| S2 (reescrito) | cada fase | tres SVG con `data-layout` base, md y lg y `viewBox` `0 0 5 n`, `0 0 3 ceil(n/3)` y `0 0 5 ceil(n/5)`; conservan `fill="none"`, `vector-effect` y la clase del trazo |
| CA1 | `ChapterCard` fase 0, `mastered` null | «MUNDO 1» y «Oído de explorador» visibles, clase `bg-world-0`, sin `data-unit-dot` |
| CA2 | fase 2, `mastered` 3 | 3 `data-unit-dot` y `aria-label` «3 letras aprendidas» |
| CA3 | fase 3 | «MUNDO 4», «Más letras» y `bg-world-3`. El registro fase → clase tiene exactamente las fases 0-3; una fase sin entrada usa `bg-world-3` |
| CA4 (E2 movido) | `MapScreen` con la activa de la Fase 1 y 2 dominados | los puntos están dentro de la región «Fase 1», no en otra |
| CA5 | `MapScreen` | no hay ningún separador `border-dashed` |
| ST1 | `MapNode` terminado con 2 estrellas | se ven dos «★» y ningún «☆»; con 3, tres «★» |

**Mutaciones que hay que probar y reportar:**
1. Ciclo de la onda 2, 3, 2, 3: debe morir ON1.
2. Tangente horizontal en `wavePath`: debe morir ON3.
3. `layoutRows("base")` con `ceil(n/5)`: debe morir ON5 o S2.
4. Puntos en todas las tarjetas, no solo en la activa: debe morir CA4 o CA1.
5. Volver a pintar «☆»: debe morir ST1.

- [ ] **Paso 1:** carga `silabin-design` y `frontend-design:frontend-design`. Mira la captura de referencia (`~/qa-silabin/out/mapa/referencia-834.png`).
- [ ] **Paso 2:** escribe ON1-ON6, CA1-CA5, ST1 y los S1 y S2 reescritos. Comprueba que fallan.
- [ ] **Paso 3:** implementa `serpentine.ts`, `ChapterCard`, la integración y el ☆. Comprueba que pasan.
- [ ] **Paso 4:** `pnpm exec playwright test e2e/mapa.spec.ts 2>&1 | tail -15`. Los e2e de 320 y 390 px ahora ven la onda: «sin scroll horizontal» y «≥ 72 px y a 16 px o más del vecino» deben seguir en verde.
- [ ] **Paso 5:** puertas y commit: `feat(map): una columna con ondas en teléfono y una tarjeta por mundo que corta el camino`.

**Aceptación:**
- Todos los casos en verde, las cinco mutaciones mueren y `e2e/mapa.spec.ts` está en verde.
- Ningún hex ni clase montada con plantilla.

---

## Tarea 4: cabecera y pie fijos

**Riesgo:** contrato del mapa con `App` (iniciar, padres y premios) y la composición entera. **Effort:** `high`. Revisión completa con 3-5 mutaciones. Skills: `silabin-design`, `frontend-design:frontend-design` y `frontend-a11y`.

**Files:**
- Create: `src/features/map/MapHeader.tsx`, `src/features/map/MapFooter.tsx` y sus `.test.tsx`
- Modify: `src/features/map/MapScreen.tsx`: `main` y cabecera (258-282), y el repaso (318-333). `StarCounter` (101-138) y `SavedMark` (75-95) se mueven a `MapHeader`.
- Modify: `src/features/map/MapScreen.test.tsx`: E1, E3, FI6, N9, el repaso (361-388) y S3/S4
- Modify: `src/features/legibility.test.tsx` (LE6)
- Modify: `e2e/offline.spec.ts:11-20` (J3 mantiene el candado) y `e2e/mapa.spec.ts` (LY3 y LY4)

**Interfaces:**
```ts
export function MapHeader(props: {
	stars: number;
	milestone: { from: number; to: number } | null;
	lastSavedAt: string | null;
	saveFailed: boolean;
	onOpenPanel: () => void;
}): React.ReactElement;

/** El botón grande decide su cara por `mode`; MapScreen lo calcula del motor. */
export type PlayMode = "play" | "review" | "soon";
export function MapFooter(props: {
	mode: PlayMode;
	onStart: () => void;
	onOpenRewards: () => void;
}): React.ReactElement;
```
- `mode` en `MapScreen`:
  - `idActivo !== null && playable` → `"play"`;
  - `idActivo === null && playable` → `"review"`;
  - en otro caso → `"soon"`.
- La lógica es la del repaso de hoy (`MapScreen.tsx:318-333`) más la activa.

**Composición (MC4, D60, MC14):**
- `main` pasa a `flex h-dvh flex-col` y lleva tres hijos:
  - `MapHeader` (`shrink-0`, `bg-card`);
  - la zona del camino (`min-h-0 flex-1 overflow-y-auto`), con el panel `bg-surface` de hoy dentro;
  - `MapFooter` (`shrink-0`, `bg-card`).
- `scrollIntoView({ block: "center" })` (S3) centra la celda dentro de esa zona; no cambia.

**`MapHeader`:**
- A la izquierda, `<h1>` «Silabín» en `text-brand` Nunito 800, con «✦» en `text-calm-border` y `aria-hidden`. **Ya no** lleva `AdultDoor` (D51).
- A la derecha, `StarCounter` en fila: «★ n» y debajo la barra del hito, más fina (`h-2`, ancho de unos `w-24`). Conserva `role="progressbar"` y sus `aria-value*`.
- A la derecha del todo, el candado: `AdultDoor` envolviendo un `<div role="img" aria-label="Panel de padres">` de unos 44 px, `bg-card` con borde de token y `<Icon name="lock" />`.
  - No es un `<button>`: no hace nada al toque (`AdultDoor` explica por qué no tiene teclado).
- `SavedMark` se queda flotante como hoy (MC10).
- Si LY4 detecta que `SavedMark` o `SaveWarning` pisan el candado, baja `SavedMark` bajo la cabecera y registra el ruling.

**`MapFooter`** (MC9, MC11, MC12):
- A la izquierda, «Mis premios»: botón con `<Icon name="gallery" />` y el texto «Mis premios» pequeño (600). `aria-label` «Mis premios». ≥ 72 px de alto.
- En el centro, el botón grande (`BigButton` con su sombra; ≥ 72 px):
  - `play`: ▶ y «Jugar», `aria-label` «Jugar»;
  - `review`: 🔁 y «Repasar», `aria-label` «Repasar»;
  - `soon`: ▶ y «Jugar» atenuados en un `<span className="opacity-50">` (el botón no), `aria-disabled="true"` y `aria-label={LLEGA_DESPUES}`; el clic no llama a nada.
- A la derecha, `<Companion size={72} />`, y 56 px bajo `apaisado-bajo:`.
- `Companion` acepta `className` y `size`; si `size` no cambia con la variante, usa `className`.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| CB1 | `MapHeader` | `heading` «Silabín»; mantenerlo 3 s **no** llama a `onOpenPanel` |
| CB2 (N9 movido) | mantener «Panel de padres» 3 s | `onOpenPanel` una vez; un toque corto, ninguna |
| CB3 (E1 movidos) | `stars` 27, hito 25-50 | «27» y `progressbar` 25-50 con valuenow 27; con `milestone` null, sin barra |
| CB4 (E3 movidos) | `lastSavedAt` y `saveFailed` | igual que E3 hoy |
| PI1 | `mode="play"`, clic | `onStart` una vez; `aria-label` «Jugar»; se ve «Jugar» |
| PI2 | `mode="review"`, clic | `onStart` una vez; «Repasar» |
| PI3 | `mode="soon"`, clic | `onStart` 0 veces; `aria-disabled="true"`; `aria-label` LLEGA_DESPUES; el botón no lleva `opacity` (el contenido sí) |
| PI4 (FI6 movido) | «Mis premios», clic | `onOpenRewards` una vez; icono de galería, sin 🎁 |
| PI5 | el pie | el compañero está dentro del pie |
| MS1 | `MapScreen` con la activa jugable | «Jugar» en el pie y clic → `onStart`; el nodo activo también |
| MS2 | sin activa, jugable (hoy 361) | «Repasar» y clic → `onStart` |
| MS3 | sin activa, no jugable (hoy 372) | `soon` y no arranca |
| MS4 | activa no jugable (U7) | `soon` en el pie, y el nodo «soon» como hoy |
| LE6 | `legibility.test.tsx` con el fondo Espacio | «Jugar», «Mis premios», «MUNDO 1» y «Oído de explorador» van sobre una superficie opaca de token, como LE1-LE5 |
| LY1 | `main` | lleva `h-dvh`, y la zona del camino `overflow-y-auto` |

- El test «con unidad activa no hay botón de repaso» (385) se sustituye por MS1.
- S3 y S4 se conservan; S4 pasa a buscar «Repasar» en el pie.

**e2e:**
- **J3** (`offline.spec.ts`): mantiene `getByRole("img", { name: "Panel de padres" })` 3,3 s. Quita el `scrollIntoViewIfNeeded`, que ya no hace falta (D60).
- **LY2** (`mapa.spec.ts`): a 320, 390, 834 y 1194 de ancho, la cabecera y el pie están dentro de la ventana antes y después de desplazar la zona del camino hasta abajo.
- **LY3** (Review Focus 2): a 844 × 390, la caja del nodo activo, más 14 px de aro, cabe entera entre el borde inferior de la cabecera y el superior del pie, y `scrollWidth <= clientWidth`.
- **LY4** (Review Focus 3): con `saveFailed` sembrado, el `SaveWarning` y el candado no se solapan (cajas disjuntas). Si no se puede sembrar el fallo en e2e, el implementador lo reporta y la comprobación pasa a la pasada visual (jsdom no tiene cajas reales, así que un test unitario no la sustituye).

**Mutaciones que hay que probar y reportar:**
1. `AdultDoor` de vuelta en el `h1`: debe morir CB1 o CB2.
2. `mode` sin el caso `soon` (cae en `play`): debe morir MS4 o PI3.
3. `opacity-50` en el botón y no en el contenido: debe morir PI3 o LE.
4. Zona del camino sin `overflow-y-auto` (desplaza la página entera): debe morir LY1 o LY2.
5. `review` que no llama a `onStart`: debe morir PI2 o MS2.

- [ ] **Paso 1:** carga las skills y mira la captura de referencia.
- [ ] **Paso 2:** escribe CB1-CB4, PI1-PI5, MS1-MS4, LE6 y LY1. Comprueba que fallan.
- [ ] **Paso 3:** implementa `MapHeader`, `MapFooter` y la composición de `MapScreen`. Comprueba que pasan.
- [ ] **Paso 4:** e2e: J3, LY2, LY3 y LY4. Corre `pnpm exec playwright test e2e/mapa.spec.ts e2e/offline.spec.ts 2>&1 | tail -15`.
- [ ] **Paso 5:** puertas y commit: `feat(map): cabecera y pie fijos, con el candado de padres y Jugar siempre a mano`.

**Aceptación:**
- Todos los casos en verde y las cinco mutaciones mueren.
- No hay scroll horizontal a 320 px.
- `MapScreen.tsx` queda por debajo de unas 250 líneas: la cabecera y el pie viven en sus ficheros.

---

## Tarea 5: autoridad de diseño, docs y poda

**Riesgo:** documentación. **Effort:** `medium`. Revisión de cumplimiento.

**Files:**
- Modify: `.claude/skills/silabin-design/SKILL.md`
- Modify: `docs/diseno-visual.md`
- Modify: `docs/checklist-ipad.md`
- Modify: `README.md`
- Modify: `docs/archivo-trampas-y-deuda.md` (si hay poda)

**Contenido:**
- **Skill, sección «Progreso: el mapa como viaje»:**
  - cabecera y pie fijos, con lo que lleva cada uno (D51-D56, D60);
  - tarjeta de capítulo con su color de mundo (D48, D50, D57 y D58);
  - onda en la base y serpiente en `md:`/`lg:` (D49, MC3);
  - solo estrellas ganadas (D59).
- **Skill, «Colores de mundo»:** pasan a ser tokens `world-0`…`world-3`, solo en la tarjeta. Los demás usos siguen pendientes de `/dev/arte`.
- **Skill, «Tipografía»:** Nunito ya es `--font-sans`, y Andika sigue en lectura hasta que el autor vea la «a».
- **Skill, «Peticiones habituales» y la checklist:** la excepción de texto de MC11.
- **Skill, «Decisiones abiertas»:** quita MP4 y MP12. Quedan MP15, si las fases futuras se ven enteras y la continuidad del camino.
- **Skill, tabla de componentes:** añade `MapHeader`, `MapFooter`, `ChapterCard` y `use-arranque`, y quita `StartScreen` de donde aparezca.
- `docs/diseno-visual.md`: los tokens nuevos con su contraste medido y Nunito.
- `docs/checklist-ipad.md`, un **I17** para dispositivo real:
  - el candado se abre con 3 s y no con un toque;
  - Jugar suena a la primera (el audio se desbloquea en el gesto);
  - el pie no queda bajo el indicador de inicio del iPhone en la PWA instalada;
  - la zona del camino se desplaza con inercia en Safari.
- README:
  - fila del Plan 9 en «Lo que falta» y su sección «Lo que ya está hecho»;
  - «Siguientes pasos»;
  - D46-D60 en «Decisiones tomadas»;
  - la deuda 8 se reescribe: MP4 y MP12 quedan cerradas;
  - poda según `CLAUDE.md` (≤ 8 trampas, ≤ 10 deudas).

- [ ] **Paso 1:** aplica los cambios.
- [ ] **Paso 2:** `pnpm lint` (Biome formatea Markdown si aplica) y commit: `docs(plan-9): la skill y el README describen el mapa con cabecera, capítulos y pie`.

**Aceptación:**
- La skill no contradice ningún D46-D60.
- No queda ninguna mención a `StartScreen` ni a «Empezar» en los docs vivos (los registros históricos no se tocan).
- Topes del README cumplidos.

---

## Después de las cinco tareas

1. Revisión final de la rama contra `feat/plan-8-mapa-camino`, o contra `main` si el #11 ya está fusionado (D46), en Opus `high`.
2. Pasada visual local con `~/qa-silabin`:
   - build de producción, en webkit y chromium, a 320, 390, 834, 1194 y 844 × 390;
   - comparar con `referencia-834.png`;
   - comprobar el solape de `SaveWarning` y `SavedMark` con el candado si LY4 no pudo;
   - confirmar con el autor el color del wordmark y de las tarjetas.
3. PR contra `main` cuando el autor lo autorice.
