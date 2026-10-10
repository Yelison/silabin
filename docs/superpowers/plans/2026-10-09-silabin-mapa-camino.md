# Silabín Plan 8, el mapa como camino: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** sustituir la lista vertical de unidades de `MapScreen` por un camino en serpiente de
nodos redondos con icono, con los estados del motor pintados como en el PR #10 (disponible
amarillo con aro, completado azul con insignia y estrellas, bloqueado discreto con candado).

**Architecture:**
- **Iconos.** Las 21 formas de unidad del PR #10 pasan a datos TypeScript en `features/map`. Las
  pinta un `UnitIcon` en línea con `currentColor`.
- **Estado.** Una función pura, `nodeLook`, traduce `status` y `playable` del motor a uno de
  cuatro aspectos. `MapNode` pinta ese aspecto con tokens y conserva el contrato actual de
  `UnitButton`: etiquetas, `aria-*` y `data-*`.
- **Disposición.** Otra función pura, `serpentine`, coloca los nodos de cada fase en una
  rejilla de 2, 3 o 5 columnas. `serpentinePath` dibuja los conectores en unidades de celda,
  así que nada se mide en el DOM.
- **Cabecera.** No cambia (D39).

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Vitest, Biome y Playwright. Sin dependencias
nuevas: los contornos de Lucide y Andika ya vienen dentro de los datos.

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md`, §2 (principios) y §9 (objetivos
≥ 72 px; ningún estado marcado solo por color). Diseño: `docs/visual-refactor/CLAUDE-HANDOFF.md`,
`docs/visual-refactor/icons/demo.html` (manda en iconos y letras) y la skill `silabin-design`
(`.claude/skills/silabin-design/SKILL.md`), con las excepciones que fija el ledger.

**Ledger:** `docs/superpowers/2026-10-09-plan-8-registro.md`. Decisiones D37-D45 y Rulings
MP1-MP15, cada uno con su porqué y su coste. **Léelo antes de la tarea:** el plan solo los cita.

## Global Constraints

- `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit. `vitest` no
  comprueba tipos.
- TDD: primero el test que falla y luego el código. TypeScript estricto, sin `any`.
- `features/` y `components/` no deciden pedagogía: `MapNode` pinta lo que dicen
  `progress.units` e `isSessionPlayable`, y no calcula progreso ni desbloqueos.
- **Solo colores de token** (`bg-action`, `text-node-locked-ink`…). Ni hex ni `rgb()` en las
  vistas. Todo token nuevo pasa `src/app/tokens.test.ts`.
- **Ningún `style` con `px`** en el mapa (lo vigila E4). Las propiedades CSS personalizadas sin
  unidades sí se permiten.
- Objetivos del niño ≥ 72 px y separados ≥ 16 px. El nodo mide 88 px (`size-22`) (MP11).
- Bloqueado y «soon» llevan `aria-disabled="true"`, nunca `disabled` (MP1).
- Todo lo que se pinta va sobre una superficie opaca de token (V13 y LE1).
- Movimiento solo con `motion-safe:`. Nada de `smooth` ni de animaciones nuevas.
- Biome reformatea el código de referencia (tabuladores y comillas dobles). Las `key` por
  índice valen solo en listas estáticas de formas, con su comentario.
- **Clases de Tailwind siempre literales.** Tailwind solo genera las clases que aparecen
  escritas enteras en el código: `col-start-(--c2)`, `md:hidden`, etc. van en una tabla
  literal por número de columnas, nunca montadas con plantillas a partir de `COLUMNAS`.
- `docs/visual-refactor/` es una referencia: no se edita ni se mueve.
- Conventional Commits en español, con el porqué en el asunto. Terminan con
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Antes de tocar código de React o CSS, lee las guías locales de Next que apliquen
  (`node_modules/next/dist/docs/`, AGENTS.md).

## Review Focus

1. **Teléfono de 320 px:** caben 2 columnas, no hay scroll horizontal, los aros no se pisan y
   entre nodos quedan ≥ 16 px. Lo cubre el e2e de la T3.
2. **Tocar la unidad activa en un navegador real:** el SVG del camino no intercepta el toque
   (`pointer-events-none`). Lo cubren el e2e de la T3 y los existentes, que pulsan
   `[data-status="active"]`.
