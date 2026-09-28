# Silabín Plan 6: panel de padres, recompensas y PWA — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** la primera versión funcional completa sin la identidad visual. Incluye:
- panel de padres con PIN (ajustes, progreso, exportar, importar y reiniciar);
- trazo en minúsculas;
- recompensas y cosméticos con marcadores provisionales;
- avance visible en el mapa;
- botones de borrar y confirmar en `trace`;
- PWA instalable que funciona sin red;
- e2e con Playwright;
- los prompts del arte que integrará el Plan 7.

**Architecture:** el motor gana funciones puras:
- `cosmetics.ts`, el catálogo y la resolución de lo equipado;
- `progressReport` y `unitProgress`;
- `nextMilestone`;
- el caso de letra de `trace`, fijado en la corrida.

El store gana las acciones del adulto: ajustes, PIN, equipar, importar con validación
estricta y reiniciar. La interfaz añade:
- la puerta del PIN y el panel, en `features/adult/`;
- la galería de recompensas y el rastro, en `features/rewards/`;
- los añadidos del mapa y el registro del service worker.

Serwist genera el service worker con Turbopack, y Playwright prueba la Fase 1 y el modo sin
red contra `next build`.

**Tech Stack:** Next.js 16.3.5 (App Router, Turbopack por defecto también en `build`),
React 19.2.8, TypeScript estricto, Tailwind 4, Zod 4, Zustand 5, Vitest 5 + jsdom + Testing
Library, Biome 2. **Nuevas (D30):** Framer Motion (T8), Serwist para Turbopack (T9) y
`@playwright/test` (T10). Los nombres de paquete se comprueban con context7 antes de instalar
(S14).

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md`:
- §2, principios;
- §7, recompensas;
- §8, panel de padres, persistencia y offline;
- §9, experiencia de usuario;
- §10, pruebas.

El ledger es `docs/superpowers/2026-09-28-plan-6-registro.md`. Contiene las decisiones del
autor D24-D31 y los rulings de planificación S1-S23.

**Modo económico (CLAUDE.md):** el plan fija contratos, casos de test y criterios de
aceptación, no la implementación. El implementador la escribe con TDD. **Ejecución:**
`/model sonnet`. El `/effort` de cada tarea va en su cabecera.

---

## Decisiones

Las del autor están en el ledger (D24-D31). Los rulings de planificación S1-S16 también
están en el ledger, con su porqué. Los que se añaden al escribir el plan son estos, y pasan
al ledger:

- **S17 · El avance de la unidad solo enseña lo ganado.** `MapScreen` dice hoy «no hay barras
  de dominio: el niño ve estrellas ganadas, no lo que le falta». D31a pide avance dentro de la
  unidad, así que se pinta un punto lleno por ítem dominado, sin huecos vacíos. La cuenta
  exacta (`3 de 5`) está en el panel del adulto. La barra al próximo hito de estrellas sí es
  una barra: la pide el spec §7. Coste si fuera un error: añadir los huecos es una línea.
- **S18 · Importar conserva el PIN del dispositivo.** El `pinHash` del documento importado se
  descarta y se mantiene el actual. Si no, un adulto que acaba de entrar con su PIN quedaría
  fuera con el PIN de otro dispositivo.
- **S19 · El fondo equipado sale en el mapa, la galería y el fin de sesión, nunca dentro de
  un ejercicio.** Los ejercicios mantienen `surface`, que es poco estimulante (D8).
- **S20 · El cursor de PC por rastro (§7) va al Plan 7:** necesita el arte. `minor
  (deferred)`.
- **S21 · Iconos provisionales con emoji** hasta el Plan 7: borrar (🧽), listo (👍), la
  puerta de la galería (🎁), los fondos (degradados con tokens) y los compañeros (🐣, 🦊). El
  botón lleva siempre `aria-label`.
- **S22 · El e2e es determinista sin tocar el código de producción:** `page.addInitScript`
  sustituye `Math.random` por un PRNG con semilla antes de que cargue la app.
- **S23 · La revisión de la precaché** sale de `VERCEL_GIT_COMMIT_SHA` y, si no existe, de
  `git rev-parse HEAD`. En Vercel no conviene contar con `git`.

## Global Constraints

- **Principios del spec §2, sin excepción:**
  - sonido y no nombre;
  - sin castigos ni mensajes negativos;
  - las recompensas nunca bloquean ni saltan contenido;
  - nada resta estrellas, dominio ni progreso.
- **Texto:**
  - El niño no ve texto: sus instrucciones son audio más icono.
  - El panel de padres es texto para el adulto (`font-sans`, `ink-soft` y `ink`).
- **Tacto y teclado:**
  - Objetivos táctiles del niño ≥ 72 px, separados ≥ 16 px.
  - Botones del panel ≥ 44 px.
  - El panel se usa entero con teclado (§9): etiquetas reales, foco visible y `Escape` cierra
    los diálogos.
- **Color:** sin rojo ni verde de «bien o mal». Los estados no dependen solo del color: el
  equipado lleva borde grueso e icono.
- **Movimiento y celebraciones:**
  - Las animaciones respetan `prefers-reduced-motion`: `motion-safe:` en CSS y
    `MotionConfig reducedMotion="user"` en Framer Motion.
  - Las celebraciones respetan además `settings.reducedCelebrations` (S4).
  - Una celebración dura menos de 4 s y se cierra con un toque.
- Colores y fuentes solo con los tokens de `src/app/globals.css`. Un token nuevo va allí y en
  `docs/diseno-visual.md`.
- **Importaciones:** `features/` y `components/` importan solo los barriles `@/engine`,
  `@/store`, `@/audio` y `@/speech` (lo comprueba `features/boundaries.test.ts`). `engine/`
  y `content/` no importan React ni el DOM.
- Todo audio pasa por el `AudioPlayer`, y la interfaz no espera a que un `play` acabe sin
  tope (deuda 2).
- **Nunca se pierde progreso sin una confirmación explícita del adulto:**
  - importar se rechaza si el documento no valida (D27);
  - reiniciar pide doble confirmación (S15);
  - nada escribe en el disco mientras `readFailed` (I3).
- **Despliegue:** ningún agente despliega en Vercel ni publica nada (D29). El plan deja los
  pasos escritos para el autor.
- **Puertas y commits:**
  - TDD.
  - `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit, con la salida
    recortada: `pnpm test 2>&1 | tail -15`.
  - Desde la T9, también `pnpm build`.
  - Conventional Commits en español con el porqué.
- **Next 16:** antes de tocar código de Next (manifest, layout, route handler, metadata), lee
  la guía en `node_modules/next/dist/docs/`.

## Review Focus

1. **El adulto importa un fichero equivocado:** JSON roto, otro JSON, `{}`, una exportación
   con `version: 2` o una clave corrupta. Se espera un rechazo con mensaje y el progreso
   intacto, en memoria y en el disco. → T2, A3-A5; T6, D5.
2. **Primer uso y contexto sin HTTPS:** `pinHash: null` pide crear el PIN, sin pantalla muerta.
   Sin `crypto.subtle` (`http://<ip-lan>`) se ve un mensaje claro y un botón para volver. →
   T5, N1 y N6.
3. **Reiniciar o importar en mal momento:** con `readFailed` activo o con una sesión en curso,
   se espera una negativa sin escribir nada. → T2, A7-A8.
