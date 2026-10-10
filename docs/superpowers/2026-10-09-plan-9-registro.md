# Plan 9: registro de ejecución

Rama: `feat/plan-9-mapa-composicion`, creada el 2026-10-09 sobre `feat/plan-8-mapa-camino`
(`1884234`), porque el PR #11 del Plan 8 sigue abierto (D46).
Plan: `docs/superpowers/plans/2026-10-09-silabin-mapa-composicion.md` (5 tareas).
Referencia de diseño: `docs/visual-refactor/map-preview.html` (captura en
`~/qa-silabin/out/mapa/referencia-834.png`; el estado de partida en `chromium-834-base.png`).

Este registro es la memoria del plan y, en su primera parte, **su spec**: las decisiones con el
autor y los rulings de diseño sustituyen al fichero de `specs/` (como en el Plan 8). Al
retomar, léelo primero con `grep -n "^## \|^### "` y el tramo final.

## Estado

| Fase | Estado |
|---|---|
| Decisiones con el autor (D46-D60) | **hechas** (2026-10-09, abajo) |
| Rulings de diseño (prefijo MC) | **fijados** (abajo) |
| Revisión del autor de este spec | **aprobado** (2026-10-09) |
| Redacción del plan | **hecha** (2026-10-09, Opus). Pendiente de la revisión del autor |
| Ejecución | sin empezar. Siguiente: T1 en Sonnet, `/effort medium` |

## Objetivo

Llevar el mapa a la composición completa de la referencia, que D39 y D43 dejaron fuera del
Plan 8: cabecera con wordmark, estrellas y candado; tarjeta de capítulo por fase con su color de
mundo; camino de una columna con ondas en teléfono; pie fijo con «Mis premios», ▶ Jugar y el
compañero; Nunito en la interfaz. Además, la app abre directamente en el mapa, sin pantalla de
inicio.