3. **La unidad activa sin plantilla («soon»)** nunca inicia sesión, se anuncia «Llega en una
   próxima versión», lleva el reloj y no el candado. Lo cubren N3 (T2) y U7 (T3).
4. **Encontrar el nodo bloqueado:** su cara queda casi igual que la superficie (1,1 : 1) y solo
   el símbolo (3,7 : 1) y la insignia lo distinguen. Lo cubren los pares de la T1 y LE1 con
   Espacio (T3).
5. **Girar el iPad (834 × 1194 ↔ 1194 × 834):** pasa de 3 a 5 columnas y los conectores siguen
   uniendo centros, sin recalcular nada en JavaScript. Lo cubren el e2e de la T3 y S2.

---

## Tarea 1: iconos de unidad, tokens de nodo y sus pares de contraste

**Riesgo:** datos y tokens, sin lógica. **Effort:** `medium`. Revisión de cumplimiento, sin
mutaciones. Skill útil: `silabin-design` (sección «Color»).

**Files:**
- Create: `src/features/map/unit-icons.ts`, `src/features/map/UnitIcon.tsx` y
  `src/features/map/UnitIcon.test.tsx`
- Modify: `src/app/globals.css` (bloque `@theme inline`), `src/app/tokens.test.ts:98-115`
  (pares) y `docs/diseno-visual.md` (tabla de tokens)

**Interfaces (produce):**
```ts
// unit-icons.ts: solo datos; sin React.
export type IconShape = readonly [tag: "path" | "circle" | "rect", attrs: Readonly<Record<string, string | number>>];
export const UNIT_ICONS: Readonly<Record<string, readonly IconShape[]>>; // 21 ids de unidad
export type BadgeId = "check" | "lock" | "soon";
export const BADGE_ICONS: Readonly<Record<BadgeId, readonly IconShape[]>>;
export function isLetterIcon(unitId: string): boolean; // phase1:, phase2:, phase3:

// UnitIcon.tsx
export function UnitIcon(props: { unitId: string; className?: string }); // sin tipo de retorno escrito, como el resto de componentes del repo
export function BadgeIcon(props: { badge: BadgeId; className?: string });
```

**Contenido:**
- Las formas salen de `docs/visual-refactor/icons/ChallengeNode.tsx:172-422`, solo los ids
  `phase0:*` a `phase3:*` (MP2). Conserva los `d` y los `transform` tal cual: llevan el centrado
  y la escala óptica de cada letra. Las claves con guion (`stroke-width`) pasan a camelCase
  al pintarlas, como hace `SvgShape` en las líneas 425-430.
- Las insignias:
  - `check`: `path d="m5 12 4 4L19 6"`, trazo 3 (línea 441);
  - `lock`: `rect x=4 y=10 width=16 height=11 rx=2` y `path d="M8 10V6a4 4 0 0 1 8 0v4"`,
    trazo 2,5 (línea 442);
  - `soon` (D38): el reloj de Lucide, `circle cx=12 cy=12 r=10` y `path d="M12 6v6l4 2"`.

  Por eso `IconShape` admite `rect` (ya está en el tipo de arriba).
- Al principio de `unit-icons.ts`, un comentario con la procedencia y las licencias:
  `docs/visual-refactor/icons/LICENSE-lucide.txt` (ISC) y `OFL-Andika.txt`.
- `UnitIcon` pinta un `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">`, con
  `data-letter="true"` cuando `isLetterIcon`. Un id desconocido pinta el `<svg>` vacío y no
  lanza: el test UI1 impide que llegue a pasar.
- Tokens nuevos en `@theme inline` (MP5, MP6): `--color-action-depth: #dda016`,
  `--color-calm-depth: #286091`, `--color-node-locked: #edeef2`,
  `--color-node-locked-depth: #d9dce4` y `--color-node-locked-ink: #757a88`.
- Pares nuevos en `PARES_BORDE` (3 : 1, que es lo que WCAG pide a un gráfico y a una letra de
  44 px):
  - `["card", "calm-border"]`: el símbolo blanco sobre el completado, 3,72;
  - `["node-locked-ink", "node-locked"]`: el símbolo bloqueado, 3,70;
  - `["node-locked-ink", "card"]`: el candado sobre su insignia, 3,74.

**Casos de test (`UnitIcon.test.tsx`):**