4. **Un service worker viejo tras un despliegue:** la versión nueva se aplica en «Toca para
   empezar», nunca a mitad de sesión, y la app sigue arrancando sin red. → T9, H3-H5; T10, J4.
5. **El rastro de dedo encima de `trace` y de `build`:** con un rastro equipado, un trazo y un
   arrastre dan el mismo resultado que sin él. → T8, F6.

---

## Estructura de archivos

```
src/engine/cosmetics.ts                  crear: catálogo y resolución de equipados (T1)
src/engine/progress-report.ts            crear: progressReport, unitProgress (T1)
src/engine/rewards.ts                    modificar: nextMilestone (T1)
src/engine/index.ts                      modificar: barril (T1, T3)
src/store/pin.ts                         crear: hashPin, verifyPin, pinSupported (T2)
src/store/persist.ts                     modificar: importState estricto (T2)
src/store/app-store.ts                   modificar: acciones del adulto, lastSavedAt (T2), traceCase (T3)
src/content/glyphs.ts                    modificar: LOWER_GLYPHS, glyphFor en minúscula (T3)
src/engine/session.ts                    modificar: traceCase en la corrida (T3)
src/features/session/trace/*.tsx         modificar: caso de letra (T3), borrar y listo (T4)
src/components/TraceCanvas.tsx           modificar: vaciar la tinta desde fuera, si hace falta (T4)
src/features/adult/AdultDoor.tsx         crear: sustituye a ExportGesture (T5)
src/features/adult/ParentGate.tsx        crear: PIN, alta y pregunta de adulto (T5)
src/features/adult/challenge.ts          crear: pregunta de adulto, pura (T5)
src/features/adult/ParentPanel.tsx       crear: estructura y ajustes (T5), progreso y datos (T6)
src/features/adult/ProgressSection.tsx   crear (T6)
src/features/adult/DataSection.tsx       crear (T6)
src/features/App.tsx                     modificar: pantallas panel y galería, acento en vivo (T5, T8)
src/features/map/MapScreen.tsx           modificar: estrellas, hito, avance, guardado (T7), compañero y galería (T8)
src/features/rewards/*.tsx               crear: RewardsScreen, visuals.ts, TrailLayer, CosmeticBackground (T8)
src/features/session/EndScreen.tsx       modificar: Framer Motion, reducedCelebrations, compañero (T8)
src/app/sw.ts, src/app/serwist/…         crear: service worker (T9)
src/app/manifest.ts, src/app/layout.tsx  crear / modificar (T9)
src/features/pwa/update.ts               crear: aplicar la actualización en inicio (T9)
scripts/iconos-pwa.py, public/icons/app-*.png   crear (T9)
playwright.config.ts, e2e/**             crear (T10)
docs/arte-plan-7-prompts.md              crear (T11)
docs/despliegue-vercel.md                crear (T9)
```

---

## Tarea 1: Motor — cosméticos, informe de progreso y próximo hito

**Riesgo:** lógica nueva del motor y contrato con la interfaz. **Effort:** `high`. Revisión
completa con **mutaciones** (lista al final).

**Files:** crear `src/engine/cosmetics.ts` y `src/engine/progress-report.ts` con sus tests;
modificar `src/engine/rewards.ts`, `src/engine/index.ts` y sus tests.

**Interfaces que produce** (las usan T2, T6, T7 y T8):

```ts
// engine/cosmetics.ts
export type CosmeticSlot = "background" | "companion" | "trail";
export type Cosmetic = { id: string; slot: CosmeticSlot; rewardId: string | null };
export const COSMETICS: readonly Cosmetic[];
export const DEFAULT_COSMETICS: Readonly<Record<CosmeticSlot, string>>;
export type Equipped = Record<CosmeticSlot, string>;
/** Siempre tres ids válidos: el guardado si existe, es de esa ranura y está desbloqueado;
 *  si no, el de por defecto. */
export function resolveEquipped(rewards: {
  unlockedAt: Record<string, string>;
  equipped: { background: string | null; companion: string | null; trail: string | null };
}): Equipped;
export function isUnlocked(cosmetic: Cosmetic, unlockedAt: Record<string, string>): boolean;
/** Los de esa ranura, en el orden del catálogo, con `unlocked` calculado. */
export function cosmeticsFor(slot: CosmeticSlot, unlockedAt: Record<string, string>):
  Array<Cosmetic & { unlocked: boolean }>;
/** `true` si el cosmético existe y está desbloqueado. `slot` sale del catálogo. */
export function canEquip(cosmeticId: string, unlockedAt: Record<string, string>): boolean;
/** La gorra de `ten-sessions` no tiene ranura (S5): el compañero la lleva si está ganada. */
export function wearsCap(unlockedAt: Record<string, string>): boolean;

// engine/progress-report.ts
export type ItemStatus = "mastered" | "learning" | "unseen";
export type UnitReport = {
  unitId: string; title: string; status: UnitStatus; bestStars: Stars;
  counts: Record<ItemStatus, number>;
  items: Array<{ itemId: string; text: string; status: ItemStatus }>;
};
export type PhaseReport = { phase: 0 | 1 | 2; units: UnitReport[] };
/** Fases 0-2 en el orden del currículo. Las unidades vacías de la Fase 3 no salen. */
export function progressReport(content: CurriculumIndex, state: ProgressState): PhaseReport[];
/** Ítems dominados de `unit.introduces`. Lanza con una unidad desconocida. */
export function unitProgress(content: CurriculumIndex, state: ProgressState, unitId: string):
  { mastered: number; total: number };

// engine/rewards.ts
/** Tramo actual hacia el próximo hito de STAR_MILESTONES, o null a partir de 100. */
export function nextMilestone(totalStars: number): { from: number; to: number } | null;
```

**Catálogo (los ids son los del contrato; lo visual llega en T8 y el Plan 7):**

| id | ranura | `rewardId` |
|---|---|---|
| `bg:default` | background | `null` |
| `bg:pradera` | background | `first-session` |
| `bg:espacio` | background | `steady-hand` |
| `bg:bosque` | background | `phase2-done` |
| `companion:first` | companion | `null` |
| `companion:second` | companion | `five-vowels` |
| `trail:none` | trail | `null` |
| `trail:estrellitas` | trail | `first-syllable-voice` |
| `trail:burbujas` | trail | `word-reader` |

**Reglas:**
- Estado de cada ítem:
  - `unseen`: `!presented`;
  - `mastered`: `isMastered`;
  - `learning`: el resto (presentado y sin dominar).
- `progressReport` usa `itemProgressOf`, así que un ítem sin entrada es `unseen`. El `status`
  de la unidad sale de `recomputeUnitStatuses`, no del documento tal cual.
- **Barril `@/engine`:**
  - añade todo lo de arriba, más `totalStars`, `REWARDS` y `STAR_MILESTONES` si aún no están;
  - `unitMasteryRatio` sigue **fuera** (D3): el test que lo comprueba no se toca.
- `nextMilestone`:
  - `0` → `{from: 0, to: 10}`;
  - `10` → `{from: 10, to: 25}`;
  - `99` → `{from: 50, to: 100}`;
  - `100` → `null`.