**Fuera:** que tocar una unidad terminada haga algo (MP15 sigue; cambiaría el motor), el arte
de `public/images/worlds/` (PR #9, aparcado por D40), Nunito en el contenido de lectura y los
colores de mundo fuera de la tarjeta.

## Decisiones tomadas con el autor (2026-10-09)

| # | Decisión |
|---|---|
| D46 | **Rama desde `feat/plan-8-mapa-camino`**, porque el #11 sigue abierto. Si el #11 se fusiona antes del PR del Plan 9, se rebasa sobre `main` |
| D47 | **Nunito solo en la interfaz:** pasa a ser `--font-sans` (cabecera, tarjetas, botones y paneles) con los pesos 600, 700 y 800. Andika se queda en `--font-reading` para letras, sílabas y palabras hasta que el autor vea la «a» de Nunito (D28). Las letras de los nodos son contornos SVG y no cambian |
| D48 | **Colores de mundo solo en la tarjeta de capítulo** (revisa D43 en parte): cada tarjeta lleva la base de su mundo como token nuevo (lila, cielo, melocotón y beis), con el texto en `ink`. El camino, los nodos y el fondo siguen neutros. Es decoración: ningún estado depende de ella |
| D49 | **Camino de una columna con ondas por debajo de 768 px.** Desde 768 px sigue la serpiente de D41 (3 columnas en `md:`, 5 en `lg:`). La rejilla de 2 columnas desaparece |
| D50 | **La tarjeta de capítulo sustituye al separador discontinuo y corta el camino** (MP8 sigue: una serpiente por fase) |
| D51 | **Puerta de padres en un candado visible** a la derecha de la cabecera, con la misma pulsación larga de 3 s (`AdultDoor`). El wordmark deja de ser la puerta |
| D52 | **Sin pantalla de inicio:** la app abre en el mapa. El primer toque que inicia una sesión (nodo o Jugar) desbloquea el audio dentro del gesto y comprueba si hay una actualización esperando, con los tiempos de S11 (1 s y 3 s). `StartScreen` desaparece |
| D53 | **Pie con ▶ y la palabra «Jugar»**, además del nodo amarillo. Tres estados: inicia la activa; 🔁 «Repasar» cuando no queda activa (sustituye al `BigButton` suelto de hoy); inactivo con «Llega en una próxima versión» si la activa no tiene plantilla. La palabra es para el adulto: excepción registrada a «ningún texto para el niño» (MC11) |
| D54 | **El compañero va en el pie, junto a Jugar** (antes en la cabecera) |
| D55 | **«Mis premios» va en el pie, a la izquierda, con icono `gallery` y el texto «Mis premios»**. Conserva su nombre; sin el lila de la referencia |
| D56 | **Estrellas en la cabecera: «★ n» con la barra fina del próximo hito debajo** |
| D57 | **Los puntos de avance van en la tarjeta del capítulo activo** |
| D58 | **Texto de la tarjeta: antetítulo «MUNDO N» y el nombre del spec:** «Oído de explorador», «Las vocales», «Las sílabas» y, para la fase 3, «Más letras». Los nombres pasan a `content/` como dato, con su test |
| D59 | **Solo las estrellas ganadas** (2 estrellas = ★★, sin ☆). Cierra MP4 |
| D60 | **Cabecera y pie fijos; solo se desplaza el camino.** La puerta de padres ya no sale de la vista al centrar la activa, lo que cierra el problema de MP12 |

## Rulings de diseño (prefijo MC)

Cada uno con su porqué y lo que costaría si fuera equivocado.

- **MC1 · Los nodos siguen a 88 px** (`size-22`, MP11). En la referencia miden casi lo mismo
  (unos 86 px a 834); los «nodos mayores» eran la impresión de la columna única. Coste: una
  clase en `MapNode` y el aire de las celdas.
- **MC2 · La tarjeta no lleva icono.** El de la referencia (la nota musical) no tiene función.
  En la tarjeta del capítulo activo, ese hueco lo ocupan los puntos de avance (D57). Coste:
  añadir un icono por mundo y su dato.
- **MC3 · La onda es una función pura, sin medir el DOM** (como MP7). En `serpentine.ts`, la
  columna única asigna a cada nodo una de cuatro posiciones horizontales en ciclo (centro,
  derecha, centro, izquierda). Los conectores son curvas en un SVG en unidades de celda con
  `vector-effect="non-scaling-stroke"`. Los dos trazados (onda y serpiente de 3 y 5) conviven
  con `md:` y `lg:`, como hoy los tres. Coste: si la onda se ve rígida, se cambian las
  posiciones del ciclo.
- **MC4 · Pantalla de alto fijo con zona desplazable interna**, no `position: sticky`. `main`
  ocupa `h-dvh` en tres filas (cabecera, camino con `overflow-y-auto`, pie), y
  `scrollIntoView({ block: "center" })` centra la activa dentro de la zona del camino. Así no
  hay que compensar el solape de lo fijo con `scroll-margin`. Coste: si Safari en iPad da
  problemas con `dvh` o con el desplazamiento interno, se pasa a `sticky` con
  `scroll-padding`.
- **MC5 · «MUNDO N» es la fase + 1** (la fase 0 es el «Mundo 1»). El número es para el adulto,
  que no cuenta desde cero. Coste: una suma.
- **MC6 · Los nombres de mundo viven en `content/`** como un registro por número de fase. Un
  invariante comprueba que toda fase del currículo tiene nombre. Coste: si el autor los quiere
  cambiar, es un dato.
- **MC7 · Arranque: `unlock` en cada inicio, la comprobación de actualización solo en el
  primero.** `unlock` es idempotente y barato. La comprobación (S11) solo tiene sentido antes de
  la primera sesión de cada apertura: después, la app «ya está en marcha». La lógica sale de
  `StartScreen` a un gancho de `features/start/` que usa `App`. Sus casos de test se portan
  (sin actualización; con actualización y recarga; la recarga que no llega en 3 s; la
  comprobación que tarda más de 1 s; el error). Coste: si el autor quiere comprobar en cada
  inicio, es quitar una bandera.
- **MC8 · El wordmark tiene token propio**, un ámbar oscuro que pase CO1 sobre `card` como texto
  grande (≥ 3 : 1). El de la referencia da menos. El ✦ va en `calm-border`. Coste: un token.
  **Ajustado al escribir el plan:** se exige 4,5 : 1 (par de texto normal en `tokens.test.ts`)
  para no abrir una categoría de «texto grande» en CO1. Coste: un ámbar algo más oscuro que la
  referencia.
- **MC9 · El compañero del pie mide 72 px, y 56 px en `apaisado-bajo:`** (teléfono en horizontal,
  donde el alto manda). No es un objetivo táctil. Coste: dos clases.
- **MC10 · `SavedMark` no se mueve** (flotante, `z-20`). La pasada visual comprueba que no pisa
  el candado; si lo pisa, baja bajo la cabecera. Coste: una clase.
- **MC11 · Excepción de texto:** «Jugar», «Repasar» y «Mis premios» llevan una palabra pequeña
  junto al icono, para el adulto. El icono es lo que el niño entiende; la palabra coincide con
  el `aria-label`. Se añade a la skill como excepción explícita. Coste: quitar el texto.
- **MC12 · El estado «soon» del botón Jugar** (activa sin plantilla) se ve con ▶ y «Jugar»
  atenuados (opacidad del contenido, no del botón, LE1-LE5). Lleva `aria-disabled` y el
  `aria-label` «Llega en una próxima versión». Nunca `disabled` (MP1). Coste: ninguno.
- **MC13 · Clases de Tailwind literales** para los colores de mundo: un registro fase → clase
  (`bg-world-0`…), nunca una clase compuesta en tiempo de ejecución (E4). Coste: ninguno.
- **MC14 · Cabecera y pie en `bg-card` opaco; el camino sigue en su panel `bg-surface`** (MP10,
  V13). El fondo equipado se ve en los márgenes, como hoy. Coste: si el autor quiere ver más el
  fondo, hay que revisar LE1.

- **MC15 · Con una actualización esperando, el primer Jugar recarga y vuelve al mapa sin
  sesión.** Antes la recarga salía de la pantalla de inicio, donde ya se esperaba un segundo
  toque. Se acepta: pasa como mucho una vez por actualización. Va a I17. Coste si es
  inaceptable: comprobar la actualización al montar el mapa, antes de cualquier toque.
- **MC16 · Sin `font-weight: 600` en `body`.** Andika (400 y 700) heredaría un 600 y pasaría a
  negrita en los nueve sitios de lectura. El suelo de 600 de Nunito sale solo, porque solo se
  cargan sus caras 600-800. Coste: ninguno.

## Reparto de tareas (provisional; lo fija el plan)

| Tarea | Contenido | Riesgo | Effort | Revisión |
|---|---|---|---|---|
| T1 | Datos y tokens: nombres de mundo en `content/` con su invariante, tokens de mundo y del wordmark con su contraste, Nunito como `--font-sans` | datos, tokens y configuración | `medium` | cumplimiento, sin mutación |
| T2 | Arranque sin `StartScreen`: el gancho del primer toque, `App` abre en el mapa, tests portados y e2e que pulsaban «Empezar» | contrato de arranque (audio y PWA) | `high` | completa, 3-5 mutaciones |
| T3 | Camino: onda de una columna en teléfono, tarjetas de capítulo con puntos de avance y estrellas sin ☆ | lógica nueva del mapa | `high` | completa, 3-5 mutaciones |
| T4 | Cabecera y pie fijos: candado, ★ con barra, Jugar con sus tres estados, compañero, «Mis premios» y MP12 en la zona desplazable | contrato motor-interfaz del mapa | `high` | completa, 3-5 mutaciones |
| T5 | Skill, `diseno-visual.md`, checklist del iPad, README y poda | docs | `medium` | cumplimiento |

Los implementadores de T3 y T4 cargan `silabin-design` y `frontend-design:frontend-design`.
Después vienen la revisión final de la rama en Opus (`high`) y la pasada visual con
`~/qa-silabin` (webkit y chromium a 320, 390, 834 y 1194 px).

## Progreso de ejecución

| Tarea | Estado | Rondas | Mutaciones que sobreviven |
|---|---|---|---|
| T1 | completa (f875024, revisión limpia) | 0 | n/a (sin mutación) |
| T2 | completa (de5622a, revisión limpia) | 0 | 0 de 6 (implementador) + 6 propias del revisor, 0 sobreviven |
| T3 | completa (32a237d, revisión limpia) | 0 | 0 de 5 (implementador) + 10 de 12 propias del revisor mueren; M7 y M8 solo las ve un navegador (e2e) |
| T4 | sin empezar | | |
| T5 | sin empezar | | |

## Ejecución

### T1 (sesión 1)
- Task 1: complete (commits 469a0f7..f875024, review clean).
- Ruling: `--color-brand` = #a86300 (4,72 : 1 sobre card); #b86f13 da 3,95. Si es erróneo, cuesta cambiar un token.
- Auditoría FN3: ningún texto de lectura sin `font-reading`; FN3 añadido sobre `OptionCard`.
- Task 1: minor (deferred): regex del className en `layout.test.ts` frágil ante clsx; `tokens.test.ts:202` repite el id «CO1»; no se abrió `count-syllables/Evaluation.tsx:43` para confirmar que `silabas` no se pinta.

### T2 (sesión 1)
- Task 2: complete (commits c7a9b84..de5622a, review clean). Effort `high`.
- Task 2: minor (deferred): `empezar` llama a `onStart` sin mirar la pantalla; si en el 1 s de la primera comprobación (3 s con actualización esperando) el niño abre Premios o Panel, lo saca de allí a la sesión. Improbable, una vez por apertura.
- Task 2: minor (deferred): el test «sin vista registrada» de `App.test.tsx` (~l.118) espera 50 ms con aserción negativa; sustituir por `waitFor` sobre algo observable.
- Task 2: minor (deferred): ningún test de `App` protege la colocación del gancho en `Screens` (fuera de la rama `"map"`, MC7); no automatizable sin inyectar `serviceWorker`.
- Task 2: minor (deferred): comentario desfasado «Toca para empezar» en `src/audio/types.ts:20`.
- Ruling: los cuatro minors de T2 se difieren al triaje de la revisión final. Si el primero resulta importante, cuesta una guarda `screen !== "map"` en `empezar`.
- I17 (README) no existe: el cierre del plan (T5) debe decidir si lo crea o lo omite.

### T3 (sesión 2)
- Task 3: complete (commits 484ed64..32a237d, review clean, 0 rondas). Effort `high`. pnpm test 1470 verdes, typecheck y lint limpios, e2e `mapa.spec.ts` 24/24.
- Ruling: borde de la tarjeta = `border-node-locked-depth` (lo sugería el brief; sin opacidad). Casi no se distingue sobre `world-3` y `bg-surface` (≈ 1,1-1,3 : 1). Es decoración (D48). Se decide en la pasada visual de T4: un token por mundo o uno más oscuro. Cuesta una clase.
- Ruling: el e2e «ficha a la altura de su vecina» compara el centro de la ficha con el de su celda (con la onda los vecinos ya no comparten fila). Sigue detectando que las estrellas empujen la ficha.
- Ruling: `bg-world-N` no cuenta como superficie para `legibility.test.tsx`; el contraste `ink` sobre `world-0..3` ≥ 7 : 1 ya lo cubre `tokens.test.ts:141-147` (T1).
- Task 3: minor (deferred): `e2e/mapa.spec.ts` (~l.96-103) `closest("[data-unit]")?.parentElement ?? e` cae al propio `span` si cambia el DOM y el test pasaría sin proteger; mejor lanzar error.
- Task 3: minor (deferred): `ChapterCard.test.tsx:215-221` no comprueba el token del borde.
- Task 3: minor (deferred): ST1 con 3 estrellas pasa sin implementación; quien mata el regreso de ☆ es N5 (2 estrellas) y «una unidad terminada muestra sus mejores estrellas». No presentarlo como cobertura.
- Task 3: minor (deferred): M7 (`--cb/--rb`) y M8 (capa base visible en md) solo mueren en e2e; ese e2e es la única red ahí. Recordarlo al cerrar el plan.
- Task 3: minor (deferred): sin pasada visual real (390/834) de la tarjeta y la onda: ritmo de 9 rem por fila y borde. Va a la pasada visual de T4.
- Task 3: minor (deferred): `silabin-design` y el spec aún dicen «2 columnas en teléfono», «☆ las que faltan» y separador; es el trabajo de T5. El sitio de `UnitDots` en la cabecera queda libre hasta T4.

### T4 (sesión 3)
- Task 4: implementación b2ee3bf (base ae3feeb), DONE_WITH_CONCERNS. Effort `high`. pnpm test 1484 verdes, e2e mapa+offline 32/32. `MapScreen.tsx` 311 → 224 líneas. 5 mutaciones del implementador mueren (la 3 solo por PI3; LE6 no la ve porque el pie es `bg-card` opaco).
- Revisión de T4: spec ✅, calidad con 2 Important y minors. 9 de 13 mutaciones propias del revisor mueren; sobreviven `chapter-edge` revertido, wordmark sin `text-brand`, pie sin `bg-card` y compañero `size-8` (todas por falta de test de clase).
- Task 4: fix round 1/2 abierta: Important (1) los e2e de «sin scroll horizontal», LY3 y LY4 miden `documentElement.scrollWidth` y no ven el desbordamiento dentro de la zona `overflow-y-auto`; (2) `bg-card` del pie sin test (MC14). Más tests de clase para las cuatro mutaciones que sobreviven.
- Ruling: `SavedMark` pasa al flujo de la cabecera, junto al wordmark, y deja de ser flotante. **Enmienda MC10**: fijo a la izquierda (`fixed top-2 left-2`) tapaba el wordmark, y «bajar bajo la cabecera» no lo resolvía. Lo protege CB4. Si es erróneo, cuesta devolverlo a flotante y mover el wordmark.
- Ruling: borde de la tarjeta de capítulo = token nuevo `chapter-edge` (#b4aebd, 1,4-2,0 : 1) en vez de `border-node-locked-depth` (decidido en la pasada visual, como pedía el ruling de T3). Cuesta un token y una clase.
- Ruling: `MapHeader` recibe `avisoAdulto` (deja `pr-12`) porque LY4 detectó que `SaveWarning` pisaba el candado a 320 (aviso x276, candado x260); `MapScreen` lo calcula como `saveFailed || recovered || readFailed`, igual que `SaveWarning.tsx:24`. `BigButton` gana `compact` (72 px) porque un override por `className` no vence a `min-h-24`. `Companion` encoge con `className`.
- Deuda de T3 cerrada: el selector de `e2e/mapa.spec.ts` ya lanza error si no hay celda.
- Task 4: minor (deferred): sin `safe-area-inset-bottom` en el pie.
- Task 4: minor (deferred): a 320 de ancho «Mis premios» parte en dos líneas.
- Task 4: minor (deferred): sin medir `recovered` + ✓ de guardado a 320.
- Task 4: minor (deferred): LY2 no mide `pie.r`.
- Task 4: minor (deferred): `docs/diseno-visual.md` y la skill `silabin-design` desfasados (tokens `brand`, `world-*`, `chapter-edge`; «puerta = el logo»). Es trabajo de T5.
- Task 4: pasada visual con Chromium y WebKit emulado (iPad Pro 11) a 6 tamaños, capturas en `~/qa-silabin/out/t4/`. No sustituye iPad real.
