# Exploración del mapa-mundo: análisis, arquitectura, assets y animación (2026-10-03)

Propuesta para revisar **antes** de construir el mapa de producción (Plan 8). La autoridad visual
es la skill `silabin-design` (`.claude/skills/silabin-design/SKILL.md`). Las maquetas y su
análisis están en `notas-maquetas.md`, y la imagen de dirección visual es concept art: no se
copia.

## 1. Análisis

### Lo que hay

- **Stack:** Next.js 16 (App Router), React 19, Tailwind 4 (tokens en `@theme`, en
  `src/app/globals.css`), `motion` 13 (Framer Motion, D30), Zustand con IndexedDB, Serwist (PWA
  con precaché) y Vitest con Playwright. **No hay Rive ni Lottie.**
- **El mapa hoy** (`src/features/map/MapScreen.tsx`, 288 líneas) es una lista vertical de
  `max-w-xl`, con una tarjeta de cabecera (el título como `AdultDoor`, `Companion`, «Mis premios»,
  `StarCounter`, `UnitDots`) y un `UnitButton` por unidad, agrupados por fase.
- **Envoltorio:** `App` pinta el mapa dentro de `CosmeticBackground` (el fondo equipado, a
  pantalla completa).
- **Datos:** el orden sale de `curriculum.unitOrder` y la fase de `unit.phase`. El estado sale
  de `progress.units[id]` (`done`, `active` o `locked`, y `bestStars`). Hay 21 unidades: 4 de
  fase 0, 5 de fase 1, 4 de fase 2 y 8 futuras vacías. Cada unidad tiene `audioKey`, que dice su
  `title`.
- **Animación:** `motion-safe:` de Tailwind en la sesión (`animate-bounce`, `animate-pulse`),
  `motion/react` en `EndScreen` y `TrailLayer`, y el ajuste del adulto `reducedCelebrations`.
- **Tests que protegen el mapa:** 24 en `MapScreen.test.tsx`, LE1 en `legibility.test.tsx` y los
  selectores del e2e (`data-unit`, `data-status`, `aria-current`, `aria-label`).

### Respuestas a las 10 preguntas

1. **Componentes reutilizables:** `Companion`, `AdultDoor`, `Icon` (`lock`, `gallery`),
   `BigButton` (🔁 Repasar), `ArtImage` (imagen con emoji de respaldo, la base de los assets del
   kit), `CosmeticBackground`, y las piezas de `MapScreen` que se extraen tal cual: `StarCounter`,
   `UnitDots`, `SavedMark` y `Estrellas`. Del motor, `activeUnitId`, `unitProgress`,
   `totalStars` y `nextMilestone`, y del registro, `isSessionPlayable`.
2. **Componentes nuevos:** ver la arquitectura (§2).
3. **Assets que se reutilizan:**
   - `companion-1` y `companion-2` (con y sin gorra) como mascota estática.
   - `particle-estrellita` como chispa y estallido de estrellas.
   - `ui-lock.png`.
   - Los fondos `bg-*`, como cielo lejano si se elige la opción A del §5.1.
   - De las 65 ilustraciones de palabras (`casa`, `arbol`, `isla`, `sol`, `luna`), alguna podría
     servir de hito provisional. Probablemente traen fondo, así que hay que comprobarlo.
4. **Assets que faltan:** todo el kit de entorno (§4). No hay ni un árbol, una nube, un puente ni
   un terreno con transparencia.
5. **Motion, Rive y Lottie:** Motion sí; Rive y Lottie, no.
6. **Dependencias nuevas:** **ninguna para la exploración.** Rive
   (`@rive-app/react-canvas`) solo cuando exista un `.riv` del compañero; Lottie, probablemente
   nunca (§5).
7. **Mundos:** uno por fase, cada uno como una **banda-isla** con su terreno, su hito, su frente y
   el color de mundo de la skill. Las fases futuras forman una sola isla beis medio cubierta de
   nubes.
8. **Camino:** en SVG, calculado por código desde la misma rejilla que coloca los nodos (§3).
9. **Responsive:** la composición cambia por punto de corte; no se escala (§3).
10. **Problemas técnicos:** §5.

## 2. Arquitectura