**Casos de test:**
- K1 `resolveEquipped`:
  - todo `null` → los tres por defecto;
  - `bg:pradera` con `first-session` desbloqueado → `bg:pradera`;
  - `bg:pradera` **sin** desbloquear → `bg:default`;
  - id desconocido (`bg:luna`) → `bg:default`;
  - un id de otra ranura en `background` (`trail:burbujas`, desbloqueado) → `bg:default`.
- K2 `canEquip`: desbloqueado → `true`; bloqueado → `false`; desconocido → `false`; los de por
  defecto → siempre `true`.
- K3 `cosmeticsFor("trail", {word-reader})` →
  `[none (unlocked), estrellitas (false), burbujas (true)]`.
- K4 catálogo:
  - cada `rewardId` no nulo existe en `REWARDS`;
  - hay exactamente un cosmético por defecto por ranura;
  - `DEFAULT_COSMETICS` coincide con ellos;
  - los ids son únicos.
- K5 `wearsCap`: con `ten-sessions` → `true`; sin él → `false`.
- K6 `progressReport` sobre el currículo real con `emptyProgressState()`:
  - tres fases (0, 1, 2);
  - ningún `phase3:*`;
  - todo `unseen`;
  - la primera unidad `active` y las demás `locked`.
- K7 `progressReport`:
  - estado con `letter:a` dominado, `letter:e` presentado con `box 1` y el resto sin tocar →
    en `phase1:a`, `letter:a` `mastered` y los recuentos cuadran con los ítems;
  - en `phase1:e`, `letter:e` `learning`;
  - la suma de `counts` es igual a `items.length` en todas las unidades.
- K8 `unitProgress`: `phase0:clap` vacío → `{0, n}`, con `n === unit.introduces.length`; con
  dos dominados → `{2, n}`; `"phase9:x"` → lanza.
- K9 `nextMilestone`: los cuatro valores de las reglas, más `25` → `{25, 50}` y `150` → `null`.
- K10 barril: `unitMasteryRatio` sigue sin exportarse; `resolveEquipped` y `progressReport`
  se exportan.

**Mutaciones que debe probar el revisor:**
- quitar la comprobación de desbloqueo en `resolveEquipped`;
- quitar la comprobación de ranura;
- `learning`/`unseen` intercambiados (mirar `box > 0` en vez de `presented`);
- `>=` → `>` en `nextMilestone` (el caso `10`);
- `progressReport` leyendo `state.units[id].status` en vez de recalcular.

- [ ] Tests K1-K10 escritos; verlos fallar
- [ ] Implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(engine): catálogo de cosméticos e informe de progreso, para que la interfaz del adulto y la galería pinten lo que decide el motor`

---

## Tarea 2: Store — acciones del adulto e importación estricta

**Riesgo:** `store/` y el contrato de datos (D27). **Effort:** `high`. Revisión completa con
**mutaciones**.

**Files:** crear `src/store/pin.ts` y su test; modificar `src/store/persist.ts`,
`src/store/app-store.ts`, `src/store/index.ts` y sus tests.

**Interfaces que produce** (las usan T5-T8):

```ts
// store/persist.ts — sustituye a la importState anterior (S1, D27)
export type ImportRejection = "json" | "version" | "schema";
export type ImportResult =
  | { ok: true; state: PersistedState }
  | { ok: false; reason: ImportRejection };
/** Estricta: JSON.parse → no es un objeto → "schema"; `version` distinta de
 *  CURRENT_VERSION → "version"; `persistedStateSchema.safeParse` falla → "schema".
 *  Nunca llama a `migrate`, ni devuelve un documento vacío o rescatado. Los `.default()` del
 *  esquema sí aplican: una exportación v1 sin `hideMic` es válida. */
export function importState(json: string): ImportResult;

// store/pin.ts (S2)
export function pinSupported(): boolean;   // typeof crypto?.subtle?.digest === "function"
/** "sha256:<salHex>:<hashHex>", con 16 bytes de sal de crypto.getRandomValues. Lanza si
 *  `pin` no cumple /^\d{4}$/ o si no hay crypto.subtle. */
export function hashPin(pin: string): Promise<string>;
/** false con un `stored` mal formado, nunca lanza por eso. */
export function verifyPin(pin: string, stored: string): Promise<boolean>;

// store/app-store.ts — AppState gana:
lastSavedAt: string | null;   // `now()` del último saveState con saved: true
updateSettings(patch: Partial<Omit<Settings, "pinHash">>): Promise<void>;
setPin(pin: string): Promise<void>;
checkPin(pin: string): Promise<boolean>;   // false si pinHash es null
equip(cosmeticId: string): Promise<void>;  // lanza si !canEquip; la ranura sale del catálogo
previewImport(json: string): ImportPreview;
importDoc(state: PersistedState): Promise<void>;
resetAll(): Promise<{ done: boolean; reason?: "read-failed" | "in-session" }>;

export type ImportPreview =
  | { ok: false; reason: ImportRejection }
  | { ok: true; state: PersistedState; summary: {
      sessions: number; totalStars: number; unitsDone: number;
      childName: string | null; lastSessionAt: string | null } };
```

**Reglas:**
- **`updateSettings`:**
  - fusiona con los ajustes actuales, valida con `settingsSchema` (lanza si no valida, porque
    es un error de programación) y guarda;
  - no toca `pinHash`, que tiene su propia acción;
  - `sessionLength` y `lowercaseTracing` se aplican en el siguiente `beginSession`, nunca a
    la corrida en curso.
- **`importDoc`:**
  - lanza si `run !== null`;
  - sustituye `doc` entero, **pero conserva el `pinHash` actual** (S18);
  - pone `readFailed: false` y `recovered: false` (D9) y recalcula `progress`;
  - después guarda.
- **`resetAll`:**
  - con `readFailed` o con una sesión en curso, devuelve la negativa sin escribir nada;
  - si no, llama a `adapter.clear()` y deja `emptyPersistedState()` **con el `pinHash`
    actual** (S15);
  - guarda y recalcula `progress`.
- **Acciones comunes:** `equip`, `setPin` y `updateSettings` usan el `guardar` existente, así
  que respetan `readFailed`.
- **`lastSavedAt`:** se pone en cada guardado con `saved: true`.
- `StorageAdapter.clear()` ya existe (`persist.ts:14`), también en `createMemoryAdapter`.
- **Barril `@/store`:** añade `ImportPreview`, `ImportRejection` y `Settings`.
  `hashPin`/`verifyPin` no entran: la interfaz usa `setPin` y `checkPin`, y `pinSupported`
  sí entra.

**Casos de test:**
- A1 `hashPin("1234")`:
  - formato `sha256:<32 hex>:<64 hex>`;
  - dos llamadas dan sales distintas;
  - `verifyPin("1234", h)` es `true` y `verifyPin("1235", h)` es `false`.
- A2 `hashPin("12a4")`, `hashPin("123")` y `hashPin("12345")` lanzan. `verifyPin("1234",
  "basura")` y `verifyPin("1234", "sha256:zz:zz")` dan `false` sin lanzar.
- A3 `importState`:
  - `"no es json"` → `json`;
  - `"[]"` y `"42"` → `schema`;
  - `"{}"` → `version` (no hay versión);
  - `{version: 2, …}` → `version`;
  - una exportación válida con `units` corrupto → `schema`.
- A4 `importState(exportState(doc))` con un documento con progreso → `ok` y el mismo
  documento. Una exportación v1 **sin** `hideMic` ni `syllablesVoiced` → `ok`, con los
  valores por defecto.
- A5 `previewImport` de un fichero malo no cambia nada: ni `doc`, ni `progress`, ni el
  adaptador (el contador de escrituras del adaptador en memoria sigue a 0).
- A6 `importDoc`:
  - con `readFailed: true` y `recovered: true` los deja a `false`;
  - guarda (el adaptador recibe el documento);
  - conserva el `pinHash` anterior aunque el importado traiga otro;
  - `progress` refleja el documento nuevo.
- A7 `importDoc` con una sesión en curso lanza sin tocar nada.
- A8 `resetAll`:
  - con `readFailed` → `{done: false, reason: "read-failed"}` y ni `clear` ni `write`;
  - con una sesión → `in-session`;
  - normal → `clear` llamado, `doc` vacío con el `pinHash` conservado y `progress`
    recalculado.
- A9 `updateSettings({sessionLength: 6})`:
  - guarda;
  - la corrida siguiente tiene 6 ejercicios (`budget = sessionLength - presentaciones`);
  - `updateSettings({pinHash: "x"} as never)` no cambia el PIN;
  - `updateSettings({sessionLength: 7 as never})` lanza.
- A10 `setPin`/`checkPin`: `checkPin` con `pinHash: null` → `false`; tras `setPin("4321")`,
  `checkPin("4321")` → `true` y `checkPin("0000")` → `false`.
- A11 `equip("bg:pradera")`: sin `first-session` lanza; con él, guarda
  `rewards.equipped.background === "bg:pradera"`.
- A12 `lastSavedAt`: `null` al cargar; tras un guardado bueno, el `now()` inyectado; tras un
  `saved: false`, no cambia.

**Mutaciones que debe probar el revisor:**
- `importState` cayendo a `migrate`;
- quitar la comprobación de `version`;
- `importDoc` sin conservar `pinHash`;
- `resetAll` sin mirar `readFailed`;
- `verifyPin` comparando sin la sal;
- `updateSettings` que deja pasar `pinHash`.

- [ ] Tests A1-A12 escritos; verlos fallar
- [ ] Implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(store): importación estricta y acciones del adulto, para que un fichero equivocado nunca borre el progreso`

