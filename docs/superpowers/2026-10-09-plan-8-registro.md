# Plan 8: registro de ejecución

Rama: `feat/plan-8-mapa-camino`, creada el 2026-10-09 sobre `docs/refactor-visual-claude`
(PR #10: `main` en `ec34ffe` más el commit de docs `82705ad`). Ver D44.
Plan: `docs/superpowers/plans/2026-10-09-silabin-mapa-camino.md` (4 tareas).
Referencia de diseño: `docs/visual-refactor/` (PR #10), sobre todo `CLAUDE-HANDOFF.md` e
`icons/demo.html`.

Este registro es la memoria del plan. Al retomar, léelo primero con `grep -n` y el tramo final.

## Estado

| Fase | Estado |
|---|---|
| Decisiones con el autor (D37-D45) | **hechas** (2026-10-09, abajo) |
| Rulings de planificación (MP1-MP15) | **fijados** (abajo) |
| Redacción del plan | **hecha** (2026-10-09, Opus). Pendiente de la revisión del autor |
| Ejecución | Sin empezar. Siguiente: T1 en Sonnet, `/effort medium` |

## Decisiones tomadas con el autor (2026-10-09)

| # | Decisión |
|---|---|
| D37 | **Unidad terminada: insignia y estrellas.** El nodo azul lleva su insignia de completado y, debajo, las estrellas ganadas (ver MP4 sobre ☆) |
| D38 | **Activa pero no jugable: como bloqueada, sin aro**, con símbolo visible e insignia propia (un reloj, no el candado). Tocarla no inicia nada y su etiqueta sigue siendo «Llega en una próxima versión» |
| D39 | **Solo camino y nodos.** La cabecera actual (puerta de padres, compañero, «Mis premios», `StarCounter`, `UnitDots`, `SavedMark`) se queda con su función y su aspecto. La composición completa de la referencia (cabecera, pie y tarjetas de capítulo) queda para otro plan |
| D40 | **El PR #9 (`feat/world-map-exploration`) se aparca.** Nada de sus fondos ni nodos `.webp` entra aquí. Sus puertas están en rojo y se deja así por decisión del autor |
| D41 | **Serpiente por columnas (la skill), no el zigzag de una columna del PR #10:** 2 columnas en teléfono, 3 en iPad vertical y 5 en iPad apaisado |
| D42 | **Sin título visible bajo los nodos.** El nombre va solo en `aria-label` |
| D43 | **Los colores de mundo no entran.** El camino y los separadores de fase son neutros, con tokens; los colores de mundo siguen como decisión abierta de la skill |
| D44 | **Rama desde el PR #10**, no desde `main`, para que `docs/visual-refactor/` viaje con el plan. El PR del Plan 8 incluye el #10, que se cierra como incluido |
| D45 | **Se versionan `.claude/skills/silabin-design/` y `docs/diseno/`** en esta rama (no `.claude/scheduled_tasks.lock`). `docs/diseno/mapa/exploracion-mundo.md` es la propuesta del PR #9 y queda como antecedente |

## Rulings de planificación (prefijo MP)

Cada uno con su porqué y lo que costaría si fuera equivocado.

- **MP1 · `aria-disabled`, nunca `disabled`.** El componente de referencia pone `disabled` en
  bloqueado. Con `disabled`, el nodo sale del orden del foco, el lector no anuncia «bloqueada»
  al recorrer el mapa, el toque en «soon» no llega y se rompen U7 y el e2e. Coste si fuera
  equivocado: cambiar un atributo en `MapNode`.
- **MP2 · Sin estado `neutral` ni iconos de ejercicio.** El motor no tiene un estado neutro, y
  el mapa solo pinta unidades: se portan las 21 formas de unidad (líneas 172-422 de
  `ChallengeNode.tsx`) y las tres insignias (check, candado y reloj). Las 9 de ejercicio se
  quedan en `docs/visual-refactor/`. Coste: portarlas después es copiar datos.
- **MP3 · Completado en azul saturado, como el PR #10**, aunque la skill decía «base clara y
  neutra». El PR #10 es posterior y el autor lo aprobó. Cara `calm-border` (#5187c7) con el
  símbolo en blanco (`card`): 3,72 : 1. Coste: si el autor lo quiere más suave, se cambian dos
  clases (cara `calm`, símbolo `calm-border`) y una línea de la skill. La T4 actualiza la skill.
- **MP4 · Las ☆ se mantienen como hoy** (2 estrellas = ★★☆). La opción elegida en D37 decía a la
  vez «las 3 estrellas» y «nunca huecos»; ante la ambigüedad, no se cambia el comportamiento
  actual ni su test. **Se pregunta al autor en la revisión del plan.** Coste: quitar las ☆ es
  borrar un `map` y un aserto.
- **MP5 · Bloqueado en tema claro, con el símbolo a 3 : 1.** `challenge-node.css` trae los
  valores del tema oscuro de la demo (#343b47); la app solo tiene tema claro, así que se usan
  los claros de `map-preview` (cara #edeef2, fondo #d9dce4). El símbolo de la referencia
  (#a7adba) da 2,0 : 1; se oscurece a #757a88 (3,70 : 1) para que «el símbolo se vea» de
  verdad. Coste: un token.
- **MP6 · Hex de la referencia → tokens.** Se reutilizan `action` y `action-ink` (disponible),
  `mark` (el aro), `surface` y `calm` (los bordes interiores), `calm-border` y `card`
  (completado) y `trace-ink` (el foco: es el mismo #6a4cff de la referencia). Son nuevos
  `action-depth` #dda016, `calm-depth` #286091, `node-locked` #edeef2, `node-locked-depth`
  #d9dce4 y `node-locked-ink` #757a88. Coste: tokens de más o de menos, sin efecto en la lógica.
- **MP7 · Conectores sin medir el DOM.** Un SVG por fase y por número de columnas, en unidades
  de celda (`viewBox="0 0 cols filas"`, `preserveAspectRatio="none"` y
  `vector-effect="non-scaling-stroke"`). Se adapta solo al tamaño; no hace falta
  `ResizeObserver` (que no existe en jsdom) ni estilos en px (E4). La posición de cada nodo va
  en propiedades CSS sin unidades (`--c2`, `--r2`…). Coste: si las curvas se deforman a la
  vista, se pasa a medir, con el riesgo que eso trae.
- **MP8 · Una serpiente por fase, cortada entre fases** (como las secciones de Duolingo). Cada
  fase empieza de izquierda a derecha y el camino no cruza el separador. Así se mantienen las
  regiones `Fase N`, que pide el test 1. Coste: un camino continuo entre fases exigiría una
  rejilla global con `display: contents` en las secciones, que en Safari ha roto su semántica.
- **MP9 · Puntos de corte:** < 768 px → 2 columnas; 768-1023 → 3; ≥ 1024 → 5 (`md:` y `lg:`
  por defecto de Tailwind). El panel del camino se ensancha (`md:max-w-2xl lg:max-w-4xl`) y la
  cabecera se queda en `max-w-xl` (D39). A 320 px: 2 celdas de unos 128 px para un nodo de
  88 px con aro de 116. Coste: ajustar dos clases.
- **MP10 · El camino va en un panel opaco `bg-surface`** (V13), como la cabecera. El nodo
  bloqueado queda a 1,1 : 1 de la superficie, y se reconoce por su símbolo (3,7 : 1) y su
  insignia, no por el borde. Con el fondo Espacio, el camino no flota sobre el cielo oscuro.
  Coste: si el autor quiere ver el fondo equipado entre los nodos, hay que revisar LE1 y el
  contraste del camino.
- **MP11 · Objetivos ≥ 72 px** (spec §9 y skill), no los 44 del handoff. El nodo mide 88 px.
- **MP12 · Centrar la unidad activa una vez, al montar y sin animación**
  (`scrollIntoView?.({ block: "center" })`). Sin `smooth`, no hay movimiento que respetar con
  reduced-motion. jsdom no lo implementa: de ahí el `?.`. Coste: ninguno.
- **MP13 · El icono de cada unidad vive en `features/map`**, no en el esquema de `content/`. Un
  test de exhaustividad sobre `curriculum.unitOrder` hace fallar una unidad nueva sin icono.
  Coste: si mañana el contenido trae su icono, se mueve el mapa de datos.
- **MP14 · `aria-current="step"` sigue en toda unidad `active`**, también en «soon», como
  hoy (U2). Coste: ninguno; es el contrato actual.
- **MP15 · Tocar una unidad terminada no hace nada**, como hoy. El «Volver a jugar» del preview
  no se porta (lo prohíbe el handoff: cambiaría el motor). Sigue como decisión abierta de la
  skill.

## Reparto de tareas

| Tarea | Contenido | Riesgo | Effort | Revisión |
|---|---|---|---|---|
| T1 | Iconos de unidad, tokens de nodo y sus pares de contraste | datos y tokens | `medium` | cumplimiento, sin mutación |
| T2 | `nodeLook` y `MapNode`: del estado del motor al nodo | contrato motor-interfaz | `high` | completa, 3-5 mutaciones |
| T3 | Serpiente por columnas, conectores e integración en `MapScreen` | lógica nueva y contrato del mapa | `high` | completa, 3-5 mutaciones |
| T4 | Skill, `diseno-visual.md`, checklist del iPad, README y poda | docs | `medium` | cumplimiento |

Después: revisión final de la rama en Opus (`high`), despliegue del preview y pasada visual
con `~/qa-silabin`.

## Progreso de ejecución

| Tarea | Estado | Rondas | Mutaciones que sobreviven |
|---|---|---|---|
| T1 | completa (e603ff9) | 0 | n/a (sin mutación) |
| T2 | completa (ca3e547) | 0 | 4 de 16 sobreviven (j, m, o, p), todas de clases o aria-hidden; las 5 obligatorias mueren |
| T3 | completa (55975b2) | 0 | 4 de 7 propias del revisor sobreviven (visibilidad de los SVG, `fill`, clase del trazo, `z-10` de la celda); las 5 obligatorias mueren |
| T4 | completa (ea79ecf) | 1 | n/a (docs) |

## Ejecución

### T1 · iconos de unidad, tokens de nodo y pares de contraste (sonnet, medium)

- Commit `e603ff9` (base `07d4ce3`). Revisión de cumplimiento (sonnet): ✅ y *Approved*, sin Critical ni Important. Rondas de corrección: 0.
- Ruling: el contraste de `node-locked-ink` (#757a88) sobre `card` (#fff) es **4,29 : 1**, no los 3,74 que decían el plan y el brief — el implementador y el revisor lo calcularon por separado con la fórmula WCAG 2.x. `docs/diseno-visual.md` documenta 4,29 y el test exige ≥ 3. Coste si fuera equivocado: una cifra en la documentación; el par sigue pasando 3 : 1.
- T1: minor (deferred): UI3 solo prueba `phase0:clap` como caso sin `data-letter`.
- T1: minor (deferred): UI4 es condicional (`if (valor !== undefined)`) y no detectaría una clave mal escrita (`Fill`).
- T1: minor (deferred): la línea 51 del plan dice 3,74; debería decir 4,29 (el plan no se reescribe; vale este Ruling).

### T2 · `nodeLook` y `MapNode` (sonnet, high)

- Commit `ca3e547` (base `4ddfa59`). Revisión completa (sonnet) con 16 mutaciones: *Approved*, sin Critical ni Important. Rondas de corrección: 0. Las 5 mutaciones obligatorias mueren (a-e) y otras 7 propias también.
- T2: minor (deferred): sobreviven 4 mutaciones, ninguna cubierta por test: quitar `aria-hidden` de la pastilla de estrellas, quitar `bg-card` de la pastilla, `translate-y-0.5` en los cuatro aspectos y el aro `before:` también en `locked`. Cubrirlas es un `className.toContain/not.toContain` por aspecto en `MapNode.test.tsx`; la revisión final debe triar si entra antes del merge (el aro solo en «available» es la señal visual del nodo jugable).
- T2: minor (deferred): `MapNode.tsx:300` usa `-right-1` (−4 px) y la referencia −5 px.
- T2: minor (deferred): el aro (−14 px) y el foco (offset 18) desbordan el botón de 88 px y el foco rodea círculo y estrellas. **La T3 debe dejar separación en la rejilla.**
- T2: minor (deferred): `LLEGA_DESPUES` está duplicada (`MapScreen.tsx:24` y `MapNode.tsx:188`); **la T3 deja una sola** al sustituir `UnitButton`.
- Ruling: `src/engine/planner.test.ts` ("30 semillas por 3 estados") agota los 5000 ms en la suite completa (5,8 s con carga ~18) y pasa solo (47/47 en 4 s). No es de esta tarea (planner no se tocó) y T1 pasó la suite completa. Se deja sin tocar; la puerta de la T3 se corre con `pnpm vitest run` de planner aparte si vuelve a fallar. Coste si fuera equivocado: un timeout que subir.

### T3 · serpiente por columnas, conectores e integración en `MapScreen` (sonnet, high)

- Commit `55975b2` (base `750c6cc`). Revisión completa (sonnet): *Approved*, sin Critical ni Important. Rondas de corrección: 0. Puertas del implementador: `pnpm test` 1439 pasan, typecheck y lint limpios, `e2e/mapa.spec.ts` 16/16. Las 5 mutaciones del brief mueren (la 4 solo la cazan S2 y `toHaveCSS`; un clic real no puede, porque las celdas `z-10` quedan sobre el SVG). El revisor probó 7 más: 3 mueren (`--r5` en base 0, `ref` en todas las celdas, `md:col-start` con `--c2`) y 4 sobreviven (ver minors).
- Incidente de procedimiento: la sesión se cortó con el revisor a medias y dejó `MapScreen.tsx` vaciado en el árbol sin commitear. Se revirtió con `git checkout` (HEAD intacto) y el revisor se reanudó y terminó con el árbol limpio.
- Ruling: **MP12 se mantiene tal cual** aunque el centrado de la activa deja el logo (puerta del panel de padres, pulsación larga) fuera de vista al abrir el mapa; el adulto tiene que subir hasta él. `e2e/offline.spec.ts` (J3) añade `logo.scrollIntoViewIfNeeded()`. Es lo que manda el plan (MP12) y no toca la ergonomía del niño. Coste si fuera equivocado: cambiar `{ block: "center" }` por `"nearest"` o centrar solo si la activa queda fuera de la primera pantalla (una línea y su test S3). **Decisión de producto para el autor**, a confirmar en la pasada visual del preview.
- Ruling: `main` pierde `max-w-xl` y lo lleva la cabecera (E4 reescrito con `closest()` desde el h1); el `BigButton` de repaso lleva `mx-auto w-full max-w-xl` para verse como antes. Coste si fuera equivocado: dos clases.
- Ruling: `serpentinePath` conserva `_columns` sin usar (la firma la fija el brief; el giro se decide por `col === 0`, correcto para 2, 3 y 5). Coste: borrar un parámetro.
- Ruling: la sintaxis `col-start-(--c2)` compila (lo prueba el e2e: 2, 3 y 5 columnas distintas). Sin `col-start-[var(--c2)]`.
- T3: minor (deferred): **la insignia «Guardado» queda tapada por los nodos.** `SavedMark` (`fixed top-2 left-2 z-10`, primera en el DOM) y `CELDA` (`relative z-10`, después): mismo z-index, gana el último del DOM, así que al desplazarse un nodo pasa por encima del ✓. Arreglo: `z-20` en `SavedMark`. Deducción del orden de apilado, sin probar en navegador. **La revisión final debe arreglarlo antes del PR.**
- T3: minor (deferred): el e2e no comprueba cuál de los tres SVG se ve en cada punto de corte; intercambiar las clases de 3 y 5 columnas pasa 60/60 y 16/16 (Review Focus 5 sin protección real). Arreglo: en el e2e, `section[aria-label='Fase 1'] svg[data-columns]:visible` tiene un solo elemento y su `data-columns` es el del viewport. **La revisión final debe cubrirlo antes del PR.**
- T3: minor (deferred): S2 no comprueba `fill="none"`, la clase `stroke-node-locked-depth` ni `vector-effect="non-scaling-stroke"` (mutaciones que sobreviven), ni `z-10` de la celda (redundante en la práctica, lo exige el `before:` del aro).
- T3: minor (deferred): no se midió en navegador que el aro (−14 px) y el foco (offset 18) quepan sin pisar al vecino (las celdas son 9 rem de alto y ≥136 px de ancho frente a 88 px); el e2e mide solo las cajas de los botones (≥ 15,5 px). Va a la pasada visual del preview.
- T3: minor (deferred): `apaisado › build` es inestable ya en la base (fallos distintos según la corrida, atascado en `piezas.nth(n-2).click()`); no es del plan.

### T4 · autoridad de diseño, docs y poda (sonnet, medium)

- Commits `ef31d71` y `ea79ecf` (base `8a46e5f`). Revisión de cumplimiento (sonnet): *Needs fixes* en la primera pasada, un Important (`README.md:48` decía 1394 tests y eran 1439) y un minor que sí entró (deudas 4 y 10 pasaban de dos líneas). Ronda de corrección 1 de 2 y re-revisión acotada: todo resuelto. Sin mutación (docs).
- Poda del README: 0 trampas vivas (tope 8) y 10 deudas (tope 10); el texto completo está en `docs/archivo-trampas-y-deuda.md`, sección «Plan 8».
- Ruling: MP12, las ☆ (MP4) y los minors del Plan 8 van en una sola deuda (la 8 del README). Los dos arreglos de la revisión final (`z-20` en `SavedMark` y la aserción e2e del SVG visible por punto de corte) están en «Siguientes pasos». Coste si fuera equivocado: separar una entrada.
- Ruling: `docs/diseno/mapa/exploracion-mundo.md` (antecedente del PR #9, aparcado) conserva `UnitButton`, `LevelNode` y `WorldMap` con una nota de antecedente en la cabecera; no se reescribe. Coste: ninguno.
- T4: minor (deferred): la viñeta T4 del README dice «Poda: ninguna trampa viva y 10 deudas»; las deudas 4 y 10 se acortaron pero no se podaron.