| Id | Entrada | Salida esperada |
|---|---|---|
| UI1 | cada id de `curriculum.unitOrder` | `UNIT_ICONS[id]` existe y no está vacío (MP13) |
| UI2 | `Object.keys(UNIT_ICONS)` | exactamente el conjunto de `curriculum.unitOrder`, ni uno de más |
| UI3 | `UnitIcon` de `phase1:vowel-a`, `phase2:m` y `phase3:enie` | `svg[data-letter="true"]`; con `phase0:clap`, sin `data-letter` |
| UI4 | toda forma de `UNIT_ICONS` y `BADGE_ICONS` | `fill` y `stroke`, si existen, valen `currentColor` o `none`: ningún color fijo |
| UI5 | `UnitIcon` de cualquier id | `aria-hidden="true"` y ni un `<img>` |
| UI6 | `UnitIcon` de `"no:existe"` | un `<svg>` sin hijos, sin lanzar |

`tokens.test.ts`: CO1 y CO2 en verde con los pares nuevos. Comprueba que CO1 falla si
`node-locked-ink` vuelve al #a7adba de la referencia, y deja el valor bueno.

**Aceptación:**
- Los seis casos y `tokens.test.ts` en verde.
- `docs/diseno-visual.md` documenta los 5 tokens con su contraste.
- `git diff --stat` solo toca los ficheros de arriba.

- [ ] Paso 1: escribir UI1-UI6 y los pares de CO1, y verlos fallar.
- [ ] Paso 2: portar los datos, los tokens y el componente hasta el verde.
- [ ] Paso 3: las tres puertas en verde y commit
  (`feat(map): iconos de unidad y tokens de nodo para el camino del mapa`).

---

## Tarea 2: `nodeLook` y `MapNode`, del estado del motor al nodo

**Riesgo:** el contrato entre el motor y la interfaz. Decide qué se puede tocar.
**Effort:** `high`. Revisión completa con 3-5 mutaciones. Skills útiles: `silabin-design` y
`frontend-a11y`.

**Files:**
- Create: `src/features/map/node-look.ts`, `src/features/map/MapNode.tsx` y
  `src/features/map/MapNode.test.tsx`
- No toca `MapScreen.tsx`: la T3 sustituye `UnitButton` por `MapNode`.

**Interfaces:**
- Consume (de la T1): `UnitIcon` y `BadgeIcon`, más los tokens `action-depth`, `calm-depth`,
  `node-locked`, `node-locked-depth` y `node-locked-ink`.
- Produce:
```ts
// node-look.ts
import type { UnitStatus } from "@/engine"; // "done" | "active" | "locked"
export type NodeLook = "available" | "soon" | "completed" | "locked";
export function nodeLook(status: UnitStatus | undefined, playable: boolean): NodeLook;

// MapNode.tsx: mismas props que el UnitButton de hoy (MapScreen.tsx:148-200)
export const LLEGA_DESPUES = "Llega en una próxima versión";
export function MapNode(props: {
	unit: Unit;
	progress: UnitProgress | undefined;
	playable: boolean;
	onStart: () => void;
});
```

**Contrato que se conserva, copiado de `UnitButton` (`MapScreen.tsx:148-200`):**
- `<button type="button">` con `data-unit`, `data-status` (el del motor) y, como novedad,
  `data-look`.
- `aria-label`:
  - «soon» → `LLEGA_DESPUES`;
  - `done` → `` `${title}, ${stars} de 3 estrellas` ``;
  - `locked` → `` `${title}, bloqueada` ``;
  - si no, `title`.
- `aria-current="step"` si `status === "active"`, también en «soon» (MP14).
- `aria-disabled="true"` salvo en «available» y en `done` (MP1). Nunca `disabled`.
- `onClick` llama a `onStart` solo en «available» (MP15).
- Las estrellas (★ y ☆, como el `Estrellas` de hoy, MP4) van dentro del botón, bajo el círculo,
  en una pastilla `bg-card` con `aria-hidden`.

**Aspecto** (referencia: `docs/visual-refactor/icons/challenge-node.css`, con los valores
claros de MP5 y los tokens de MP6):

