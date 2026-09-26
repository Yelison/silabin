# Silabín

Aplicación web para que un niño de **3-4 años que aún no conoce letras** aprenda a leer en
español desde cero: conciencia fonológica, vocales y sílabas CV, con pistas escalonadas,
repaso espaciado, validación por voz y recompensas. Uso principal en iPad/iPhone con Safari,
como PWA; debe funcionar en cualquier navegador moderno. El adulto siempre acompaña.

> **Estado a 2026-09-26:** el núcleo sin interfaz (Plan 1) está terminado y fusionado en
> `main`. Todavía **no hay nada que un niño pueda tocar**: `src/app/page.tsx` sigue siendo la
> plantilla de `create-next-app`. El siguiente paso es escribir el Plan 2.

---

## Índice

1. [Cómo ejecutarlo](#cómo-ejecutarlo)
2. [Documentos y en qué orden leerlos](#documentos-y-en-qué-orden-leerlos)
3. [Arquitectura](#arquitectura)
4. [Lo que ya está hecho: Plan 1](#lo-que-ya-está-hecho-plan-1)
5. [Lo que falta: planes 2 a 6](#lo-que-falta-planes-2-a-6)
6. [Siguientes pasos concretos](#siguientes-pasos-concretos)
7. [Decisiones abiertas](#decisiones-abiertas)
8. [Trampas conocidas para el Plan 2](#trampas-conocidas-para-el-plan-2)
9. [Deuda menor aceptada](#deuda-menor-aceptada)
10. [Cómo se trabaja en este repo](#cómo-se-trabaja-en-este-repo)

---

## Cómo ejecutarlo

Requisitos: Node 22 y pnpm 10 (`packageManager: pnpm@10.33.3`).

```bash
pnpm install
pnpm test        # Vitest: 349 tests + 1 omitido (el de ficheros de audio)
pnpm typecheck   # tsc --noEmit, TypeScript estricto
pnpm lint        # biome check src
pnpm dev         # Next.js; hoy solo muestra la plantilla por defecto
```

Las tres puertas (`test`, `typecheck` y `lint`) están en verde en `main`.

El test omitido comprueba que los ficheros de audio existen en disco en los 3 acentos. Solo
corre con `SILABIN_CHECK_AUDIO_FILES=1`, que se enciende cuando lleguen los audios reales.

Stack real instalado: Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5 estricto,
Tailwind CSS 4, Zod 4, idb-keyval, Vitest 5 y Biome 2.

> **Next.js 16 tiene cambios rompedores respecto a versiones anteriores.** Antes de escribir
> código de Next, lee la guía correspondiente en `node_modules/next/dist/docs/` (ver
> `AGENTS.md`).

El spec también prevé Framer Motion, Zustand, Serwist (PWA), Testing Library y Playwright.
**Aún no están instalados**; llegan con los planes de interfaz.

---

## Documentos y en qué orden leerlos

| Orden | Documento | Qué contiene |
|---|---|---|
| 1 | Este README | Estado, pendientes y siguientes pasos |
| 2 | `docs/superpowers/specs/2026-09-18-silabin-design.md` | **El spec aprobado. Es la autoridad.** Pedagogía, arquitectura, contenido, motor, voz, recompensas, UX y pruebas |
| 3 | `docs/superpowers/2026-09-19-plan-1-registro.md` | Registro de ejecución del Plan 1. Su cabecera lista lo que el Plan 2 debe tener en cuenta. Busca `Ruling` para las decisiones y `minor (deferred)` para lo que se dejó a propósito |
| 4 | `docs/superpowers/plans/2026-09-18-silabin-nucleo.md` | El Plan 1 completo (22 tareas). Útil como plantilla de formato para el Plan 2 y por su hoja de ruta al final |
| 5 | `docs/research/pedagogia-lectura-inicial.md` | Evidencia pedagógica: método fonético-silábico, orden de letras, espejo b/d/p/q |
| 6 | `docs/research/reconocimiento-voz-infantil.md` | Comparativa de reconocimiento de voz infantil; por qué el evaluador `parent` es el del día uno y Azure viene después |

---

## Arquitectura

```
src/
  content/     Currículo como datos, validado con Zod al importar. Sin React.       ✅ hecho
  engine/      Motor: funciones puras, sin React ni DOM.                           ✅ hecho
  store/       Estado persistido: esquema versionado, migraciones, adaptador.      ✅ hecho
  audio/       Locuciones por acento, cola, desbloqueo de AudioContext.            ⏳ Plan 2
  speech/      SpeechEvaluator (parent, browser, azure), VAD, fonemización.        ⏳ Plan 5
  features/    Pantallas: mapa, sesión, celebración, recompensas, padres.          ⏳ Plan 2+
  components/  UI infantil: botones enormes, tarjetas, micrófono, lienzo de trazo. ⏳ Plan 2+
  app/         Rutas Next.js y /api/speech-token.                                  ⏳ solo plantilla
```

**Regla de fronteras:** `features/` y `components/` nunca deciden pedagogía. Solo pintan lo
que ordena `engine/` y le devuelven eventos (acierto, fallo, tiempo). `engine/`, `content/`
y `speech/` (salvo la captura de audio) se prueban sin navegador.

---

## Lo que ya está hecho: Plan 1

Plan 1 = **núcleo de contenido, motor de sesión y persistencia**. 22 tareas ejecutadas con
TDD, revisión por tarea y revisión final de rama. Fusionado en `main` mediante el PR #1
(merge `5859408`, 2026-09-19).

### `src/content/`: el currículo

- **143 ítems** y **21 unidades** en orden topológico:
  - **Fase 0, «Oído de explorador»** (4 unidades, sin texto en pantalla):
    `phase0:clap` (contar sílabas), `phase0:rhyme` (rimas), `phase0:initial` (sonido
    inicial vocálico) y `phase0:hear-it` («¿oyes /a/ en pato?»).
  - **Fase 1, «Las vocales»** (5 unidades, en orden a, e, o, i, u): fonema y letra con el
    par mayúscula/minúscula.
  - **Fase 2, «Las sílabas»** (4 unidades, en orden m, l, s, p): fonema, letra, 5 sílabas y
    palabras CV-CV formadas solo con letras ya vistas.
  - **Fase 3** (8 unidades vacías: t, n, d, r, f, ñ, c, b): solo sirven para que el mapa
    muestre el camino futuro bloqueado.
- **9 plantillas de ejercicio**, cada una con sus 3 pistas (`reduce`, `sound`, `model`):
  `listen-tap`, `hear-it`, `count-syllables`, `rhyme`, `initial-sound`, `build`, `trace`,
  `say-it` y `read-word`. El spec habla de 8; `hear-it` se añadió al planificar.
- **35 imágenes** (`picture:*`): palabra hablada con dibujo, compartidas por las fases 0 y 1.
- **Manifiesto de audio** con todas las claves de contenido y de interfaz (131 locuciones).
- **Invariantes con test:** ids únicos, prerrequisitos acíclicos, texto en minúsculas, nunca
  b/d/p/q juntos, y los cuatro invariantes de las palabras de Fase 2 (solo letras ya
  introducidas, sílabas CV o V, sin vocales adyacentes, tilde solo final y con
  `accented: true`).

Plantillas que declara cada fase:

| Fase | Plantillas |
|---|---|
| 0 | `count-syllables`, `rhyme`, `initial-sound`, `hear-it` (una por unidad) |
| 1 | `initial-sound`, `listen-tap`, `trace`, `say-it` |
| 2 | `listen-tap`, `build`, `trace`, `say-it`, `read-word` |

### `src/engine/`: el motor

Todo se importa desde el barril `@/engine`.

| Módulo | Qué decide |
|---|---|
| `planner.ts` | `planSession`: 5-6 ejercicios, máx. 2 presentaciones, 70 % unidad activa y 30 % repaso, sin plantillas iguales seguidas, cierre fácil, determinista por semilla |
| `leitner.ts` | Cajas 1-3 con intervalos de 1, 3 y 7 sesiones |
| `mastery.ts` | Ítem dominado con 3 aciertos al primer intento en sesiones distintas; unidad completa con ≥ 80 % |
| `unlock.ts` | Estados `locked`/`active`/`done`, `activeUnitId` (devuelve `null` si el currículo se agota) |
| `attempts.ts` | Máquina de intentos: libre → reducir → sonar → modelar; el 3.er rung garantiza acierto (`assisted`) |
| `apply.ts` | `applyPresentation`, `applyResolution`, `applySessionEnd`: aplican resultados sin castigos y con crédito una vez por sesión |
| `distractors.ts` | Opciones incorrectas con regla de espejo, dificultad graduada y **solo de lo que el niño ya ha visto** |
| `stars.ts` | 3, 2 o 1 estrellas por aciertos al primer intento; se guarda la mejor marca |
| `rewards.ts` | 8 logros más hitos de 10, 25, 50 y 100 estrellas |

`session.integration.test.ts` simula 40 sesiones seguidas con tres perfiles de niño y
comprueba que nada retrocede.

Refinamientos del spec que introdujo el Plan 1 (documentados en el plan):

- `ItemProgress.presented` e `ItemProgress.lastCreditSession`.
- `ProgressState.counters`.
- El tipo de ítem `picture`.

### `src/store/`: la persistencia

- `schema.ts`: `PersistedState` versión 1 validado con Zod, atado a los tipos del motor.
  `migrate` rescata el documento **clave por clave** en vez de tirarlo entero si una parte
  está corrupta.
- `persist.ts`: `StorageAdapter` inyectable (idb-keyval en el navegador, memoria en tests),
  `loadState` con recuperación, `saveState` que **devuelve `{ saved: boolean }`**, y
  `exportState`/`importState` en JSON.

### Lo que encontró la revisión final (ya corregido)

- **Crítico:** al terminar la Fase 2, las unidades vacías de Fase 3 se marcaban `done` en
  cascada y el planificador producía basura. Corregido en `a10de1f`.
- Los distractores salían de contenido aún no enseñado. Corregido en `71c2662`.
- `migrate` tiraba el documento entero ante un campo corrupto, y `saveState` fallaba en
  silencio. Corregidos en `15181cc` y `04c9aad`.
- Tres huecos de test demostrados por mutación. Cerrados en `8a4024c`.

---

## Lo que falta: planes 2 a 6

La hoja de ruta original está al final del Plan 1. Esta es una **versión revisada**: el
cambio del Plan 2 está acordado; el reparto de los planes 3 a 6 es una **propuesta que hay
que confirmar con el usuario**.

| Plan | Contenido | Resultado visible |
|---|---|---|
| **2** | Capa `audio/` con `speechSynthesis` como placeholder, estado con Zustand sobre `store/`, pantalla «Toca para empezar», mapa, pantalla de sesión, fin de sesión, y **`count-syllables` de punta a punta** | Un niño juega una sesión real de `phase0:clap` |
| 3 | El resto de plantillas de toque: `rhyme`, `initial-sound`, `hear-it`, `listen-tap` y `build` | Fases 0 y 2 jugables casi completas |
| 4 | `trace`: lienzo, eventos táctiles, puntuación con tolerancia y 3 niveles de guía. Es el componente más difícil del proyecto | Escribir letras con el dedo |
| 5 | Voz: `getUserMedia`, VAD, evaluador `parent` pulido, `say-it` y `read-word` | Leer en voz alta con validación del adulto |
| 6 | Recompensas y cosméticos, panel de padres con PIN, PWA y service worker, lista de verificación en iPad | Primera versión completa |
| Después | Spike de Azure, audios neurales en 3 acentos (`do`, `mx`, `neutro`), evaluador `browser` | Validación automática de pronunciación |

**Por qué el Plan 2 cambia respecto a la hoja de ruta original:** el Plan 1 decía que el
Plan 2 construiría `listen-tap`. Pero la primera unidad jugable del currículo es
`phase0:clap`, que solo declara `count-syllables`, y `listen-tap` no aparece hasta la Fase 1.
Con solo `listen-tap`, el motor planificaría ejercicios que la interfaz no sabe dibujar.
`count-syllables` es de toque puro, sin voz ni trazo, y sus ítems ya traen las opciones en
el dato. (Recomendación acordada el 2026-09-19.)

Además, `hear-it` no aparecía en ningún plan de la hoja de ruta original y es necesaria
para `phase0:hear-it`. La propuesta es llevarla al Plan 3 junto con `listen-tap`, que sale
del Plan 2 (sin confirmar).

**El audio no bloquea nada.** Hasta que existan la cuenta de Azure y los audios reales, la
capa `audio/` usa `speechSynthesis` del navegador detrás de la misma interfaz. Las 131
locuciones × 3 acentos (393 ficheros) se generan después sin rehacer nada.

---

## Siguientes pasos concretos

1. **Resolver las [decisiones abiertas](#decisiones-abiertas)** con el autor del proyecto.
   Afectan al contrato entre el motor y la interfaz.
2. **Escribir el Plan 2** con la skill `superpowers:writing-plans`, a partir del spec, en
   `docs/superpowers/plans/`. El formato de referencia es el Plan 1. Debe cubrir las
   [trampas conocidas](#trampas-conocidas-para-el-plan-2).
3. **Ejecutarlo** con `superpowers:subagent-driven-development` en una rama nueva desde
   `main` (por ejemplo `feat/plan-2-sesion`), en una sesión con `/model sonnet`. Consulta
   [cómo se trabaja](#cómo-se-trabaja-en-este-repo).
4. Llevar el ledger del plan **versionado desde el primer día** en
   `docs/superpowers/<fecha>-plan-2-registro.md` y hacer commit de él al final de cada
   sesión. `.superpowers/` no se versiona y se pierde al cambiar de máquina.
5. Abrir el PR contra `main`.

---

## Decisiones abiertas

Quedaron abiertas **a propósito** porque son de producto y le tocan al autor.

1. **De dónde salen las 35 imágenes** (`img:<palabra>`). El spec no lo dice. Es el único
   hueco de assets que bloquea una interfaz real; el audio tiene placeholder, las imágenes
   no.
2. **Plantillas declaradas que el planificador ignora.** Cuando ninguna de las plantillas
   que declara una unidad acepta la clase del ítem, `planner.ts` (`basePool`) cae a un
   respaldo global en vez de fallar. Hay que decidir si eso es correcto o si debe ser un
   error.
3. **Superficie pública del barril `@/engine`.** Hoy no reexporta lo que la interfaz
   necesitará de `@/content` (`templates`, `TemplateId`, `HintStep`, `Item` y `curriculum`),
   y en cambio expone internos (`owningUnits`, `similarity`, `createRng`, `promote`,
   `demote`, `MASTERY_TARGET`, `REVIEW_SHARE`). Conviene decidirlo antes de programar la
   interfaz contra él.
4. **Qué hacer cuando se agota el currículo** (`activeUnitId` devuelve `null`). Probablemente
   una sesión de solo repaso, pero `planSession` exige una unidad y rechaza una sin ítems.

---

## Trampas conocidas para el Plan 2

Sacadas de la cabecera del registro del Plan 1. Cada una es un bug real si se ignora.

1. **El mapa debe recalcular al cargar.** Si pinta `state.units` tal cual del disco sin
   pasar por `recomputeUnitStatuses`, un documento guardado antes de `a10de1f` mostrará la
   Fase 3 como superada.
2. **`activeUnitId` devuelve `string | null`.** `null` significa currículo agotado; la
   interfaz tiene que manejarlo (ver la decisión abierta 4).
3. **`saveState` devuelve `{ saved: boolean }`.** Un `false` significa que el progreso del
   niño **no se guardó** (cuota agotada, modo privado, almacenamiento desalojado). La
   interfaz tiene que hacer algo con eso; hoy nadie lo mira.
4. **`unitMasteryRatio` devuelve `1` para una unidad vacía.** Una barra de progreso que lo
   lea pintará 100 % sobre una unidad bloqueada de Fase 3. Usa `isUnitComplete`, que
   devuelve `false`.
5. **El historial de sesiones no se escribe.** `applySessionEnd` actualiza contadores y
   mejores marcas, pero no añade nada a `PersistedState.sessions`, porque ese campo vive en
   el store y no en el motor. Añadir el registro de cada sesión terminada es trabajo del
   Plan 2, donde se une el motor con el almacenamiento.
6. **Exportar no tiene interfaz hasta el Plan 6.** `exportState` existe desde el Plan 1,
   pero el panel de padres llega en el Plan 6, y entre medias un niño acumula meses de
   progreso. Valora exponer una exportación mínima antes.
7. **iOS exige un gesto antes de cualquier audio.** La primera pantalla es «Toca para
   empezar» y todo audio pasa por una cola tras ese gesto.
8. **Los tests de componentes necesitan `jsdom`, y no está instalado.** `vitest.config.ts`
   usa `node` por omisión, y cada test de componente declara `// @vitest-environment jsdom`.
   El Plan 2 debe instalar `jsdom` (o `happy-dom`) y Testing Library.

---

## Deuda menor aceptada

Nada de esto bloquea. Está detallado en el registro del Plan 1 (busca `minor (deferred)`).

- Aviso de peer dependency: vitest 5 pide `@types/node@^22` y está instalado `^20`.
- Vitest avisa de que carga `vitest.config.ts` como CommonJS.
- `biome check src` no cubre los ficheros de configuración de la raíz.
- El orden topológico de `content/index.ts` es O(V²); irrelevante con 21 unidades.
- El algoritmo de no adyacencia del planificador tiene una receta estándar más simple
  documentada en el registro (tarea 17).
- `rewards.unlockedAt` no valida que las claves sean logros reales ni que las fechas sean
  ISO.
- `createMemoryAdapter` guarda por referencia, mientras que el adaptador real serializa.
- Las fixtures de tipos solo protegen con `pnpm typecheck`; `vitest` no comprueba tipos.

---

## Cómo se trabaja en este repo

Las reglas completas para agentes están en `CLAUDE.md`. En resumen:

- **Cada plan se escribe con `superpowers:writing-plans`** y **se ejecuta con
  `superpowers:subagent-driven-development`**: un agente implementador por tarea, una
  revisión sobre su diff, rondas de corrección y re-revisión acotada. Al final, una
  revisión de toda la rama.
- **Prueba por mutación en cada revisión de lógica.** Es la técnica que más defectos reales
  ha encontrado aquí.
- **Modo económico, «lento pero seguro»:** la sesión en `/model opus` solo para escribir el
  plan y en `/model sonnet` para ejecutarlo; subagentes en Sonnet salvo la revisión final de
  rama, en Opus. Subagentes en
  secuencia, sesión nueva cada 2-3 tareas, planes con contratos y tests en vez de código
  completo, revisión proporcional al riesgo y máximo 2 rondas de corrección. Detalle en
  `CLAUDE.md`.
- **El coordinador nunca implementa ni commitea código.**
- TDD, TypeScript estricto (`any` solo en el borde de `JSON.parse`, validado con Zod al
  momento), y `test`, `typecheck` y `lint` en verde antes de cada commit.
- Commits con Conventional Commits, en español.
- Los principios pedagógicos del spec (§2) no son negociables en el código: sonido y no
  nombre, sin castigos, pistas de menos a más, dominio antes de avanzar.

Para Claude Code hace falta el plugin **superpowers** (del marketplace oficial
`claude-plugins-official`), porque las skills anteriores vienen de él:

```
/plugin install superpowers@claude-plugins-official
```
