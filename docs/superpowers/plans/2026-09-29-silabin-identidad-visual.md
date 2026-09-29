# Silabín Plan 7: identidad visual y lista de verificación en iPad — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** la versión con cara propia. Incluye:
- el arte que genera el autor sustituye a los marcadores provisionales: compañeros con y sin
  gorra, fondos, pegatinas, trofeo, partículas del rastro, las seis bocas e iconos;
- todo tiene respaldo si una imagen no carga;
- la paleta final, derivada del arte y blindada con tests;
- el cursor de PC por rastro (S20);
- `docs/checklist-ipad.md`, que absorbe la prueba manual del Plan 6 (D35).

**Architecture:**
- **Ficheros:** un script nuevo, `scripts/optimizar-arte.py`, convierte los 27 PNG del autor
  en WebP o PNG, con tamaño y peso por clase de pieza.
- **Interfaz:**
  - `visuals.ts` pasa de emoji a rutas de imagen, con el emoji como respaldo;
  - un componente `ArtImage` pinta cualquier pieza y cae al emoji si no carga;
  - la boca apila sus seis fotogramas y cae al SVG esquemático de D21.
- **Paleta:** sigue en los tokens de `globals.css`, con los invariantes de contraste en un
  test.
- **Sin cambios** en `engine/`, `content/` ni `store/`.

**Tech Stack:** el del Plan 6 (Next.js 16.3.5, React 19.2.8, Tailwind 4, Vitest 5, Biome 2,
`motion`, Serwist y Playwright), sin dependencias npm nuevas. El script es Python 3 con Pillow
(ya instalado, con WebP) y se prueba con `unittest`.

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md`: §2 (principios), §7
(cosméticos y celebraciones), §8 (offline), §9 (experiencia de usuario) y §10 (lista manual en
iPad). Los prompts del arte están en `docs/arte-plan-7-prompts.md`, y los tokens y las reglas
visuales en `docs/diseno-visual.md`.

El ledger es `docs/superpowers/2026-09-29-plan-7-registro.md`. Contiene las decisiones del
autor (D32-D35) y el texto completo de los rulings V1-V16: el porqué y el coste si fueran un
error.

**Modo económico (CLAUDE.md):** el plan fija contratos, casos de test y criterios de
aceptación, no la implementación. El implementador la escribe con TDD. **Ejecución:**
`/model sonnet`. El `/effort` de cada tarea va en su cabecera.

---

## Decisiones

Las del autor (2026-09-29):

| # | Decisión |
|---|---|
| D32 | **El autor genera el arte antes de la integración**, en `C:\Users\Yelisson\Downloads\silabin-arte-plan-7` (`/mnt/c/Users/Yelisson/Downloads/silabin-arte-plan-7`), con los nombres de `docs/arte-plan-7-prompts.md`. Las tareas que no necesitan arte (T1-T3) se ejecutan antes; T4-T6 esperan a que estén **todos** los ficheros |
| D33 | **Compañeros: pollito (`companion:first`) y zorrito (`companion:second`)**, como sugerían los marcadores. Los prompts no cambian |
| D34 | **La paleta final se deriva del arte:** una tarea ajusta los tokens para que casen con los compañeros y los fondos, con una vista previa que el autor aprueba. Un test automático exige el contraste AA |
| D35 | **La prueba manual del Plan 6 no se hizo:** sus 11 puntos y sus dos añadidos entran en `docs/checklist-ipad.md`. Hay una sola pasada en el dispositivo, sobre la versión final desplegada en Vercel por el autor (D29) |

Rulings de planificación (texto completo en el ledger):

- **V1** Las tareas sin arte van primero. Antes de despachar la T4, el coordinador comprueba
  los 27 ficheros ([precondición](#precondición-del-arte-d32)).
- **V2** Un script nuevo, `optimizar-arte.py`, cubre las 27 piezas.
  - `iconos-pwa.py` (la «S» provisional) se borra.
  - `optimizar-ilustraciones.py` no se toca.
- **V3** Formato, tamaño y presupuesto de peso según la clase de pieza, como en la
  [tabla de piezas](#tabla-de-piezas).
- **V4** El script valida todo antes de escribir nada.
  - Recorta al centro a la proporción de destino, y da un aviso si el origen no la tenía.
  - Falla si falta una pieza, si hay un PNG ilegible, si el origen es más pequeño que el
    destino o si una pieza que debe ser transparente no tiene ningún píxel transparente.
- **V5** Del icono de la app solo se genera `app-512.png`; los de 192 y 180 px salen de él.
  - El manifest gana una entrada `purpose: "maskable"`.
- **V6** Las pegatinas de estrellas no llevan número pintado (spec §9). El número va en el
  `aria-label`.
- **V7** Todo el arte tiene respaldo, y una vista nunca se queda vacía.
  - `ArtImage` cae al emoji.
  - El fondo cae a su degradado.
  - La boca cae al SVG esquemático.
- **V8** Cada logro pinta en el álbum y en el fin de sesión la pieza que desbloquea
  (`rewardArt`). Ningún emoji de respaldo es una letra ni una cifra.
- **V9** Un cosmético bloqueado se ve como silueta gris de su propia imagen, no con 🔒.
- **V10** Iconos nuevos: `erase`, `done`, `gallery` y `lock`.
  - «Volver al mapa» usa `next` en espejo.
  - Se quedan como están, en `minor (deferred)`: 🔁, ✓, ✕ y ★/☆.
- **V11** Cursor de PC por rastro, solo con `(pointer: fine)`. Se aplica con un atributo y una
  propiedad CSS en `<html>`.
- **V12** La boca apila sus seis fotogramas desde el montaje y solo cambia la opacidad.
- **V13** Todo texto que se pinta sobre el fondo cosmético va sobre una superficie opaca de
  token, y un test lo comprueba.
- **V14** La paleta se propone con colores medidos en el arte y la aprueba el autor antes de la
  revisión.
  - Los tests CO fijan tres invariantes: la tabla AA, «sin rojo ni verde intensos» y que el
    manifest y el `viewport` usen los mismos colores que los tokens.
- **V15** `/dev/arte` (solo en `pnpm dev`) muestra una hoja con todo el arte, los fondos con
  piezas del mapa encima y la paleta con sus ratios.
- **V16** Tamaños:
  - compañero: 112 px en el mapa y 160 px en el fin de sesión;
  - logros del fin de sesión: 96 px;
  - partícula: 28 px;
  - boca: 128 px.

## Precondición del arte (D32)

Antes de despachar la T4, el coordinador ejecuta esto. Si lista algo, **para** y le dice al
autor qué falta:

```bash
d="/mnt/c/Users/Yelisson/Downloads/silabin-arte-plan-7"
for f in companion-1 companion-1-gorra companion-2 companion-2-gorra \
  bg-default bg-pradera bg-espacio bg-bosque \
  sticker-avion sticker-10 sticker-25 sticker-50 sticker-100 trophy \
  particle-estrellita particle-burbuja \
  mouth-open mouth-spread mouth-round mouth-closed mouth-teeth mouth-tongue \
  ui-erase ui-done ui-gallery ui-lock app-512; do
  [ -f "$d/$f.png" ] || echo "falta $f.png"