| `data-look` | Cara | Símbolo | Fondo (sombra interior inferior) | Borde interior | Extra |
|---|---|---|---|---|---|
| available | `action` | `action-ink` | `action-depth` | `surface` | aro `mark` de 5 px a 14 px del borde (`before:`) |
| completed | `calm-border` | `card` | `calm-depth` | `calm` | insignia `check`: cara `card`, trazo `calm-border` |
| locked | `node-locked` | `node-locked-ink` | `node-locked-depth` | `card` | insignia `lock`: cara `card`, trazo `node-locked-ink` |
| soon | `node-locked` | `node-locked-ink` | `node-locked-depth` | `card` | insignia `soon` (reloj), sin aro |

- El círculo es `size-22` y el botón, `min-h-18 min-w-18`.
- El icono mide 36 px, o 44 px si es letra.
- La insignia mide 28 px y va abajo a la derecha, con un borde de 3 px del color de fondo.
- El foco: `focus-visible:outline-trace-ink` con desplazamiento, para que no lo tape el aro.
- La pulsación: `motion-safe:active:translate-y-0.5` solo en «available».
- **Nada de `opacity` en el botón ni en su cara.** La ficha sigue opaca (V13); el estado se
  marca con color, insignia y aro.

**Casos de test (`MapNode.test.tsx`).** Renderiza `MapNode` con props sueltas, sin store.

| Id | Entrada | Salida esperada |
|---|---|---|
| N1 | `nodeLook` con `(undefined,true)`, `("locked",true)`, `("active",true)`, `("active",false)`, `("done",false)` y `("done",true)` | `locked`, `locked`, `available`, `soon`, `completed` y `completed` |
| N2 | `active`, `playable` | `data-look="available"`, `aria-current="step"`, sin `aria-disabled` ni insignia; un clic → `onStart` una vez |
| N3 | `active`, `!playable` | `aria-label` = `LLEGA_DESPUES`, `aria-disabled="true"`, `aria-current="step"`, `[data-badge="soon"]` y ningún `[data-badge="lock"]`; un clic → no llama a `onStart` |
| N4 | `locked` (`phase0:rhyme`) | `aria-label` = «Rimas saltarinas, bloqueada», `aria-disabled="true"`, `[data-badge="lock"]`, **el `svg` del símbolo presente**, sin atributo `disabled`; un clic → nada |
| N5 | `done`, `bestStars: 2` | `aria-label` acaba en «2 de 3 estrellas»; dentro del botón, 2 «★» y 1 «☆»; `[data-badge="check"]`; sin `aria-disabled`; un clic → no llama a `onStart` |
| N6 | `progress` `undefined` | se pinta como `locked` (N4) |
| N7 | los cuatro aspectos | el botón contiene `min-h-18`; ni el botón ni sus hijos llevan una clase `opacity-*`; ningún `[style*='px']` |
| N8 | los cuatro aspectos | dentro no hay `progressbar`, `meter`, `progress` ni barras (trampa 4) |

**Mutaciones que hay que probar y reportar:**
1. intercambiar «soon» y «available» en `nodeLook`;
2. quitar `aria-disabled` en `locked`;
3. llamar a `onStart` también en `completed`;
4. no pintar el símbolo en `locked`;
5. poner `aria-current` solo en «available».

Las cinco deben hacer fallar un test. Si alguna sobrevive, repórtalo tal cual: no ajustes el
test hasta que pase.

**Aceptación:** N1-N8 en verde, las cinco mutaciones mueren y no hay hex en `MapNode.tsx`.

- [ ] Paso 1: N1-N8 en rojo.
- [ ] Paso 2: `nodeLook` y luego `MapNode`, hasta el verde.
- [ ] Paso 3: las mutaciones, revertidas, y su resultado en el reporte.
- [ ] Paso 4: las puertas y el commit
  (`feat(map): nodo del camino que pinta el estado del motor sin decidirlo`).

---

## Tarea 3: serpiente por columnas, conectores e integración en `MapScreen`

**Riesgo:** lógica nueva de disposición y el contrato del mapa, que pisan 24 tests y el e2e.
**Effort:** `high`. Revisión completa con 3-5 mutaciones. Skills útiles: `silabin-design` y
`react-performance` (ignora su regla de los barriles para `@/engine`, `@/store` y `@/audio`,
D3).

**Files:**
- Create: `src/features/map/serpentine.ts`, `src/features/map/serpentine.test.ts` y
  `e2e/mapa.spec.ts`