---

## Tarea 3: Trazo en minúsculas (D28)

**Riesgo:** lógica del motor (qué glifo se puntúa) y contenido geométrico. **Effort:** `high`.
Revisión completa con **mutaciones**.

**Files:**
- `src/content/glyphs.ts` y `glyphs.test.ts`;
- `src/engine/session.ts` y su test;
- `src/store/app-store.ts` y su test;
- `src/features/session/trace/{Presentation,Evaluation}.tsx` y sus tests;
- `src/features/dev/PlantillasDev.tsx`.

**Interfaces:**

```ts
// content/glyphs.ts
export const LOWER_GLYPHS: Readonly<Record<string, Glyph>>;   // a e i o u m l s p
/** glyphFor(item, "lower") deja de lanzar para esas 9 letras. */
/** Pares (dibujado, pedido) que pasan como válidos con las constantes de partida, medidos. */
export const LOWER_CONFUSABLE_PAIRS: ReadonlyArray<readonly [string, string]>;

// engine/session.ts
SessionRun.traceCase: LetterCase;               // fijo desde startSession (S8)
startSession(input: { …; traceCase: LetterCase }): SessionRun;
```

`submitTrace`, `acceptsModelTrace` y `traceGuide` usan `run.traceCase`. Las vistas lo leen
con `useApp((s) => s.run?.traceCase ?? "upper")`. `beginSession` pasa
`doc.settings.lowercaseTracing ? "lower" : "upper"`.

**Geometría de las minúsculas** (misma caja de altura 1, con `y` hacia abajo):
- pauta: ascendente en `y = 0`, altura x de `0.35` a `0.75`, línea base en `0.75` y
  descendente hasta `1`;
- `l` sube a la ascendente;
- `p` baja a la descendente;
- el punto de la `i` es un trazo corto propio (`0.18` a `0.24`), no un punto aislado;
- la `a` es de un solo piso (óvalo más palo), como en Andika;
- trazos en orden escolar.

Construye los glifos con los `line`/`arc` existentes y sigue el estilo de `UPPER_GLYPHS`.
`TraceCanvas` escala por la caja completa, así que no necesita cambios. Compruébalo en
`/dev/plantillas`.

**Casos de test:**
- L1 las 9 minúsculas existen:
  - `glyphFor(letter, "lower")` no lanza;
  - todos los puntos están en `[0, width] × [0, 1]`;
  - las letras de altura x no pasan de `0.3` por arriba;
  - `l` llega a `y ≤ 0.05`, y `p` a `y ≥ 0.95`.
- L2 cada minúscula trazada con sus propios trazos → `scoreTrace(...).correct`. Con el ruido
  y el desplazamiento que usan los tests de mayúsculas, sigue siendo correcta.
- L3 matriz de pares, como G15:
  - para cada par (dibujado, pedido) de las 9 minúsculas, `correct` es `true` solo en la
    diagonal y en `LOWER_CONFUSABLE_PAIRS`;
  - el implementador **mide** la lista y la escribe; no la ajusta con las constantes;
  - si un par muy distinto pasa, lo reporta en vez de retocar `TOLERANCE`.
- L4 `isNegligibleTrace` con el punto de la `i` solo (el palo sin dibujar) → no despreciable
  si la tinta supera el umbral. Documenta qué pasa con un toque solo en el punto.
- L5 `startSession({traceCase: "lower"})` → `run.traceCase === "lower"`. `submitTrace` con la
  `a` minúscula pasa y con la `A` mayúscula falla (o se documenta si pasa por confundible).
  `traceGuide(...).glyph === LOWER_GLYPHS.a`.
- L6 store: con `lowercaseTracing: true`, `beginSession` da `traceCase: "lower"`. Cambiar el
  ajuste a media sesión no cambia `run.traceCase`.
- L7 vistas:
  - `Presentation` y `Evaluation` de `trace`, con una corrida en minúscula, pintan el glifo
    minúsculo (se comprueba con el `d` del camino o un `data-case`);
  - el par A/a de la presentación sigue visible (§2).
- L8 el invariante de `evaluable.test.ts` comprueba también `glyphFor(item, "lower")` en
  cada ítem de `trace`.

**Mutaciones que debe probar el revisor:**
- `submitTrace` con `"upper"` fijo;
- `traceGuide` con `"upper"` fijo;
- `beginSession` sin leer el ajuste;
- una letra quitada de `LOWER_CONFUSABLE_PAIRS` (L3 debe fallar).