done
```

## Tabla de piezas

Es el contrato de nombres que comparten T1 (el script escribe estas salidas), T2-T3 (las vistas
apuntan a ellas) y T4 (un test comprueba que existen y que pesan menos que el presupuesto). Las
rutas son relativas a `public/`.

| Clase | Origen (`<nombre>.png`) | Salida | Tamaño | Formato | Presupuesto |
|---|---|---|---|---|---|
| compañero | `companion-1`, `companion-1-gorra`, `companion-2`, `companion-2-gorra` | `images/arte/<nombre>.webp` | 512 × 512 | WebP q80, alfa | < 80 KB |
| fondo | `bg-default`, `bg-pradera`, `bg-espacio`, `bg-bosque` | `images/arte/<nombre>.webp` | 960 × 1280 (3:4, recorte central) | WebP q75, **opaco** | < 200 KB |
| pegatina | `sticker-avion`, `sticker-10`, `sticker-25`, `sticker-50`, `sticker-100`, `trophy` | `images/arte/<nombre>.webp` | 384 × 384 | WebP q80, alfa | < 60 KB |
| partícula | `particle-estrellita`, `particle-burbuja` | `images/arte/<nombre>.webp` **y** `icons/cursor-<estrellita\|burbuja>.png` | 64 × 64 y 32 × 32 | WebP q80, alfa; PNG RGBA | < 10 KB cada uno |
| boca | `mouth-open`, `mouth-spread`, `mouth-round`, `mouth-closed`, `mouth-teeth`, `mouth-tongue` | `images/arte/<nombre>.webp` | 256 × 256 | WebP q80, alfa | < 30 KB |
| icono | `ui-erase`, `ui-done`, `ui-gallery`, `ui-lock` | `icons/<nombre>.png` | 256 × 256 | PNG RGBA (`optimize=True`) | < 40 KB |
| app | `app-512` | `icons/app-512.png`, `icons/app-192.png`, `icons/apple-touch-icon.png` | 512, 192, 180 | PNG **RGB** (aplanado sobre `#fff8ec` si trae alfa) | < 300 KB, < 60 KB, < 60 KB |

Salen 27 orígenes y 31 salidas: 22 WebP y 9 PNG. Son transparentes todas las clases menos «fondo» y «app».

---

## Global Constraints

- **Principios del spec §2, sin excepción:**
  - sonido y no nombre;
  - sin castigos ni mensajes negativos;
  - las recompensas nunca bloquean ni saltan contenido.
- **Texto y color:**
  - El niño no ve texto: las pegatinas no llevan números (V6) y el nombre de un logro solo va
    en `aria-label`.
  - Sin rojo ni verde de «bien o mal».
  - Los estados no dependen solo del color: el equipado lleva borde grueso y ✓, y lo bloqueado
    se ve en gris y con menos opacidad.
- **Tacto:** objetivos táctiles del niño ≥ 72 px, separados ≥ 16 px.
- **Tokens:** colores y fuentes solo con los tokens de `src/app/globals.css`. Un token nuevo o
  cambiado va también en `docs/diseno-visual.md`, y a partir de la T5 debe pasar los tests CO.
- **Respaldo:** todo el arte tiene respaldo (V7). Una vista nunca pinta una caja vacía ni el
  icono de imagen rota.
- **Imágenes:**
  - Se pintan con `<img>`, no con `next/image` (R23 del Plan 3), con el `biome-ignore` y su
    motivo, como en `Picture.tsx`.
  - Los ficheros ya vienen a su tamaño.
  - Llevan `alt=""` y `aria-hidden`: el nombre accesible va en el contenedor.
- **PWA:** no se toca `additionalPrecacheEntries`. Serwist ya precachea `public/` entero, y
  volver a listar ficheros rompió el service worker (J4 del Plan 6).
- **Fondo cosmético:** nunca envuelve la sesión (S19). El test de `App` que lo comprueba sigue
  en verde.
- **Movimiento:**
  - Las animaciones respetan `prefers-reduced-motion`: `motion-safe:` en CSS y
    `MotionConfig reducedMotion="user"`.
  - Las celebraciones respetan además `reducedCelebrations` (S4).
- **Importaciones:**
  - `features/` y `components/` importan solo los barriles (`features/boundaries.test.ts`).
  - `components/` no importa nada de `features/`.