- Modify: `src/features/map/MapScreen.tsx` (quita `UnitButton` y `Estrellas` y usa `MapNode`) y
  `src/features/map/MapScreen.test.tsx`

**Interfaces:**
- Consume (de la T2): `MapNode` y `LLEGA_DESPUES`. `MapScreen` puede reexportar
  `LLEGA_DESPUES` o importarlo de `MapNode`.
- Produce:
```ts
// serpentine.ts: puro; sin React ni DOM.
export type Cell = { readonly row: number; readonly col: number };
export const COLUMNAS = [2, 3, 5] as const; // base, md (≥768), lg (≥1024): MP9
export type Columnas = (typeof COLUMNAS)[number];
/** Celdas en bustrofedón: las filas pares van de izquierda a derecha y las impares al revés. */
export function serpentine(count: number, columns: number): Cell[];
/** El trazo en unidades de celda; "" con menos de 2 celdas. */
export function serpentinePath(cells: readonly Cell[], columns: number): string;
```

**El trazo (código delicado; respeta el formato).** Centro de una celda: `(col + 0.5, row + 0.5)`.
- Primer punto: `M{x} {y}`.
- Paso dentro de la misma fila: `L{x} {y}`.
- Paso a la fila siguiente (misma columna): una curva hacia fuera,
  `C{x+d} {y0} {x+d} {y1} {x} {y1}`, con `d = col === 0 ? -0.5 : 0.5`.

Los números se escriben con `String(n)`, sin ceros sobrantes. Ejemplo:
`serpentinePath(serpentine(3, 2), 2)` → `"M0.5 0.5L1.5 0.5C2 0.5 2 1.5 1.5 1.5"`.

**Integración en `MapScreen`:**
- La cabecera no cambia (D39) y se queda en `max-w-xl`.
- Debajo, un panel opaco `rounded-card bg-surface p-2 md:p-4`, centrado, con
  `w-full max-w-xl md:max-w-2xl lg:max-w-4xl` (MP9, MP10).
- Dentro, cada fase sigue siendo `<section aria-label="Fase N">` con sus botones en el orden del
  currículo. Cada sección tiene dos cosas:
  - **Una rejilla relativa:** `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 auto-rows-[9rem]`.
    Cada `MapNode` va en una celda que lo centra. Para colocarla, `style` lleva las seis
    propiedades `--c2`, `--r2`, `--c3`, `--r3`, `--c5` y `--r5` (base 1) y las clases
    `col-start-(--c2) row-start-(--r2) md:col-start-(--c3) md:row-start-(--r3)
    lg:col-start-(--c5) lg:row-start-(--r5)`. Si la sintaxis `(--x)` no compila con la
    versión instalada, usa `col-start-[var(--c2)]`.
  - **El camino va detrás de los nodos** (lo pide el handoff). Los SVG son los primeros hijos
    de la sección y cada celda lleva `relative z-10` (de todos modos la necesita el `before:`
    del aro). Un SVG absoluto se pinta encima de lo que no está posicionado, aunque vaya antes
    en el DOM. Ningún test de jsdom lo ve: lo comprueba la captura.
  - **Tres `<svg aria-hidden="true">` absolutos `inset-0 pointer-events-none`,** uno por número
    de columnas. Cada uno lleva `data-columns`, `viewBox="0 0 {cols} {filas}"` y
    `preserveAspectRatio="none"`, y se ve solo en su punto de corte (`md:hidden`,
    `hidden md:block lg:hidden` y `hidden lg:block`). Dentro, un `<path>` con `d =
    serpentinePath(...)`, `fill="none"`, trazo `node-locked-depth` de 8 px
    (`vector-effect="non-scaling-stroke"`) y extremos redondos. Si hay menos de 2 unidades, no
    se pinta el `<path>`.
- Entre secciones, un separador neutro: `border-t-4 border-dashed border-node-locked-depth`,
  sin texto (D42, D43).
- **Centrar la activa (MP12):** un `ref` a la celda de la unidad `aria-current` y un
  `useEffect` de montaje que llama a `scrollIntoView?.({ block: "center" })` una sola vez.
- El botón de repaso (`sinActiva`), `SavedMark`, `AdultDoor`, el compañero, «Mis premios»,
  `StarCounter` y `UnitDots` no cambian.

**Tests de `MapScreen.test.tsx`: qué se queda y qué se reescribe.** Esta clasificación es
parte del contrato: el revisor rechaza cualquier cambio en un test de contrato.