- [ ] Prototipo de glifos y medición de pares (reporta la matriz)
- [ ] Tests L1-L8; verlos fallar; implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(trace): minúsculas con su caso fijado en la corrida, para que el adulto pueda activarlas sin cambiar la letra de un ejercicio empezado`

---

## Tarea 4: `trace` — borrar y confirmar (D31b, S9)

**Riesgo:** flujo de una vista con temporizador. **Effort:** `medium`. Revisión de cumplimiento
con **2 mutaciones**.

**Files:** `src/features/session/trace/Evaluation.tsx` y su test; `src/components/TraceCanvas.tsx`
(solo si la tinta vive allí).

**Contrato:**
- **Cuándo se ven:** los dos botones solo aparecen con tinta en el lienzo, y se ocultan
  mientras suena o se anima una pista.
  - «Borrar» (🧽, `aria-label="Borrar"`)
  - «Listo» (👍, `aria-label="Listo"`)
- **«Borrar»:**
  - vacía la tinta y cancela el temporizador de `TRACE_IDLE_MS`;
  - no llama al motor ni suena `feedback:retry`;
  - no gasta intento ni pista.
- **«Listo»:**
  - cancela el temporizador y cierra el intento en el acto;
  - es el mismo camino que el temporizador: `onTrace` o, en el modelo del tercer rung,
    `acceptsModelTrace`.
- El temporizador de 1,5 s sigue igual (S9).
- Si la tinta vive dentro de `TraceCanvas`, gana una prop `resetKey: number` que la vacía al
  cambiar. Si vive en `Evaluation`, basta con vaciarla ahí.
- Los botones quedan fuera del lienzo y no lo tapan. Miden ≥ 72 px y no hay scroll en 360 × 640.

**Casos de test (fake timers):**
- B1 sin tinta no hay botones; tras un trazo, aparecen los dos.
- B2 «Borrar» → la tinta desaparece; pasados 2 s no se llamó a `answerTrace`; el intento y la
  pista siguen iguales.
- B3 «Listo» → `answerTrace` se llama una vez, en el acto. Pasados 2 s no se llama otra vez.
- B4 «Listo» en el modelo del tercer rung, con tinta suficiente, avanza igual que el
  temporizador. Con un punto, no avanza (D19, P12).
- B5 mientras se muestra la animación de la pista 2 no hay botones.

**Mutaciones:** «Borrar» sin cancelar el temporizador (B2 debe fallar); «Listo» sin cancelarlo
(B3 debe fallar, porque habría doble envío).

- [ ] Tests B1-B5; verlos fallar; implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(trace): botones de borrar y listo, para que el niño rehaga o confirme el trazo sin esperar al temporizador`

---

## Tarea 5: Panel de padres — puerta del PIN, estructura y ajustes

**Riesgo:** contrato con el store y accesibilidad. **Effort:** `high`. Revisión completa; las
mutaciones van a la puerta.

**Files:**
- crear `src/features/adult/{AdultDoor,ParentGate,ParentPanel}.tsx`,
  `src/features/adult/challenge.ts` y sus tests;
- modificar `src/features/App.tsx` y `src/features/map/MapScreen.tsx`;
- borrar `ExportGesture.tsx`, pero conservar `downloadInBrowser` y `exportFilename` moviéndolos
  a `features/adult/download.ts`.

**Interfaces:**

```ts
// features/adult/challenge.ts (pura)
export type AdultChallenge = { question: string; answer: number };
/** "¿Cuánto es 7 × 8?", con factores de 6 a 9. `random` se inyecta. */
export function adultChallenge(random: () => number): AdultChallenge;

// App: Screen = "start" | "map" | "session" | "end" | "panel" | "rewards"
// AdultDoor: mantener pulsado 3 s (use-long-press, PANEL_HOLD_MS = 3000) → onOpen()
```

**Flujo de `ParentGate`** (texto para el adulto; se puede usar entero con teclado):
1. Sin `pinSupported()`: «El panel necesita una conexión segura (https)», más el botón
   «Volver».
2. `pinHash === null`: «Crea un PIN de 4 números». Se escribe dos veces; si no coinciden,
   «No coinciden» y vuelta a empezar. Luego `setPin` y se abre el panel.
3. Con PIN: un campo `inputMode="numeric"`, `type="password"`, `maxLength={4}`, con su
   etiqueta. Con 4 dígitos se llama a `checkPin`. Si es correcto, se abre el panel; si no,
   sale «PIN incorrecto» y se vacía el campo. Sin bloqueo temporal.
4. «¿Olvidaste el PIN?» siempre visible: abre la pregunta de adulto. Con la respuesta
   correcta se va al paso 2, sin tocar el progreso (D26). Con una incorrecta sale otra
   pregunta.
5. «Volver» siempre visible. `Escape` también vuelve.

**`ParentPanel`**, con tres secciones y encabezados (T5 hace la estructura y «Ajustes»; T6
llena las otras dos):
- **Ajustes.** Cada cambio llama a `updateSettings` al momento:
  - acento (`do` / `mx` / `neutro`, con nombres legibles);
  - trazo de minúsculas;
  - longitud de la sesión (5 / 6);
  - evaluador de voz (auto / solo adulto) y la línea «Evaluador activo: adulto», que sale de
    `pickEvaluator` (§6, privacidad);
  - ocultar el micrófono;
  - celebraciones reducidas;
  - nombre del niño (texto recortado, 40 caracteres como máximo, vacío → `null`, S16);
  - «Cambiar PIN», que va al paso 2.
- **Datos.** En T5 solo lleva «Exportar», para que exportar no deje de existir entre T5 y T6.
- «Cerrar» vuelve al mapa.

**Acento en vivo (S3):** `App` se suscribe a `doc.settings.accent`. Al cambiar, llama a
`stop()` del reproductor anterior y crea uno nuevo con `createAudio(accent)`. Los tests
siguen pudiendo inyectar el reproductor: con `props.audio`, el acento no lo recrea.

**Casos de test:**
- N1 sin `crypto.subtle` (se simula en el test) sale el mensaje y «Volver» lleva al mapa.
- N2 primer uso: dos PIN distintos → «No coinciden» y no se llama a `setPin`. Dos iguales →
  `setPin` y se ve el panel.
- N3 un PIN incorrecto no abre y vacía el campo; el correcto abre.
- N4 PIN olvidado:
  - una respuesta mala no deja pasar y cambia la pregunta;
  - la buena lleva a crear un PIN;
  - el progreso (`doc.items`) no cambia.
- N5 `adultChallenge` con `random` fijo: la pregunta y la respuesta coinciden (`6..9`).
- N6 se usa entero con teclado: `Tab` llega al campo, a «¿Olvidaste…?» y a «Volver», y
  `Escape` vuelve.
- N7 ajustes:
  - cambiar la longitud a 6 → `doc.settings.sessionLength === 6`;
  - activar las minúsculas → `lowercaseTracing: true`;
  - nombre `"  Ana  "` → `"Ana"`, y un nombre vacío → `null`.
- N8 cambiar el acento en el panel crea un reproductor nuevo con ese acento (fábrica de
  audio falsa, inyectada).
- N9 el gesto de 3 s sobre el logo abre la puerta. Soltar a los 2 s no abre nada. Exportar
  desde el panel llama a `download` con el nombre de `exportFilename`.
- N10 `boundaries.test.ts` sigue en verde, y nada de `features/adult` importa `@/store/…`
  interno.

**Mutaciones:** abrir el panel sin `checkPin`; «¿Olvidaste?» que deja pasar con cualquier
respuesta; nombre sin recortar.