```
src/features/map/
├── MapScreen.tsx            lee el store y compone (como hoy, sin decidir pedagogía)
├── MapHeader.tsx            SavedMark · AdultDoor «Silabín» · StarCounter · «Mis premios»
└── world/
    ├── layout.ts            PURO: rejilla en serpiente, puntos del camino y puentes, columnas por ancho
    ├── worlds.ts            fase → mundo: color, assets del kit y nombre para el adulto
    ├── environment-kit.ts   manifiesto de assets: id → { src | null, ratio, placeholder }
    ├── WorldMap.tsx         columnas (useColumns) + layout; pinta las bandas y el camino
    ├── WorldBand.tsx        una isla: terreno, hito, frente, decoración en «huecos» con nombre
    ├── EnvAsset.tsx         un asset del kit: ArtImage si hay src; si no, el placeholder rotulado
    ├── WorldPath.tsx        SVG: tramo recorrido continuo, el resto punteado, puentes
    ├── LevelNode.tsx        current / completed / locked (más el caso «llega después»)
    ├── Mascot.tsx           interfaz de estados; v1 = WebP + Motion, v2 = Rive (mismo contrato)
    ├── Ambient.tsx          los pocos elementos que se mueven, con motion-safe y reducedCelebrations
    └── use-columns.ts       matchMedia → 5 | 3 | 2
```

- **`layout.ts` es la pieza clave:** posiciones en unidades de rejilla (columna y fila de
  cada banda), nunca en píxeles. `WorldPath` dibuja en un `viewBox` con esas mismas unidades, y
  los nodos se colocan en `%` del mismo marco: no hay posiciones absolutas frágiles ni medidas
  del DOM. Lleva tests de serpiente, puentes y columnas.
- **Decoración por huecos con nombre:** cada banda tiene `slots` (`landmark`, `tree-a`,
  `tree-b`, `cloud`, `foreground`) que `layout.ts` deja libres entre nodos. `worlds.ts` dice qué
  asset va en cada hueco. Cambiar la decoración es cambiar datos, no la vista.
- **`EnvAsset` + `environment-kit.ts`:** mientras un asset tenga `src: null`, se pinta un
  placeholder rotulado (`[tree-01]`) con su proporción real. Al soltar el WebP en
  `public/images/mundo/` y rellenar `src`, se sustituye sin tocar la vista.
- **`Mascot`** recibe `state: "idle" | "happy" | "pointing" | "fly-to" | …` y una posición del
  layout. La v1 usa el arte del compañero equipado (`Companion` o `cosmeticVisual`) con Motion.
  La v2 cambia el renderizador por Rive sin tocar a quien lo usa.
- **Fronteras:** `world/` no importa `@/content` ni el store, y recibe datos ya resueltos.
  `MapScreen` sigue siendo el único que lee `useApp`. Así `/dev/arte` puede componer el mundo con
  datos falsos.

## 3. La composición y su adaptación

**iPad apaisado (1194 × 834, el objetivo).** Una banda-isla por mundo, cada una con una sola fila
(la fase 0 con 4 nodos, la 1 con 5, la 2 con 4). El camino va de izquierda a derecha, baja por un
puente al final de la banda y vuelve de derecha a izquierda. Debajo, la isla futura entre nubes.
Cabecera delgada arriba. Al abrir, el scroll vertical centra la unidad activa.

**iPad vertical (834 × 1194).** Tres columnas: cada banda se dobla en serpiente dentro de sí misma
(las vocales quedan en 3 + 2), y el camino es más vertical.

**Teléfono (390 × 844).** Dos columnas y menos decoración: solo el hito y un árbol por banda. Al
abrir se ve la sección del mundo centrada en la activa.

**Teléfono apaisado (`apaisado-bajo`).** Cinco columnas, con los nodos un escalón más pequeños
(≥ 72 px) y la cabecera mínima.

**Densidad por punto de corte:** apaisado, 1 hito, 2 árboles, 1 nube y frente por banda;
vertical, 1 hito, 1 árbol y 1 nube; teléfono, solo el hito.

**Nodos** (detalle en la skill, «Progreso»):

| Estado | Nodo |
|---|---|
| current | unos 144 px, `bg-action`, anillo, halo que respira, elevación suave, el compañero al lado y `aria-current="step"` |
| completed | unos 120 px, `bg-card`, borde del acento del mundo y ★ ganadas |
| locked | unos 104 px, `bg-card` opaca, contenido en gris y atenuado, y candado pequeño |

## 4. Kit de entorno: manifiesto de assets

El estilo es el de toda la app: **3D suave tipo juguete** (`docs/ilustraciones-prompts.md`). Lo
genera el autor a partir de prompts (D25) y lo optimiza `scripts/optimizar-arte.py`, con el lado
mayor ≤ 1024 px. Va a `public/images/mundo/`. **Presupuesto:** unos 500 KB en total, porque todo
entra en la precaché de la PWA (el arte del Plan 7 ocupa unos 750 KB).