- **Contrato, intocables:**
  - el orden y las regiones `Fase N` (l. 98);
  - U2, U3, «tocar la activa jugable inicia la sesión» y el `aria-label` de U7;
  - la trampa 4;
  - E1, E2 y E3;
  - el repaso (las tres: jugable, no jugable y sin repaso con activa);
  - «nada de lo pintado usa lenguaje de castigo»;
  - N9;
  - la de estrellas (l. 145).

  En la de estrellas solo cambia, si hace falta, el contenedor donde se buscan ★ y ☆.
- **Presentación, se reescriben conservando su intención:**
  - **M1:** el nodo contiene `min-h-18`.
  - **La del candado (l. 157):** `[data-badge="lock"]` con `aria-hidden`, el símbolo visible y
    un clic que no arranca nada. Sustituye al `img` de `ui-lock.png`.
  - **U7:** se quedan `aria-disabled`, `LLEGA_DESPUES` y que no arranque nada. Los asertos de
    `data-dim` y `opacity-50` pasan a `data-look="soon"` y `[data-badge="soon"]`.
  - **U7b:** la bloqueada lleva `data-look="locked"` y ninguna `opacity-*` en el botón.
  - **E4:** sin scroll horizontal por construcción. Ningún `[style*='px']` y ningún `w-[…px]`
    en el mapa, la cabecera conserva `max-w-xl` y los puntos siguen en `flex-wrap`.
- **Nuevos:**

| Id | Entrada | Salida esperada |
|---|---|---|
| S1 | progreso nuevo; los nodos de la Fase 3 (8 unidades) | sus `--c5` y `--r5` son los de `serpentine(8,5)` en base 1: la séptima unidad (índice 6) tiene `--c5: 4` y `--r5: 2` |
| S2 | cada sección | tres `svg[data-columns]` (2, 3 y 5) con `viewBox` `0 0 c ceil(n/c)` y un `path` cuya `d` es `serpentinePath(serpentine(n,c),c)` |
| S3 | `Element.prototype.scrollIntoView` espiado | se llama una vez, con `{ block: "center" }`, sobre la celda de `phase0:clap` |
| S4 | todas las unidades `done` (sin activa) | `scrollIntoView` no se llama y sale el repaso |

**Casos de `serpentine.test.ts`:**

| Entrada | Salida |
|---|---|
| `serpentine(0, 3)` | `[]` |
| `serpentine(1, 5)` | `[{row:0,col:0}]` |
| `serpentine(4, 5)` | fila 0, columnas 0-3 |
| `serpentine(5, 2)` | `(0,0) (0,1) (1,1) (1,0) (2,0)` |
| `serpentine(8, 3)` | `(0,0) (0,1) (0,2) (1,2) (1,1) (1,0) (2,0) (2,1)` |
| `serpentine(8, 5)` | `(0,0)…(0,4) (1,4) (1,3) (1,2)` |
| `serpentine(3, 0)`, `serpentine(3, 2.5)` y `serpentine(-1, 2)` | lanzan `RangeError` |
| `serpentinePath([], 2)` y `serpentinePath([{row:0,col:0}], 2)` | `""` |
| `serpentinePath(serpentine(2, 5), 5)` | `"M0.5 0.5L1.5 0.5"` |
| `serpentinePath(serpentine(3, 2), 2)` | `"M0.5 0.5L1.5 0.5C2 0.5 2 1.5 1.5 1.5"` |
| `serpentinePath(serpentine(5, 2), 2)` | acaba en `"…L0.5 1.5C0 1.5 0 2.5 0.5 2.5"`: el giro por la izquierda tiene `d = -0.5` |

**`e2e/mapa.spec.ts`** (Chromium, con el `webServer` del config; mira `e2e/apaisado.spec.ts` y
`e2e/helpers`). Con progreso nuevo, en 320×640, 390×844, 834×1194 y 1194×834:
- `document.documentElement.scrollWidth <= innerWidth`;
- en la sección `Fase 1` (5 unidades), los centros X distintos de sus botones son 2, 2, 3 y 5;
- todo botón `[data-unit]` mide ≥ 72 px de ancho y de alto, y entre dos botones vecinos hay
  ≥ 16 px;