- [ ] Tests N1-N10; verlos fallar; implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(adult): panel de padres con PIN y ajustes, para que el adulto controle voz, trazo y sesión sin tocar el código`

---

## Tarea 6: Panel de padres — progreso y datos

**Riesgo:** interfaz sobre contratos ya probados (T1, T2). **Effort:** `medium`. Revisión de
cumplimiento, más **1 mutación** en importar.

**Files:** crear `src/features/adult/{ProgressSection,DataSection}.tsx` y sus tests; modificar
`ParentPanel.tsx`.

**Contrato:**
- **Progreso:**
  - `progressReport` en forma de lista: fase, luego unidad (título, estado y estrellas), luego
    los recuentos «dominados / en repaso / sin ver»;
  - cada unidad se despliega con `<details>` y lista sus ítems con su estado en texto (no
    solo con color);
  - debajo, las **últimas 10 sesiones** de `doc.sessions`, de la más nueva a la más antigua:
    fecha legible (`toLocaleDateString("es")`), unidad (o «Repaso») y estrellas;
  - sin sesiones: «Todavía no hay sesiones».
- **Datos:**
  - **Exportar:** el nombre del fichero lleva `childName` si existe (S16): `silabin-ana-2026-09-28.json`,
    en minúsculas y sin tildes ni espacios.
  - **Importar:**
    - `<input type="file" accept="application/json,.json">`, se lee con `file.text()` y se
      llama a `previewImport`;
    - si se rechaza, un mensaje por motivo, sin tocar nada:
      - `json`: «El fichero no es una exportación de Silabín»;
      - `version`: «Esta exportación es de otra versión de Silabín»;
      - `schema`: «La exportación está dañada»;
    - si vale, un resumen (nombre, sesiones, estrellas, unidades completas, fecha de la
      última sesión) y los botones «Sustituir el progreso actual» y «Cancelar»; al
      confirmar, `importDoc` y el mensaje «Progreso importado».
  - **Reiniciar todo:**
    - primer botón «Reiniciar todo»;
    - luego un diálogo `role="alertdialog"` que dice «Se borrará todo el progreso. El PIN se
      conserva.», con «Sí, borrar todo» y «Cancelar»;
    - al confirmar, `resetAll`;
    - con `read-failed`: «No se puede reiniciar: no se pudo leer el progreso guardado.
      Recarga la página.»

**Casos de test:**
- D1 progreso con el currículo real vacío: 3 fases, la primera unidad «Activa» y todo «sin
  ver».
- D2 hay 12 sesiones y solo se ven 10, la más nueva primero; una de repaso dice «Repaso».
- D3 exportar con `childName: "Ana María"` → `silabin-ana-maria-AAAA-MM-DD.json`.
- D4 importar un fichero válido: se ve el resumen; «Cancelar» no llama a `importDoc`; al
  confirmar, sí, y el mapa enseña el progreso importado.
- D5 importar cada uno de los tres rechazos: el mensaje es el de su motivo y `importDoc` no
  se llama.
- D6 reiniciar: un solo toque no borra; «Cancelar» no borra; la doble confirmación llama a
  `resetAll`; `read-failed` enseña el mensaje.
- D7 el diálogo de reiniciar se usa con teclado: el foco entra en él y `Escape` cancela.

**Mutación:** importar sin pasar por la confirmación (D4 debe fallar).

- [ ] Tests D1-D7; verlos fallar; implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(adult): progreso, importar y reiniciar en el panel, para que el adulto vea el avance y mueva el progreso entre dispositivos sin riesgo`

---

## Tarea 7: Mapa — estrellas, hito, avance de la unidad y «guardado» (D31a)

**Riesgo:** interfaz. **Effort:** `medium`. Revisión de cumplimiento.

**Files:** `src/features/map/MapScreen.tsx` y su test; crear `src/features/map/StarCounter.tsx`
si hace falta.

**Contrato:**
- **Contador de estrellas** arriba: `totalStars(progress)` con una ★.
  - Con `nextMilestone` no nulo, una barra `role="progressbar"` con `aria-valuemin={from}`,
    `aria-valuemax={to}` y `aria-valuenow={total}` que se rellena con `celebrate`.
  - Pasado el 100 solo se ve el total.
  - Es un número, no texto para leer.
- **Avance de la unidad activa (S17):** un punto lleno por ítem dominado
  (`unitProgress().mastered`), sin huecos vacíos. `aria-label` para el adulto: «3 letras
  aprendidas». Con 0 no se pinta nada.
- **«Guardado»:** una marca discreta (✓ en `ink-soft`, ~24 px, sin tocar) con
  `aria-label`/`title` «Guardado a las HH:MM», que sale de `lastSavedAt`. No sale con
  `lastSavedAt === null` ni con `saveFailed`, porque entonces ya está `SaveWarning`.
- Actualiza el comentario de cabecera de `MapScreen` («No hay barras de dominio…») para que
  cuente S17.

**Casos de test:**
- E1 con 0 estrellas se ve `0` y la barra va de 0 a 10. Con 27 estrellas, la barra va de 25 a
  50 con `valuenow` 27. Con 120, no hay barra.
- E2 unidad activa con 2 ítems dominados → 2 puntos y `aria-label` «2 … aprendidas»; con 0,
  ningún punto.
- E3 `lastSavedAt` fijo → la marca con la hora. Con `saveFailed`, no hay marca.
- E4 el mapa sigue sin scroll horizontal en 360 px (clase o comprobación de la estructura, como
  en los tests existentes).