### Compartidos

| Id | Formato | Transparente | Proporción | Reutilizable | Animado |
|---|---|---|---|---|---|
| `cloud-01`, `cloud-02` | WebP | sí | 2:1 | sí | deriva lenta |
| `tree-01`, `tree-02`, `tree-03` | WebP | sí | 3:4 | sí | balanceo (como mucho 2 en pantalla) |
| `bush-01` | WebP | sí | 2:1 | sí | estático |
| `flowers-01` | WebP | sí | 2:1 | sí | estático |
| `rock-01`, `rock-02` | WebP | sí | 3:2 | sí | estático |
| `bridge-01` | WebP | sí | 1:2 (vertical, une dos bandas) | sí | estático |
| `sign-01` (poste **sin texto**; lleva el icono del mundo) | WebP | sí | 1:1 | sí | estático |
| `water-01` (tira repetible) | WebP | sí | 4:1 | sí | desplazamiento muy lento |
| `star-01` (sustituye al glifo ★, V10) | WebP | sí | 1:1 | sí | solo al ganarse |
| `particle-estrellita` | **ya existe** | sí | 1:1 | sí | estallido breve |
| camino | **SVG por código** | — | — | sí | avance al progresar |

### Por mundo (`sounds`, `vowels`, `syllables`, `future`)

| Id | Formato | Transparente | Proporción | Reutilizable | Animado |
|---|---|---|---|---|---|
| `{mundo}-terrain` (isla en 9 trozos, para `border-image`: estira a cualquier ancho y alto) | WebP | sí | 1:1, 512 px con márgenes de corte | en su mundo | estático |
| `{mundo}-landmark` | WebP | sí | 1:1 | no | estático |
| `{mundo}-foreground` (borde inferior: hierba y flores del color del mundo) | WebP | sí | 4:1 | en su mundo | estático |
| `future-fog` (nubes que tapan la isla futura) | WebP | sí | 3:1 | no | deriva muy lenta |

Ideas de hito, para que decida el autor: sonidos, un quiosco de música o un árbol con campanitas;
vocales, una casita en una nube o un faro; sílabas, un molino o una panadería. **Nunca con texto
pintado.**

**Por qué el terreno va en 9 trozos:** una ilustración ancha de terreno no sirve cuando la banda
pasa de 1 fila a 2 o 3 (vertical, teléfono). Con `border-image`, los bordes redondeados se quedan
y el centro se estira o se repite, así que una sola pieza por mundo vale para todos los puntos de
corte.

### Compañero

| Id | Formato | Transparente | Proporción | Reutilizable | Animado |
|---|---|---|---|---|---|
| `companion-1`, `companion-2` (con gorra) | **ya existen** (WebP) | sí | 1:1 | sí | v1: flotar, saltar y volar con Motion |
| `companion-{n}-pose-{señala, sentado, vuela}` | WebP | sí | 1:1 | sí | intermedio barato antes de Rive |
| `companion-{n}.riv` (máquina de estados) | Rive | sí | 1:1 | sí | v2 |

## 5. Estrategia de animación

| Elemento | Tecnología | Animación |
|---|---|---|
| Nube | CSS `@keyframes` (transform) | deriva horizontal en 60-90 s, como mucho 2 visibles |
| Árbol | CSS `@keyframes` | balanceo de ±1,5°, con `transform-origin` en la base; como mucho 2 a la vez |
| Decoración flotante | CSS | `translateY` de 3 px en 4-6 s |
| Agua | CSS (`translateX` de una tira doble) | muy lenta; nunca `background-position`, que repinta |
| Flores, rocas, terreno, hito, frente | WebP | **estáticos** |
| Nodo | Motion | entrada escalonada una sola vez; al tocarlo, escala a 0,96 |
| Halo del nodo activo | CSS (pseudo-elemento con `opacity` y `scale`) | respira cada 2,5 s; no se anima `box-shadow`, que repinta |
| Camino | SVG + Motion | `stroke-dashoffset` al avanzar una unidad, una vez |
| Compañero v1 | WebP + Motion | idle (flota 3 px) y salto hasta la nueva unidad activa siguiendo el camino (< 2 s) |
| Compañero v2 | Rive | máquina de estados (idle, happy, pointing, listening, thinking, celebrate, try_again, fly_to_next_level, sleepy) |
| Estrellas al ganarse | Motion + `particle-estrellita` | estallido < 1,5 s; **sin Lottie** |