- un clic real en `[data-status="active"]` arranca la sesión (no lo tapa el SVG).

**Mutaciones que hay que probar y reportar:**
1. no invertir las filas impares;
2. `d` siempre `+0.5`;
3. `Math.floor` en lugar de `Math.ceil` en las filas del `viewBox`;
4. quitar `pointer-events-none` del SVG (la caza el e2e);
5. llamar a `scrollIntoView` en cada render.

Si alguna sobrevive, repórtalo.

**Aceptación:**
- Todo en verde: tests de contrato intactos, presentación reescrita según la lista, S1-S4,
  `serpentine` y LE1 sin tocar.
- `pnpm e2e` en verde, con los specs que ya existían.
- El reporte incluye capturas en 390×844 y 1194×834 con el arnés de `~/qa-silabin`. En ellas
  se ve **una sola línea por fase, detrás de los nodos y sin cruzar sus caras**.
- LE1 no se toca: el panel `bg-surface` es el ancestro opaco de todo el mapa
  (`legibility.test.tsx:33`). Las caras nuevas no tienen que entrar en `SUPERFICIE`.

- [ ] Paso 1: `serpentine.test.ts` en rojo y luego `serpentine.ts` hasta el verde.
- [ ] Paso 2: reescribir y añadir los tests del mapa (rojo).
- [ ] Paso 3: integrar en `MapScreen` hasta el verde, con LE1 incluido.
- [ ] Paso 4: el e2e y los existentes; las mutaciones, revertidas.
- [ ] Paso 5: las puertas y el commit
  (`feat(map): camino en serpiente por columnas con conectores que no miden el DOM`).

---

## Tarea 4: autoridad de diseño, docs y poda

**Riesgo:** documentación. **Effort:** `medium`. Revisión de cumplimiento.

**Files:**
- `.claude/skills/silabin-design/SKILL.md`, en la sección «Progreso: el mapa como viaje» y en
  la tabla de componentes:
  - la serpiente de 2, 3 o 5 columnas por fase (MP8, MP9);
  - los cuatro aspectos con sus tokens (incluido «soon», D38) y el completado azul (MP3);
  - sin título visible (D42) y el compañero en la cabecera (D39);
  - `LevelNode` → `features/map/MapNode` y `WorldMap` → `MapScreen`.

  En «Decisiones abiertas» se quita el icono de cada unidad de la fase 0 (resuelto) y se
  añaden la continuidad del camino entre fases (MP8) y las ☆ (MP4, si el autor no lo resolvió).
- `docs/diseno-visual.md`: el mapa en serpiente, con referencia a `docs/visual-refactor/`.
- `docs/checklist-ipad.md`, con puntos nuevos para el mapa:
  - centrado de la activa al abrir;
  - girar el iPad con el mapa abierto;
  - tocar los nodos con el dedo;
  - el aro y la insignia sin recortes.
- `docs/visual-refactor/README.md`: una línea al principio, «Integrado en el Plan 8 (ledger
  `docs/superpowers/2026-10-09-plan-8-registro.md`)».
- `README.md`:
  - la sección «Lo que ya está hecho: Plan 8»;
  - la tabla de «Lo que falta», con el Plan 7 como fusionado (PR #8) y la fila del Plan 8;
  - «Siguientes pasos»;
  - D37-D45 en «Decisiones tomadas»;
  - la poda: ≤ 8 trampas y ≤ 10 deudas, según CLAUDE.md.

  La deuda 4 (objetivos < 72 px) sigue viva; comprueba que el mapa no la amplía.

**Aceptación:**
- Ninguna referencia a `notas-maquetas.md` (no existe) ni a la lista vertical como estado
  actual.
- Las cifras de contraste coinciden con las de la T1.
- Los topes del README se cumplen.

- [ ] Paso 1: los cambios.
- [ ] Paso 2: `pnpm lint` (Biome no formatea `.md`, pero la puerta se corre igual) y el commit
  (`docs: el mapa en serpiente pasa a ser la referencia de diseño del Plan 8`).

---

## Después de las cuatro tareas

1. Revisión final de la rama en Opus (`high`) contra `main`: incluye el commit del PR #10.
2. Despliegue del preview y pasada visual con `~/qa-silabin`, en webkit y chromium.
3. PR del Plan 8 contra `main`, que cierra el PR #10 como incluido (D44).