- **Puertas y commits:**
  - TDD.
  - `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit, con la salida
    recortada (`pnpm test 2>&1 | tail -15`).
  - En la T1, además, `python3 -m unittest discover -s scripts -p "test_*.py"`.
  - Desde la T4, además, `pnpm build` y `pnpm e2e`.
  - Conventional Commits en español, con el porqué.
- **Next 16:** antes de tocar `manifest.ts`, `layout.tsx` o una ruta, lee la guía en
  `node_modules/next/dist/docs/`.
- **Despliegue:** ningún agente despliega (D29).
- **Originales:** los PNG del autor **no** se versionan; solo las salidas del script.

## Review Focus

1. **Arte que no carga** (404, fichero sin precachear o corrupto). Se espera el respaldo de
   cada vista: emoji, degradado o SVG de la boca, nunca una caja vacía. → T2, AR5, AR7 y AR9;
   T3, BO4.
2. **Fondo oscuro o recargado detrás del mapa, la galería y el fin de sesión**
   (`bg:espacio`). Todo texto e indicador se sigue leyendo. → T5, LE1-LE3.
3. **Primera vez que suena la boca en el iPad**, con los fotogramas aún sin decodificar. No
   debe haber un hueco en blanco entre formas: los seis están montados desde el principio.
   → T3, BO1-BO2.
4. **Dispositivos híbridos** (iPad con ratón o trackpad, PC táctil).
   - El cursor solo cambia con `pointer: fine`, y se actualiza si eso cambia.
   - Se restaura al quitar el rastro o al desmontar.
   - Nunca cambia en táctil.
   → T3, RA2-RA5.
5. **Unos 1,5 MB de arte nuevos en la precaché.** El service worker sigue registrándose (sin
   entradas en conflicto), y la app arranca sin red. → T4, `pnpm build` y `pnpm e2e` (J4), y
   FI1-FI2 con los presupuestos.

---

## Estructura de archivos

```
scripts/optimizar-arte.py                 crear: las 27 piezas → 31 salidas (T1)
scripts/test_optimizar_arte.py            crear: unittest con PNG sintéticos (T1)
scripts/iconos-pwa.py                     borrar (T1, V2)
src/components/ArtImage.tsx               crear: pieza de arte con respaldo de emoji (T2)
src/features/rewards/visuals.ts           modificar: rutas de imagen, rewardArt (T2)
src/features/rewards/{Companion,CosmeticBackground,RewardsScreen,TrailLayer}.tsx   modificar (T2)
src/features/session/EndScreen.tsx        modificar: rewardArt, compañero a 160 px (T2)
src/features/rewards/TrailLayer.tsx       modificar: cursor de PC (T3)
src/app/globals.css                       modificar: regla del cursor (T3), tokens (T5)
src/components/Mouth.tsx                  modificar: fotogramas apilados, respaldo SVG (T3)
public/images/arte/*.webp, public/icons/{ui-*,cursor-*,app-*,apple-touch-icon}.png   crear (T4)
src/components/Icon.tsx                   modificar: erase, done, gallery, lock (T4)
src/features/session/trace/Evaluation.tsx modificar: iconos de borrar y listo (T4)
src/features/map/MapScreen.tsx            modificar: galería y candado (T4), superficies (T5)
src/features/art-files.test.ts            crear: existencia y peso del arte (T4)
src/app/manifest.ts                       modificar: entrada maskable (T4)
src/app/theme-colors.ts, src/app/tokens.test.ts   crear: colores del manifest e invariantes de la paleta (T5)
src/features/legibility.test.tsx          crear: texto sobre superficie (T5)
src/app/dev/arte/page.tsx, src/features/dev/ArteDev.tsx   crear: hoja de arte y paleta (T5)
docs/checklist-ipad.md                    crear (T6)
docs/diseno-visual.md, README.md, docs/archivo-trampas-y-deuda.md, ledger   modificar (T5, T6)
```

## Reparto

| # | Tarea | Riesgo · Effort | ¿Arte? | Sesión |
|---|---|---|---|---|
| 1 | Tubería del arte: `optimizar-arte.py` y sus tests | script · medium | no | 1 |
| 2 | El arte en la interfaz: `ArtImage`, `visuals.ts` y sus cinco llamadores | contrato de UI · **high** | no | 1 |
| 3 | Cursor de PC por rastro (S20) y boca con fotogramas | UI · medium | no | 2 |
| 4 | Integración del arte: ficheros, iconos nuevos e invariantes de disco | assets · medium | **sí** | 2 |
| 5 | Paleta final, legibilidad sobre el fondo y `/dev/arte` | estilos + tests · medium | **sí** | 3 |
| 6 | Cierre: `docs/checklist-ipad.md`, README, poda y ledger | docs · medium | **sí** | 3 |

La T2 depende de la T1 solo por los nombres de la tabla de piezas. La T3 depende de la T2
(`cursor` en `CosmeticVisual`). En la sesión 1 hay que cambiar el effort a mitad de sesión:
`/effort medium` para la T1 y `/effort high` antes de despachar la T2. La sesión 2 vuelve a
`medium`. La revisión final de la rama va en una sesión 4.

---

## Tarea 1: Tubería del arte

**Riesgo:** script con lógica de validación. **Effort:** `medium`. Revisión de cumplimiento,
más **2 mutaciones**. **No necesita el arte:** se prueba con PNG sintéticos.

**Files:**
- crear `scripts/optimizar-arte.py` y `scripts/test_optimizar_arte.py`;
- borrar `scripts/iconos-pwa.py`, y quitar sus menciones en `src/app/manifest.ts`
  (comentario) y en `README.md` (sección «La PWA»).

**Contrato:**
- **Uso:** `python3 scripts/optimizar-arte.py <carpeta-origen> [--destino <raíz>]`.
  - `--destino` es por defecto la raíz del repo; las salidas van a `<raíz>/public/...`.
  - Los tests pasan una carpeta temporal.
- **Una tabla `PIEZAS` en el script**, copiada de la [tabla de piezas](#tabla-de-piezas):
  origen, clase, y por cada salida su ruta, tamaño, formato y si lleva alfa. Es la única
  fuente de nombres del script.
- **Validación completa antes de escribir** (V4). Si algo falla: sale con 1, escribe cada
  problema en `stderr` (**todos**, no solo el primero) y no escribe ni un fichero. Falla si:
  - falta un origen: se listan todos los que faltan;
  - un PNG es ilegible o está truncado (`Image.open` + `load()`);
  - una pieza de clase transparente no tiene ningún píxel con alfa < 255, lo que se ve como
    una caja cuadrada en la interfaz;
  - tras el recorte, el origen es más pequeño que el destino en algún lado (no se amplía).
- **Recorte (V4):**
  - «fondo» se recorta al centro a 3:4. El chat de imágenes suele dar 1024 × 1536, no
    1536 × 2048.
  - Las clases cuadradas se recortan al centro a 1:1, con una línea `aviso:` en `stdout` si el
    origen no era cuadrado.
  - Luego se redimensiona con `LANCZOS`.
- **Formatos:**
  - WebP con `method=6`, calidad según la tabla.
  - «fondo» se convierte a `RGB` antes de guardar: es opaco.
  - PNG con `optimize=True`.
  - «app» se aplana sobre `#fff8ec` y se guarda en `RGB`: iOS pinta de negro la
    transparencia del `apple-touch-icon`.
- **Al terminar** imprime: el número de salidas, el peso total y la salida más pesada de cada
  clase. `method=6` sobre `/mnt/c` es lento: la T4 lo lanza en segundo plano.

**Casos de test** (`unittest`, PNG sintéticos de colores lisos generados con Pillow en un
`TemporaryDirectory`; las piezas transparentes llevan al menos un píxel con alfa 0):

| Id | Entrada | Esperado |
|---|---|---|
| OP1 | juego completo de 27 orígenes al tamaño del prompt (1024², fondos 1024 × 1536) | sale con 0; existen las 31 salidas, cada una con el tamaño exacto de la tabla; las transparentes en `RGBA`, y «fondo» y «app» sin alfa (`mode == "RGB"`) |
| OP2 | falta `mouth-teeth.png` y `bg-bosque.png` | sale con 1; `stderr` nombra **los dos**; el destino no tiene ningún fichero |
| OP3 | `trophy.png` truncado (la mitad de sus bytes) | sale con 1 y nombra `trophy.png`; no se escribe nada |
| OP4 | `companion-1.png` opaco (`RGB`, sin alfa) | sale con 1; el mensaje nombra el fichero y dice que necesita transparencia |
| OP5 | `bg-pradera.png` de 1024 × 1536 con una franja de 60 px arriba de otro color | la salida mide 960 × 1280 y su píxel (0, 0) es del color del centro: la franja se ha recortado |
| OP6 | `sticker-10.png` de 200 × 200 | sale con 1 y nombra el fichero: es más pequeño que 384 |
| OP7 | `app-512.png` con las esquinas transparentes | `apple-touch-icon.png` en `RGB`, y su píxel (0, 0) es `#fff8ec` |
| OP8 | `companion-2.png` de 1024 × 1100 | sale con 0, imprime `aviso:` con el nombre y la salida mide 512 × 512 |

**Mutaciones:**
1. Escribir cada salida al validarla, en vez de validar todo primero: OP2 y OP3 deben fallar.
2. Quitar la comprobación de transparencia: OP4 debe fallar.

- [ ] Tests OP1-OP8; verlos fallar (`python3 -m unittest discover -s scripts -p "test_*.py"`)
- [ ] Implementar el script; tests en verde
- [ ] Borrar `iconos-pwa.py` y sus menciones; puertas (`test`, `typecheck` y `lint`) en verde
- [ ] Commit: `feat(assets): un script para las 27 piezas del arte que valida todo antes de escribir, para que un lote incompleto no deje la app a medias`

---

## Tarea 2: El arte en la interfaz

**Riesgo:** contrato entre `visuals.ts` y cinco vistas, más el respaldo. **Effort:** `high`.
Revisión completa con **4 mutaciones**. **No necesita el arte:** sin ficheros, cada vista cae
a su respaldo (V7). La existencia de los ficheros la comprueba la T4.

**Files:**
- crear `src/components/ArtImage.tsx` (+ test);
- modificar `src/features/rewards/{visuals.ts,Companion.tsx,CosmeticBackground.tsx,RewardsScreen.tsx,TrailLayer.tsx}`
  y `src/features/session/EndScreen.tsx`, con sus tests.

**Interfaces:**
- Consume: `resolveEquipped`, `wearsCap`, `COSMETICS`, `REWARDS` y `STAR_MILESTONES` de
  `@/engine`, sin cambios.
- Produce, y lo usan la T3, la T4 y la T5:

```ts
// src/components/ArtImage.tsx
/** Una pieza de arte: la imagen y el emoji de respaldo si no carga (como `Picture`, D1). */
export type Art = { src: string; emoji: string };
export function ArtImage(props: {
  art: Art;
  size: number;        // px, ancho y alto del <img>
  cover?: boolean;     // object-cover (miniaturas de fondo)
  className?: string;
}): JSX.Element;
// <img src alt="" aria-hidden width height draggable={false}>. Tras `error`, o si `src === ""`:
// <span aria-hidden="true" data-art-fallback> con el emoji (tamaño ≈ 0,75 × size).