- [ ] Tests E1-E4; implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(map): estrellas, próximo hito y avance de la unidad, para que el niño vea lo que gana antes de completar una unidad`

---

## Tarea 8: Recompensas — galería, cosméticos, rastro y celebraciones

**Riesgo:** interfaz, con un riesgo concreto de eventos (S10). **Effort:** `medium`. Revisión
de cumplimiento, más **2 mutaciones** en el rastro.

**Files:**
- crear `src/features/rewards/{RewardsScreen,TrailLayer,CosmeticBackground,Companion}.tsx` y
  `src/features/rewards/visuals.ts`, con sus tests;
- modificar `App.tsx`, `MapScreen.tsx` y `EndScreen.tsx`;
- `package.json` gana `motion` (comprobado con context7; S14).

**Contrato:**
- **`visuals.ts`** es el único sitio que traduce un id de cosmético o de logro a algo que se
  ve. Hoy son marcadores (S21): degradados con tokens para los fondos, emoji para los
  compañeros, las pegatinas y el trofeo, y una forma por rastro. El Plan 7 cambia **solo**
  este fichero y los assets. Todo id del catálogo y de `REWARDS` tiene entrada, y un test
  lo comprueba.
- **`RewardsScreen`** (se abre desde el mapa con 🎁, `aria-label="Mis premios"`):
  - Álbum: todos los `REWARDS` que no son cosméticos, más los hitos.
    - Los ganados, en color.
    - Los no ganados, como silueta gris (`opacity` y `grayscale`), con `aria-label` «Por
      descubrir». No son botones.
  - Tres filas equipables (fondo, compañero y rastro), con `cosmeticsFor`:
    - al tocar uno desbloqueado se llama a `equip`;
    - los bloqueados son silueta y no reaccionan;
    - el equipado lleva borde grueso e icono (✓), no solo color;
    - objetivos ≥ 72 px.
  - Botón «volver» al mapa.
- **`CosmeticBackground`** envuelve el mapa, la galería y el fin de sesión con el fondo de
  `resolveEquipped` (S19). Nunca envuelve `SessionScreen`.
- **`Companion`**, en el mapa y en el fin de sesión, con la gorra si `wearsCap`.
- **`TrailLayer`** (S10), montada una sola vez en `App`:
  - capa `fixed inset-0 pointer-events-none`;
  - escucha `pointerdown`/`pointermove` en `window` con `{capture: true, passive: true}`;
  - nunca llama a `preventDefault` ni a `stopPropagation`;
  - partículas de Framer Motion que duran como mucho 600 ms, con un tope de 24 vivas.
  - No pinta nada con:
    - `trail:none`;
    - movimiento reducido (`useReducedMotion`);
    - `reducedCelebrations`.
- **`EndScreen`:**
  - pasa a Framer Motion, dentro de `MotionConfig reducedMotion="user"`;
  - con `reducedCelebrations`: estrellas y logros quietos, sin partículas, y solo
    `celebrate:session` (sin `reward:new`) (S4);
  - dura menos de 4 s, un toque la cierra y el compañero equipado aparece;
  - la lógica de «un resumen, una celebración» no cambia.

**Casos de test:**
- F1 `visuals.ts` tiene una entrada para cada `COSMETICS[].id` y cada `REWARDS[].id`.
- F2 galería con `first-session` ganado:
  - Pradera se puede equipar;
  - al tocarla se llama a `equip("bg:pradera")` y queda marcada con ✓;
  - Espacio (bloqueada) no llama a nada.
- F3 álbum: lo no ganado tiene `aria-label` «Por descubrir» y no es un botón.
- F4 un `equipped.background` bloqueado en el documento (importado) → el mapa pinta el fondo
  por defecto.
- F5 `EndScreen` con `reducedCelebrations: true` y un logro nuevo: no suena `reward:new`, no
  hay clases ni props de animación y el toque cierra.
- F6 **rastro sobre trazo y arrastre:** con `trail:burbujas` equipado,
  - un trazo en `TraceCanvas` llega igual a `onTrace`, con los mismos puntos que sin rastro;
  - un arrastre de `build` coloca la pieza igual;
  - la capa tiene `pointer-events: none`.
- F7 `TrailLayer` con `trail:none` o con movimiento reducido no monta partículas tras un
  `pointerdown`.
- F8 `CosmeticBackground` no aparece dentro de `SessionScreen`.

**Mutaciones:** el rastro con `preventDefault` en `pointerdown` (F6 debe fallar); la capa sin
`pointer-events-none` (F6 debe fallar).

- [ ] Comprobar con context7 el paquete y la API de Framer Motion (`motion/react`: `motion`,
  `AnimatePresence`, `MotionConfig`, `useReducedMotion`)
- [ ] Tests F1-F8; verlos fallar; implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(rewards): galería, cosméticos y rastro de dedo, para que las estrellas y los logros se puedan ver y usar`

---

## Tarea 9: PWA — Serwist, manifest, actualización en inicio y pasos de Vercel

**Riesgo:** configuración, con un riesgo concreto de actualización (S11). **Effort:** `medium`.
Revisión de cumplimiento, más **1 mutación** en la actualización.

**Files:**
- `package.json`: `@serwist/turbopack`, `esbuild` y `serwist`, comprobados con context7 en
  `/websites/serwist_pages_dev` y la guía «next/turbo»;
- `src/app/sw.ts` y el route handler que pida la guía (`src/app/serwist/[path]/route.ts` o el
  que diga);
- `src/app/manifest.ts` y `src/app/layout.tsx`;
- `src/features/pwa/update.ts` y su test, y `StartScreen.tsx` y su test;
- `scripts/iconos-pwa.py` y `public/icons/app-{192,512}.png` más `apple-touch-icon.png` (S13);
- `docs/despliegue-vercel.md`;
- la sección «Cómo ejecutarlo» del README.

**Contrato:**
- **Service worker** (`sw.ts`, siguiendo la guía de Serwist):
  - precachea lo que genera el build y además `/`, `/images/palabras/*.webp`,
    `/icons/*.png` y las fuentes;
  - la revisión sale de S23;
  - **sin `skipWaiting` automático**: escucha el mensaje `{type: "SKIP_WAITING"}` y solo
    entonces llama a `self.skipWaiting()`;
  - `clientsClaim` es aceptable;
  - la navegación sin red sirve `/` precacheado.
- **Registro:** `SerwistProvider` (o el equivalente de la guía para Turbopack) en `layout.tsx`,
  con `disable` en desarrollo.
- **`manifest.ts`:**
  - `name` «Silabín», `short_name` «Silabín», `lang` «es»;
  - `display: "standalone"`, `orientation: "any"`, `start_url: "/"`;
  - `background_color` y `theme_color` con los valores de `surface` y `action`;
  - iconos 192 y 512 (`purpose: "any maskable"` solo si el margen lo permite).
  - `layout.tsx` gana `appleWebApp: { capable: true, title: "Silabín" }` y `viewport.themeColor`.
- **`features/pwa/update.ts`:**
  ```ts
  /** Si hay un SW esperando, le pide SKIP_WAITING y recarga cuando cambia el controlador.
   *  Devuelve true si va a recargar. Sin serviceWorker o sin registro → false. */
  export function applyWaitingUpdate(deps: {
    container: Pick<ServiceWorkerContainer, "getRegistration" | "addEventListener"> | undefined;
    reload: () => void;
  }): Promise<boolean>;
  ```
- **`StartScreen`:** al tocar «Toca para empezar», primero `applyWaitingUpdate`. Si devuelve
  `true`, no llama a `onStart`, porque la página va a recargar. Si devuelve `false` o tarda más
  de 1 s, sigue como hoy. **Nunca se llama durante una sesión.**
- **Iconos:** provisionales, con la inicial «S» en `action-ink` sobre `action`, generados por
  el script con PIL. El Plan 7 los sustituye.
- **`docs/despliegue-vercel.md`:**
  - lo que tiene que hacer el autor: importar el repo en Vercel (Next detectado), `pnpm`,
    Node 22 y sin variables;
  - comprobar en el iPad que se instala, que funciona sin red y cómo se actualiza;
  - una advertencia: **la URL es pública**.
  - Ningún agente despliega.

**Casos de test:**
- H1 `manifest()` devuelve los campos del contrato, y los iconos existen en `public/icons/`.
- H2 `applyWaitingUpdate` sin `container` → `false`; sin registro → `false`; con registro
  sin `waiting` → `false`.
- H3 con `waiting`: se envía `{type: "SKIP_WAITING"}`, devuelve `true` y `reload` se llama
  cuando se emite `controllerchange`, solo una vez.
- H4 `StartScreen` con una actualización pendiente no llama a `onStart`. Sin ella, sí. Con
  una promesa que no resuelve, llama a `onStart` a los 1 s (fake timers).
- H5 `sw.ts` no contiene `skipWaiting: true` en la configuración de Serwist. Es un test
  estático sobre el fuente, como los de `boundaries.test.ts`.
- H6 `pnpm build` en verde, y `.next`/`public` contienen `sw.js` o la ruta del route handler.
  Lo comprueba el coordinador; si hace falta, queda como un paso sin test.

**Mutación:** `skipWaiting` automático (H5 debe fallar).

- [ ] Leer `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` y la guía de
  Serwist para Turbopack (context7)
- [ ] Tests H1-H5; implementar; iconos con el script
- [ ] `pnpm build` en verde, más `pnpm start` a mano: la pestaña de la aplicación muestra el SW
  activo
