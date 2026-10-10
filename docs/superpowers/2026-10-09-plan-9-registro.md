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
| T1 | sin empezar | | |
| T2 | sin empezar | | |
| T3 | sin empezar | | |
| T4 | sin empezar | | |
| T5 | sin empezar | | |

## Ejecución