// src/features/rewards/visuals.ts
export type CosmeticVisual =
  | { slot: "background"; src: string; gradient: string }   // gradient: respaldo (V7)
  | { slot: "companion"; art: Art; withCap: Art }
  | { slot: "trail"; particle: Art | null; cursor: string | null }; // null ⇔ trail:none
export function hasVisual(id: string): boolean;                     // sin cambios
export function cosmeticVisual(cosmeticId: string): CosmeticVisual; // respaldo: bg:default
export function rewardArt(rewardId: string): Art;                   // sustituye a rewardIcon
export function cosmeticLabel(cosmeticId: string, rewardId: string | null): string; // sin cambios
```

**Contrato:**
- **Rutas:** `"/images/arte/<nombre>.webp"` y `"/icons/cursor-<nombre>.png"`, exactamente como
  en la [tabla de piezas](#tabla-de-piezas).
- **`cosmeticVisual`:**

| id | Lo que devuelve |
|---|---|
| `bg:default` | `bg-default.webp`, con el degradado de respaldo de hoy |
| `bg:pradera` | `bg-pradera.webp`, con el degradado de respaldo de hoy |
| `bg:espacio` | `bg-espacio.webp`, con el degradado de respaldo de hoy |
| `bg:bosque` | `bg-bosque.webp`, con el degradado de respaldo de hoy |
| `companion:first` | `companion-1` y `companion-1-gorra`, respaldo 🐣 |
| `companion:second` | `companion-2` y `companion-2-gorra`, respaldo 🦊 |
| `trail:none` | `particle: null`, `cursor: null` |
| `trail:estrellitas` | `particle-estrellita.webp` ✨ y `cursor-estrellita.png` |
| `trail:burbujas` | `particle-burbuja.webp` 🫧 y `cursor-burbuja.png` |

- **`rewardArt` (V8): cada logro pinta la pieza que desbloquea.**
  - Tabla:
    - `first-session` → `bg-pradera` 🌄;
    - `vowel-a` → `sticker-avion` ✈️ (**no** 🅰️: el respaldo no puede ser una letra);
    - `five-vowels` → `companion-2` 🦊;
    - `first-syllable-voice` → `particle-estrellita` ✨;
    - `steady-hand` → `bg-espacio` 🌌;
    - `ten-sessions` → `companion-1-gorra` 🧢;
    - `word-reader` → `particle-burbuja` 🫧;
    - `phase2-done` → `trophy` 🏆;
    - `stars:<n>` → `sticker-<n>` 🌟.
  - Un id desconocido devuelve `{ src: "", emoji: "🏅" }`.
- **`Companion`:**
  - pinta `ArtImage` de `withCap` si `wearsCap`, y si no de `art`;
  - desaparece el 🧢 superpuesto;
  - conserva `role="img"`, `aria-label="Tu compañero"`, `data-companion` y `data-wears-cap`;
  - gana `size?: number`, que por defecto es 112 (V16);
  - `EndScreen` le pasa 160.
- **`CosmeticBackground`:**
  - el contenedor conserva `data-cosmetic-background` y la clase del degradado (respaldo), y
    gana `relative isolate`;
  - dentro va un `<img alt="" aria-hidden>` con
    `pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover`;
  - tras `error`, el `<img>` se quita y queda el degradado.
- **`RewardsScreen`:**
  - álbum: `ArtImage` de `rewardArt` a 64 px dentro de la caja de 72;
  - lo no ganado: la misma imagen con `opacity-40 grayscale`, como hoy;
  - cosméticos:
    - fondo: miniatura `cover` de 72 px;
    - compañero: `art` a 64 px;
    - rastro: `particle` a 40 px;
    - `trail:none`: un anillo vacío (`rounded-full border-4 border-dashed border-calm-border`,
      sin texto).
  - Los cosméticos bloqueados se ven como silueta gris de su imagen, sin 🔒, y siguen sin ser
    botones (V9).
  - La ✓ del equipado y el botón de volver no cambian en esta tarea.
- **`TrailLayer`:**
  - `enabled` pasa a depender de `particle !== null`;
  - cada partícula pinta `ArtImage` de 28 px en vez del emoji;
  - no cambian el tope de 24, los 600 ms, `{capture: true, passive: true}` ni
    `pointer-events-none`.
- **`EndScreen`:** cada logro nuevo pinta `ArtImage` de `rewardArt` a 96 px dentro del mismo
  `span`/`motion.span`, que conserva `role="img"`, `data-reward` y `aria-label`. Los ★ no
  cambian (el e2e los busca).

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| AR1 | (F1, se conserva) | `hasVisual` es cierto para todo `COSMETICS[].id` y todo `REWARDS[].id` |
| AR2 | `cosmeticVisual` de `companion:second`, `bg:espacio`, `trail:burbujas` y `trail:none` | las rutas de la tabla; `trail:none` → `particle` y `cursor` a `null` |
| AR3 | `rewardArt` de `vowel-a`, `stars:25`, `ten-sessions`, `five-vowels` y `"inventado"` | `sticker-avion.webp`, `sticker-25.webp`, `companion-1-gorra.webp`, `companion-2.webp`, `{ src: "", emoji: "🏅" }` |
| AR4 | todo `REWARDS[].id` | el emoji de respaldo no contiene `\p{L}` ni `\p{N}`, ni cae en U+1F170–U+1F189 (letras en caja, como 🅰️) |
| AR5 | `<ArtImage art={{src: "/x.webp", emoji: "🐣"}} size={64} />`; luego `fireEvent.error` | primero un `img` con `alt=""`, `aria-hidden`, 64 × 64 y `draggable="false"`; tras el error no hay `img` y hay `[data-art-fallback]` con 🐣; con `src: ""`, directamente el respaldo |
| AR6 | `Companion` por defecto | `role="img"` «Tu compañero», con un `img` que acaba en `/companion-1.webp`, 112 px y `data-wears-cap="false"` |
| AR7 | `companion:second` equipado, con `five-vowels` y `ten-sessions` ganados | `img` que acaba en `/companion-2-gorra.webp`, `data-wears-cap="true"`, y ningún 🧢 en el DOM |
| AR8 | `companion:second` equipado **sin** `five-vowels` (documento importado) | `companion-1.webp`: manda `resolveEquipped` |
| AR9 | `bg:pradera` equipado; luego `fireEvent.error` en su `img` | un `img` que acaba en `/bg-pradera.webp` y el contenedor con su degradado; tras el error no hay `img`, y siguen el degradado y `data-cosmetic-background` |
| AR10 | galería con `vowel-a` ganado y `stars:10` no ganado | `[data-reward="vowel-a"]` con `sticker-avion.webp`; `[data-reward="stars:10"]` con `data-earned="false"`, gris y con `sticker-10.webp`; ningún nodo de texto visible del álbum contiene una cifra |
| AR11 | galería sin `steady-hand` | `[data-cosmetic="bg:espacio"]` no es un botón, lleva su miniatura en gris y no contiene 🔒 |
| AR12 | `EndScreen` con `newRewardIds: ["first-session", "stars:10"]`, con y sin `reducedCelebrations` | dos `[data-reward]` con `bg-pradera.webp` y `sticker-10.webp` a 96 px, con sus `aria-label`; con `reducedCelebrations`, ni clases ni props de animación (lo de hoy) |
| AR13 | `trail:estrellitas` equipado y un `pointerdown` | la partícula es un `img` que acaba en `/particle-estrellita.webp` (28 px), sin ✨ en el texto; los tests F6/F7 y los del tope siguen en verde |

Los tests que hoy comprueban un emoji (`visuals.test.ts`, `Companion.test.tsx`,
`RewardsScreen.test.tsx`, `TrailLayer*.test.tsx` y `EndScreen`) pasan a comprobar `src`,
`data-*` y `aria-label`. **No se borra ningún caso:** se reescribe su aserción.

**Mutaciones:**
1. `ArtImage` sin el respaldo de `onError`: AR5 debe fallar.
2. `Companion` que ignora `wearsCap`: AR7 debe fallar.
3. `CosmeticBackground` que quita el degradado al fallar el `img`: AR9 debe fallar.
4. `rewardArt("ten-sessions")` → `companion-1.webp`: AR3 debe fallar.

- [ ] Tests AR1-AR13 y los reescritos; verlos fallar; implementar
- [ ] Puertas en verde (sin `pnpm build`: los ficheros llegan en la T4)
- [ ] Commit: `feat(rewards): el arte sustituye a los marcadores, con el emoji o el degradado de respaldo para que ninguna vista se quede vacía si una imagen no carga`

---

## Tarea 3: Cursor de PC por rastro (S20) y boca con fotogramas

**Riesgo:** interfaz, con temporizadores y efectos sobre `<html>`. **Effort:** `medium`.
Revisión completa con **4 mutaciones**. **No necesita el arte.**

**Files:**
- modificar `src/features/rewards/TrailLayer.tsx` (+ test), `src/app/globals.css` y
  `src/components/Mouth.tsx` (+ test).

**Interfaces:**
- Consume: `cosmeticVisual(...).cursor` (T2) y `MouthShape` de `@/engine`.
- Produce:

```ts
// src/components/Mouth.tsx
// `as const satisfies`, no `: readonly MouthShape[]`: con la anotación, `(typeof MOUTH_SHAPES)[number]`
// sería `MouthShape` entero y la comprobación de cobertura de abajo pasaría en vacío.
export const MOUTH_SHAPES = ["open", "spread", "round", "closed", "teeth", "tongue"] as const satisfies readonly MouthShape[];
export function mouthFrameSrc(shape: MouthShape): string; // "/images/arte/mouth-<shape>.webp"
export const MOUTH_STEP_MS = 450;                          // sin cambios
export function Mouth(props: { shapes: readonly MouthShape[]; playing: boolean; onDone?(): void }): JSX.Element;
```

**Contrato del cursor (V11):**
- Un hook dentro de `TrailLayer`, **antes** del `return` temprano (el cursor es estático y no
  depende del movimiento reducido ni de `reducedCelebrations`):
  - con `cursor !== null` y `matchMedia("(pointer: fine)").matches`, pone en `<html>`
    `data-trail-cursor="<id del rastro>"` y la propiedad
    `--trail-cursor: url("<cursor>") 16 16`;
  - si no, o al desmontar, o al cambiar de rastro, quita las dos cosas;
  - escucha el `change` del `matchMedia` (con `useSyncExternalStore`, como
    `useMovimientoReducido` en `Mouth.tsx`).
- En `globals.css`: `html[data-trail-cursor] { cursor: var(--trail-cursor), auto; }`.
  - Los elementos con cursor propio (enlaces, campos de texto) lo conservan.
- Detalle delicado: se usan un atributo y una propiedad CSS, y no `style.cursor`, porque jsdom
  puede descartar un `cursor` con `url()` y el test pasaría en falso.

**Contrato de la boca (V12):**
- Un contenedor `relative size-32` con `aria-hidden` y `data-shape=<forma actual>`.
- Dentro, **los seis** `img` de `MOUTH_SHAPES` desde el montaje, apilados:
  - con `absolute inset-0`, `alt=""`, `data-frame=<forma>` y `draggable={false}`;
  - solo el de la forma actual lleva `opacity-100`, y el resto `opacity-0`;
  - transición `motion-safe:transition-opacity motion-safe:duration-150`.
  - Así la primera vez no hay un hueco en blanco y la boca «se mueve» en vez de «saltar».
- Si **cualquier** fotograma dispara `error`, se pinta el SVG esquemático de hoy, extraído a
  `MouthSchematic`, con su `data-shape`, y se mantienen el paso y los tiempos.
- No cambian `MOUTH_STEP_MS`, el recorrido de formas, el movimiento reducido (la última forma,
  quieta) ni el momento de `onDone`.
- `MOUTH_SHAPES` cubre todo `MouthShape`, y lo comprueba el tipo: una línea como
  `const _cubre: Exclude<MouthShape, (typeof MOUTH_SHAPES)[number]> extends never ? true : never = true;`
  deja de compilar si se añade una forma a `MouthShape` y no a la lista.

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| RA1 | `trail:estrellitas` con `(pointer: fine)` simulado | `<html>` con `data-trail-cursor="trail:estrellitas"` y `--trail-cursor` = `url("/icons/cursor-estrellita.png") 16 16` |
| RA2 | lo mismo con `(pointer: coarse)` | `<html>` sin `data-trail-cursor` y sin `--trail-cursor` |
| RA3 | `trail:estrellitas` → equipar `trail:none`; y, aparte, desmontar `TrailLayer` | en los dos casos `<html>` queda sin atributo ni propiedad |
| RA4 | `(pointer: fine)` y `prefers-reduced-motion` (o `reducedCelebrations`) | cursor puesto (RA1) y ninguna partícula tras un `pointerdown` |
| RA5 | `(pointer: coarse)` → evento `change` a `fine` | el cursor aparece sin volver a montar |
| BO1 | `<Mouth shapes={["open","closed"]} playing />` | seis `img[data-frame]` desde el primer pintado, con `src` `/images/arte/mouth-<forma>.webp` |
| BO2 | lo mismo, con temporizadores falsos | al empezar, `data-shape="open"` y solo el `img` de `open` con `opacity-100`; tras `MOUTH_STEP_MS`, `closed`; `onDone` a los `2 × MOUTH_STEP_MS` |
| BO3 | movimiento reducido | la última forma, quieta; `onDone` al mismo tiempo total (test de hoy, adaptado) |
| BO4 | `fireEvent.error` en un fotograma | un `svg[data-shape]` en lugar de los `img`; el recorrido y `onDone` siguen igual |
| BO5 | `MOUTH_SHAPES` | 6 valores sin repetir; `mouthFrameSrc("round")` = `/images/arte/mouth-round.webp` |

Los tests de hoy de `Mouth.test.tsx` y de `say-it`, que usan la boca, siguen en verde: se
reescribe la aserción, no se borra el caso.

**Mutaciones:**
1. Pintar solo el fotograma actual: BO1 debe fallar.
2. Aplicar el cursor sin mirar `pointer: fine`: RA2 debe fallar.
3. Quitar la limpieza al desmontar: RA3 debe fallar.
4. Quitar el respaldo SVG: BO4 debe fallar.

- [ ] Tests RA1-RA5 y BO1-BO5; verlos fallar; implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(ui): cursor de PC por rastro y boca con fotogramas apilados, para que en el iPad no parpadee la primera vez que suena`