- **CSS para los bucles infinitos** (corren en el compositor sin JS) y **Motion para lo que
  depende del estado**: entradas, avance del camino, compañero y estrellas. Es la regla «cada
  herramienta solo donde aporta».
- **Interruptores:** el movimiento ambiental se apaga con `prefers-reduced-motion`
  (`motion-safe:`). Las celebraciones y el viaje del compañero, además, con
  `reducedCelebrations`.
- **Presupuesto:** como mucho unos 6 elementos animados a la vez en pantalla, y los bucles se
  pausan fuera de la vista (IntersectionObserver).

**Rive, más adelante y con condiciones.** Hace falta que alguien monte el compañero en el editor
de Rive: el arte de IA se puede trocear (cuerpo, alas, ojos) y animar con mallas, pero es trabajo
manual. Son 2 compañeros, con y sin gorra. El runtime (`.wasm`) debe entrar en la precaché para
que funcione sin red. Mientras no haya un `.riv`, la v1 con WebP y Motion da el 80 % de la
sensación con cero dependencias, y el contrato de `Mascot` deja la puerta abierta.

**Lottie, no.** Sin un diseñador que entregue `.lottie`, un estallido de estrellas con Motion y
la partícula que ya existe hace lo mismo sin otra librería.

## 5.1 Problemas técnicos y decisiones pendientes

1. **Fondo equipable frente a entorno del mundo (decisión de producto).** Pradera, Espacio y
   Bosque son recompensas (spec §7). Si el mapa trae su propio paisaje, ¿qué hacen?
   - **A (recomendada):** el fondo equipado es el cielo lejano y las islas flotan encima. En
     Espacio, islas entre estrellas.
   - **B:** el fondo cosmético solo se ve en premios y en el fin de sesión.
2. **Precaché y memoria en el iPad:** con el lado mayor ≤ 1024 px y unos 500 KB en total. Un PNG
   de 2000 px se descomprime a unos 16 MB de RAM.
3. **Tests:** se conservan `data-unit`, `data-status`, `aria-current` y los `aria-label`, LE1
   (texto sobre superficie opaca) y los selectores del e2e.
4. **Transparencias del arte de IA:** las herramientas no siempre entregan un alfa limpio, así
   que quizá haga falta quitar el fondo en `optimizar-arte.py`.
5. **Nunito:** pendiente de implementar, y hay que vigilar la `a` de dos pisos frente al trazo
   (D28).
6. **Fase 0:** el icono de cada unidad (`notas-maquetas.md`, decisión 2). Mientras tanto,
   emoji provisionales.
7. **Toque en una unidad terminada** (decisión 1): cambia el motor si sirve para repasar.

## 6. Lo que la skill cambia de la propuesta para las actividades

- **La instrucción la dice el compañero en voz alta**, no un globo de texto: el niño no lee
  (§9). «¡Escucha!» y «¡Ahora tú!» son locuciones nuevas en `audio-manifest.ts`. Si hay globo, es
  redundante y opcional.
- **«¿Dónde está CASA?»** como texto no sirve: la orden se oye. En pantalla solo va la palabra
  objetivo, cuando el ejercicio es leerla.
- **No hay «continuar»:** el ejercicio avanza solo tras el acierto, con un gesto por ejercicio.
- **🐥 es el compañero equipado** (loro o elefantito).
- El resto (cabecera con progreso, estímulo grande, una interacción, feedback breve) ya es la
  estructura de `SessionScreen`; el rediseño de las actividades va en otro plan.

## 7. `/dev/arte`: sección «Silabín — World Exploration»

Herramienta de desarrollo (en producción no existe la ruta), con datos falsos y los componentes de
`world/` (que después usará el mapa real):

1. **Muestrario de mundos:** las cuatro bandas (lila, azul, melocotón, beis), cada una con un nodo
   completed, uno current y uno locked, y una tabla de contraste.
2. **Composición en iPad apaisado (1194 × 834):** cabecera, tres bandas y la isla futura, camino
   SVG, nodos reales, el compañero junto al nodo activo, puentes, y los placeholders rotulados del
   kit en sus huecos.
3. **Mismos datos en vertical (834 × 1194) y en teléfono (390 × 844),** en marcos más pequeños.
4. **Controles de revisión:** selector de fondo equipado (clásico, Pradera, Espacio, Bosque), un
   interruptor de «movimiento reducido» y uno de «decoración: mínima / normal», para decidir la
   cantidad.
5. **Muestras de animación:** deriva de nube, balanceo de árbol, halo del activo, idle del
   compañero y el avance del camino (botón «avanzar una unidad»).