- [ ] Commit: `feat(pwa): service worker con precaché y actualización en inicio, para que la app se instale y funcione sin red sin romper una sesión`

---

## Tarea 10: e2e con Playwright (S12, S22)

**Riesgo:** tests. **Effort:** `medium`. Revisión de cumplimiento.

**Files:**
- `package.json`: `@playwright/test`, más el script `"e2e": "playwright test"`;
- `playwright.config.ts`;
- `e2e/fase1.spec.ts`, `e2e/offline.spec.ts`, `e2e/helpers/{seed,solve,draw}.ts`;
- `biome.json` (lint de `e2e`) y `vitest.config.ts` (que no recoja `e2e/`);
- añadir `data-template` y `data-exercise-kind` al contenedor del ejercicio en
  `SessionScreen` si no existen.

**Contrato:**
- **Configuración:**
  - `webServer`: `pnpm build && pnpm start -p 3100`, con `reuseExistingServer` en local;
  - proyecto `iphone`: Chromium con `devices["iPhone 13"]` (viewport, `hasTouch` e
    `isMobile`);
  - proyecto `webkit` opcional, solo si `PW_WEBKIT=1`: en WSL, WebKit necesita
    `install-deps` con sudo, y eso lo decide el autor.
- **`seed.ts`:**
  - construye con `curriculum` y `emptyPersistedState()` un documento con todos los ítems de
    la Fase 0 dominados, que valida con `persistedStateSchema`;
  - lo escribe en IndexedDB (`keyval-store`/`keyval`, clave `silabin.state.v1`) con
    `page.evaluate`, antes de recargar.
- **Semilla (S22):** `addInitScript` sustituye `Math.random` por mulberry32(42).
- **`solve.ts` resuelve cualquier ejercicio sin conocer la respuesta:**
  - presentación → «Siguiente»;
  - opciones → la marcada por el modelo, y si no hay, la primera, hasta que se resuelve;
  - `say-it`/`read-word` → «Lo dijo bien» (en headless no hay micrófono: P4);
  - `trace` → `draw.ts`.
- **`draw.ts`:**
  - convierte los puntos del glifo a coordenadas de pantalla con la misma transformación que
    `TraceCanvas` (léela; si hace falta, expón la caja en un `data-*`);
  - los dibuja con toques por CDP (`Input.dispatchTouchEvent`: `touchStart`, `touchMove`,
    `touchEnd`);
  - luego pulsa «Listo» (T4).

**Casos de test:**
- J1 Fase 1 de punta a punta: con la semilla, se juega una sesión completa desde el mapa
  hasta el fin, y se ve el fin de sesión con al menos una ★. La sesión incluye al menos un
  `trace` resuelto por toques. Si la semilla no da ninguno, se cambia la semilla y se anota
  en el ledger; no se fuerza el planificador.
- J2 la misma sesión con `lowercaseTracing: true` en la semilla: el `trace` se resuelve
  dibujando la minúscula.
- J3 el panel: se mantiene pulsado el logo, se crea el PIN, se cambia la longitud a 6, se
  cierra, y la sesión siguiente tiene 6 pasos en la barra de progreso.
- J4 sin red:
  - se carga una vez y se espera a que el SW controle la página;
  - `context.setOffline(true)` y se recarga;
  - «Toca para empezar» funciona, el mapa sale y una ilustración (`/images/palabras/…`)
    carga.

- [ ] Instalar y comprobar la versión con context7; `pnpm exec playwright install chromium`
- [ ] J1-J4 en verde con `pnpm e2e`
- [ ] Puertas en verde; `pnpm test` no recoge `e2e/`
- [ ] Commit: `test(e2e): Fase 1, panel y modo sin red con Playwright, para probar el recorrido real con toques y service worker`

---

## Tarea 11: Cierre — prompts del arte, integración, README y prueba manual

**Riesgo:** docs, con una integración ligera. **Effort:** `medium`. Revisión de cumplimiento.

**Files:**
- crear `docs/arte-plan-7-prompts.md` y `src/features/Panel.integration.test.tsx`;
- modificar `README.md`, `docs/archivo-trampas-y-deuda.md`, `docs/diseno-visual.md` y el
  ledger.

**Contrato:**
- **`docs/arte-plan-7-prompts.md` (D25):**
  - un prompt por asset, en el estilo y con la plantilla de `docs/ilustraciones-prompts.md`
    (léelo primero);
  - los assets:
    - compañero 1 y 2, cada uno con y sin gorra;
    - fondos Pradera, Espacio, Bosque y el de por defecto;
    - pegatinas «A de avión» y las de 10, 25, 50 y 100 estrellas;
    - trofeo;
    - partículas de Estrellitas y Burbujas;
    - **una boca por cada posición de `content/mouths.ts`** (léelas de allí);
    - iconos de borrar, listo, galería e icono de la app (192 y 512);
  - para cada uno: nombre de fichero de destino, tamaño y el id de `visuals.ts` al que
    sustituye.
- **`Panel.integration.test.tsx`**, con store y vistas reales y el adaptador en memoria:
  - mapa → puerta → crear PIN → cambiar la longitud a 6 → cerrar → empezar la sesión, que
    tiene 6 pasos;
  - exportar y luego importar ese mismo JSON sobre un documento vacío devuelve el progreso;
  - importar `{}` no cambia nada.
- **README:**
  - la línea de estado (hoy dice que falta el PR del Plan 5);
  - la sección «Lo que ya está hecho: Plan 6»;
  - la hoja de ruta con el Plan 7 (D24);
  - D24-D31 en la tabla;
  - «Cómo ejecutarlo»: `pnpm e2e` y cómo probar el SW con `build` + `start`.
- **Poda de trampas y deuda (CLAUDE.md):**
  - el README termina con **≤ 8 trampas y ≤ 10 deudas**;
  - la deuda 10 se cierra (D31);
  - la deuda 1 se reescribe hacia `docs/checklist-ipad.md` del Plan 7;
  - cada entrada se convierte en test, se resuelve o se justifica.
- **Ledger:**
  - estado final;
  - S17-S23 si cambiaron;
  - **la lista de la prueba manual del autor** en dispositivo real, sobre el despliegue de
    Vercel:
    1. PIN: alta, error y olvido;
    2. importar una exportación real de otro dispositivo, y otra rota;
    3. borrar y listo en `trace` (¿sobra el temporizador?);
    4. minúsculas en `trace` con el dedo;
    5. rastro encima de `trace` y de `build`;
    6. instalar en la pantalla de inicio;
    7. sin red;
    8. actualización tras un segundo despliegue;
    9. acento cambiado en vivo.
- **Recordatorio en el README para el Plan 7:** instalar entonces
  `frontend-design@claude-plugins-official`, no antes.

**Casos de test:** Z1-Z3, los tres recorridos de la integración.

- [ ] Prompts; integración Z1-Z3; README, poda y ledger
- [ ] Puertas en verde, más `pnpm build` y `pnpm e2e`
- [ ] Commit: `docs(plan-6): cierre con prompts del arte, README y lista de la prueba manual, para que el Plan 7 empiece con el arte en marcha`

---

## Después del plan

1. Revisión final de la rama con `model: "opus"`, effort `high`.
2. El autor despliega en Vercel (D29) y hace la prueba manual del ledger.
3. PR contra `main`.