---

## Tarea 4: Integración del arte

**Precondición:** la [lista de D32](#precondición-del-arte-d32) no imprime nada. Si imprime
algo, no se despacha.

**Riesgo:** assets y un contrato de nombres. **Effort:** `medium`. Revisión de cumplimiento,
más **2 mutaciones** y una **hoja de contacto** del arte.

**Files:**
- crear `public/images/arte/*.webp` (22) y `public/icons/{ui-erase,ui-done,ui-gallery,ui-lock,cursor-estrellita,cursor-burbuja}.png`;
- sustituir `public/icons/{app-192,app-512,apple-touch-icon}.png`;
- crear `src/features/art-files.test.ts`;
- modificar:
  - `src/components/Icon.tsx` (+ test);
  - `src/features/session/trace/Evaluation.tsx` (+ test);
  - `src/features/map/MapScreen.tsx` (+ test);
  - `src/features/rewards/RewardsScreen.tsx` (+ test);
  - `src/app/manifest.ts`.

**Contrato:**
- **Ejecutar** `python3 scripts/optimizar-arte.py /mnt/c/Users/Yelisson/Downloads/silabin-arte-plan-7`
  en segundo plano (tarda minutos). Si falla, se reporta su `stderr` **sin tocar** los
  originales: los rehace el autor.
- **`Icon`:** `ICON_NAMES` gana `erase`, `done`, `gallery` y `lock`, con la convención de hoy
  (`/icons/ui-<nombre>.png`).
- **Sustituciones:**
  - En `trace/Evaluation.tsx`, `BotonAccion` recibe `icon: IconName` en vez de `emoji`
    (🧽 → `erase`, 👍 → `done`).
  - En `MapScreen`: 🎁 → `Icon gallery`, y 🔒 de las unidades bloqueadas → `Icon lock`, de
    32 px y `aria-hidden`.
  - En `RewardsScreen`: ↩️ → `Icon next` en espejo (`-scale-x-100`).
  - Todo `aria-label` sigue igual.
- **`manifest.ts`:**
  - se conservan las dos entradas de hoy;
  - se añade `{ src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }`
    (V5: el personaje ocupa el 70 % central);
  - se actualiza el comentario, que ya no habla de la «S».

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| FI1 | toda ruta de `cosmeticVisual` (`src`, `art`, `withCap`, `particle` y `cursor`) para todo `COSMETICS[].id`, y de `rewardArt` para todo `REWARDS[].id` | existe `public/<ruta>` (`node:fs`) y pesa menos que el presupuesto del prefijo de su nombre: `companion-` 80 KB, `bg-` 200 KB, `sticker-` y `trophy` 60 KB, `particle-` y `cursor-` 10 KB; un prefijo sin presupuesto hace fallar el test |
| FI2 | todo `MOUTH_SHAPES` | existe `public/images/arte/mouth-<forma>.webp`, < 30 KB |
| FI3 | `app-512.png`, `app-192.png` y `apple-touch-icon.png` | existen, con el tamaño de la tabla, y el byte 25 de la cabecera PNG (tipo de color del IHDR) es 2 (RGB), no 6 (RGBA) |
| FI4 | `manifest()` | una entrada `purpose: "maskable"` para `app-512.png` |
| FI5 | `trace` con los botones visibles | «Borrar» contiene `img[src="/icons/ui-erase.png"]` y «Listo» `ui-done.png`; ni 🧽 ni 👍 en el DOM |
| FI6 | mapa con una unidad bloqueada | «Mis premios» contiene `ui-gallery.png` y la unidad bloqueada `ui-lock.png`; ni 🎁 ni 🔒 |
| FI7 | galería | «Volver al mapa» contiene `ui-next.png` con `-scale-x-100`; sin ↩️ |

El I10 de hoy (todo `IconName` existe en disco) cubre los cuatro iconos nuevos sin cambios.

**Hoja de contacto (la hace el revisor):** monta las 22 WebP y los PNG de iconos con Pillow en
`.superpowers/sdd/plan-7/hoja-arte.png` y la mira. Comprueba que:
- no hay texto, letras ni números: tampoco en las pegatinas;
- lo transparente no trae una caja de fondo;
- cada compañero es idéntico con y sin gorra;
- las cuatro estrellas crecen de 10 a 100;
- las seis bocas se distinguen a 128 px (la prueba con niños es del autor, en la checklist).

**Mutaciones:**
1. Renombrar en `visuals.ts` una ruta a un fichero que no existe: FI1 debe fallar.
2. Guardar `apple-touch-icon.png` en `RGBA`: FI3 debe fallar.

- [ ] Ejecutar el script; commit de las salidas:
  `chore(assets): el arte del Plan 7 en WebP y PNG a su tamaño, porque los originales pesan decenas de MB`
- [ ] Tests FI1-FI7; verlos fallar donde aplique; iconos, sustituciones y manifest
- [ ] Puertas en verde, más `pnpm build` y `pnpm e2e` (J4 arranca sin red con el arte en la precaché)
- [ ] Commit: `feat(ui): iconos de borrar, listo, galería y candado con el arte final, para que ningún emoji de marcador quede en lo que toca el niño`

---

## Tarea 5: Paleta final, legibilidad sobre el fondo y `/dev/arte`

**Riesgo:** estilos, con invariantes nuevos y un criterio de diseño. **Effort:** `medium`.
Revisión completa con **4 mutaciones**. **Necesita el arte** (T4) y la **aprobación del autor**
antes de la revisión (D34).

**Skills del implementador:** `frontend-design` (plugin `frontend-design@claude-plugins-official`,
si el autor lo instaló) para la propuesta de paleta, y `frontend-a11y` para la legibilidad.

**Files:**
- crear:
  - `src/app/theme-colors.ts` y `src/app/tokens.test.ts`;
  - `src/features/legibility.test.tsx`;
  - `src/app/dev/arte/page.tsx`, con la misma guarda que `src/app/dev/plantillas/page.tsx`
    (`notFound()` en producción);
  - `src/features/dev/ArteDev.tsx`.
- modificar:
  - `src/app/globals.css`;
  - `src/app/manifest.ts` y `src/app/layout.tsx` (solo los colores);
  - `MapScreen.tsx`, `RewardsScreen.tsx` y `EndScreen.tsx` (las superficies);
  - `docs/diseno-visual.md`.

**Contrato:**
- **`theme-colors.ts`:** `export const THEME_COLORS = { surface: "#…", action: "#…" } as const;`
  - Lo importan `manifest.ts` (`background_color`, `theme_color`) y `layout.tsx`
    (`viewport.themeColor`), que dejan de llevar el color escrito.
  - El test no importa `layout.tsx`: arrastraría `next/font/google`, que no carga en el
    entorno `node` de Vitest.
- **`tokens.test.ts` (V14):**
  - lee `src/app/globals.css` con `node:fs`;
  - extrae cada `--color-<nombre>: #rrggbb` del bloque `@theme inline`;
  - calcula con la fórmula de WCAG 2.x;
  - falla si falta un token de su tabla: nunca pasa en vacío.
- **Superficies (V13):** en el mapa, la galería y el fin de sesión, todo texto o indicador que
  hoy se pinta directamente sobre el fondo pasa a ir sobre una superficie opaca de token:
  - el título y el compañero con la galería;
  - el contador de estrellas y su barra;
  - los puntos de avance;
  - la marca de «guardado»;
  - los ★ y los logros del fin de sesión.
  - Por ejemplo, una banda `bg-card rounded-card p-3`.
  - Sin sombras ni bordes de colores nuevos fuera de los tokens.
- **Paleta (D34, V14):**
  1. Mide los colores dominantes (Pillow, `quantize` a 6) de `companion-1`, `companion-2`,
     `bg-default` y `bg-pradera`, con un script de usar y tirar en el scratchpad, no en el
     repo.
  2. Propone ajustes de `surface`, `calm`, `action`, `celebrate` y `mark` para que casen con
     el arte. Los tokens que ya casan se quedan igual.
  3. Anota en `docs/diseno-visual.md`, por cada token cambiado, el valor viejo → nuevo, el
     color del arte del que sale y los ratios recalculados; y rehace la tabla de contraste.
  4. Aplica los valores en `globals.css` y `theme-colors.ts`. CO1-CO4 en verde.
- **`/dev/arte` (V15):** una página de desarrollo, sin estado del store, con:
  - la paleta: muestra de cada token y los ratios de CO1;
  - los compañeros con y sin gorra, a 112 y 160 px;
  - los cuatro fondos a pantalla reducida, con una banda del mapa encima (título, contador,
    una unidad);
  - las pegatinas, el trofeo y las partículas;
  - las seis bocas a 128 px en fila;
  - los iconos dentro de `BigButton`.
- **Puerta del autor:** con la paleta aplicada (commit en la rama), el implementador termina
  su informe con la instrucción para el autor. El coordinador **no despacha la revisión**
  hasta que el autor apruebe. Si el autor pide cambios, se abre una ronda de corrección
  (máximo 2).

**Casos de test:**

| Id | Entrada | Esperado |
|---|---|---|
| CO1 | los pares de la tabla de `diseno-visual.md` (`ink`, `ink-soft` y `action-ink` sobre sus fondos, ≥ 4,5; `calm-border` y `mark-border` sobre `surface`, `card` y su fondo, ≥ 3) | cada ratio ≥ su umbral |
| CO2 | todo `--color-*` | ninguno es rojo ni verde intenso: con HSL `s ≥ 0,5` y `0,25 ≤ l ≤ 0,75`, el tono no cae en `[345°, 360°) ∪ [0°, 15°]` ni en `[90°, 160°]` |
| CO3 | `THEME_COLORS`, `manifest()` y el fuente de `layout.tsx` | `THEME_COLORS.surface` = token `surface` y `THEME_COLORS.action` = token `action` (sin distinguir mayúsculas); `manifest()` devuelve esos valores; `layout.tsx` leído con `node:fs` no contiene ningún `#rrggbb` literal |
| CO4 | un CSS de prueba sin `--color-ink` | el lector lanza un error; no hay pares vacíos |
| LE1 | `MapScreen` dentro de `CosmeticBackground`, con `bg:espacio` equipado, logros ganados y una unidad hecha | todo nodo de texto no vacío fuera de `.sr-only` y de `[data-art-fallback]` tiene, antes de llegar a `[data-cosmetic-background]`, un ancestro con `bg-(card\|surface\|action\|calm\|mark)` **sin** `/opacidad` |
| LE2 | lo mismo con `RewardsScreen` | ídem |
| LE3 | lo mismo con `EndScreen` y un resumen con 3 estrellas y un logro | ídem (los ★ incluidos) |
| LE4 | `/dev/arte` en producción | `notFound()` (como `/dev/plantillas`) |

CO1-CO3 pasan con los tokens de hoy. Su «verlos fallar» se hace **rompiendo a mano** un token
(y deshaciéndolo): es una de las mutaciones.

**Mutaciones:**
1. Quitar `bg-card` de la banda del mapa: LE1 debe fallar.
2. `--color-ink-soft: #9a96a0`: CO1 debe fallar.
3. `--color-action: #e53935`: CO2 debe fallar.
4. `manifest.ts` con `theme_color: "#ffffff"` en vez de `THEME_COLORS.action`: CO3 debe fallar.

- [ ] CO1-CO4 sobre los tokens de hoy; romper un token para verlos fallar; commit
- [ ] LE1-LE3; verlos fallar; superficies en las tres pantallas; `/dev/arte` y LE4; commit
- [ ] Medir el arte, proponer y aplicar la paleta, y actualizar `diseno-visual.md`; puertas,
  más `pnpm build`
- [ ] Commit: `style(ui): paleta final derivada del arte y texto siempre sobre una superficie, para que se lea igual sobre cualquier fondo`
- [ ] **Puerta del autor:** «`pnpm dev` → `http://localhost:3000/dev/arte` y el mapa con cada
  fondo equipado. ¿Apruebas la paleta?»

---

## Tarea 6: Cierre — `docs/checklist-ipad.md`, README, poda y ledger

**Riesgo:** docs. **Effort:** `medium`. Revisión de cumplimiento.

**Files:**
- crear `docs/checklist-ipad.md`;
- modificar `README.md`, `docs/archivo-trampas-y-deuda.md`, `docs/diseno-visual.md`
  (sección «Pendiente»), `docs/arte-plan-7-prompts.md` (cabecera «integrado») y el ledger.

**Contrato:**
- **`docs/checklist-ipad.md`** (spec §10, D35), sobre el **despliegue de Vercel** (D29: lo hace
  el autor).
  - Cada punto lleva: pasos, resultado esperado y una casilla para anotar el fallo. Al final,
    una tabla de resultados.
  - Se agrupa por dispositivo:
    - iPad con Safari;
    - iPhone con Safari;
    - la PWA instalada;
    - PC con Chrome y Firefox.
  - Tiene que contener:
    1. **Los cuatro puntos del spec §10, literales:** permiso de micrófono, audio tras el
       primer toque, instalación en pantalla de inicio y comportamiento sin red.
    2. **Los 11 puntos de la prueba manual del Plan 6** (ledger del Plan 6, sección «Prueba
       manual del autor») y sus dos añadidos: la franja de 3 botones de `trace` en apaisado
       640 × 360, y el `<input type="file">` de importar.
    3. **La deuda 1 del README:**
       - iPhone y iPad;
       - Firefox, sobre todo el arrastre de `build`;
       - 360 × 640 y 640 × 360;
       - los adaptadores reales de voz: `say-it` con micrófono en Safari; en la PWA instalada,
         que cae a los botones del adulto (spec §11.2).
    4. **La lista del Plan 5** (su ledger): los puntos que no consten como hechos.
    5. **El arte:**
       - el compañero en el mapa y en el fin de sesión, con y sin gorra;
       - cada fondo detrás del mapa, la galería y el fin de sesión, legible;
       - la serie de pegatinas;
       - el trofeo;
       - las partículas al trazar y al arrastrar;
       - el cursor con ratón en PC y, si hay trackpad, en iPad;
       - **la boca**: fluida la primera vez que suena en el iPad, y **cada forma distinguible
         a 128 px, probado con un niño** (D21);
       - el icono en la pantalla de inicio, sin recortes con máscara;
       - el color de la barra (`theme_color`).
- **README:**
  - la línea de estado: el Plan 6 está fusionado (PR #7) y el Plan 7 está en su rama;
  - la sección «Lo que ya está hecho: Plan 7»;
  - la hoja de ruta;
  - D32-D35 en la tabla;
  - la fila de `images/` en «Arquitectura»;
  - «Cómo ejecutarlo»: `optimizar-arte.py` y `/dev/arte`;
  - «Siguientes pasos»: revisión final → despliegue y checklist del autor → PR.
- **Poda (CLAUDE.md):**
  - el README termina con ≤ 8 trampas y ≤ 10 deudas;
  - la deuda 1 apunta a `docs/checklist-ipad.md` y sigue viva hasta que el autor la pase;
  - se añaden como `minor (deferred)` los glifos que quedan (V10) y lo que hayan diferido las
    tareas;
  - cada entrada se convierte en test, se resuelve o se justifica.
- **Ledger:** el estado final y la tabla de progreso con rondas y mutaciones supervivientes.

**Casos de test:** ninguno nuevo. Las puertas, `pnpm build` y `pnpm e2e` en verde.

- [ ] Checklist, README, poda, `diseno-visual.md`, prompts y ledger
- [ ] Puertas en verde, más `pnpm build` y `pnpm e2e`
- [ ] Commit: `docs(plan-7): checklist del iPad con la prueba del Plan 6 dentro, README y poda, para que el autor haga una sola pasada en el dispositivo`

---

## Después del plan

1. Revisión final de la rama con `model: "opus"` y effort `high` o `xhigh` (CLAUDE.md).
2. El autor despliega en Vercel (D29) y pasa `docs/checklist-ipad.md`. Lo que falle entra en
   el ledger como tarea de corrección, antes del PR.
3. PR contra `main`.
4. Después, fuera de este plan: Azure, audios neurales en 3 acentos y evaluador `browser`
   (hoja de ruta del README).
