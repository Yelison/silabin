# Silabín

Aplicación web para que un niño de **3-4 años que aún no conoce letras** aprenda a leer en
español desde cero: conciencia fonológica, vocales y sílabas CV, con pistas escalonadas,
repaso espaciado, validación por voz y recompensas. Uso principal en iPad/iPhone con Safari,
como PWA; debe funcionar en cualquier navegador moderno. El adulto siempre acompaña.

> **Estado a 2026-09-29:** el núcleo (Plan 1, PR #1), la primera sesión jugable (Plan 2, PR #3),
> la Fase 0 (Plan 3, PR #4), `trace` (Plan 4, PR #5), la voz (Plan 5) y lo funcional del Plan 6
> (PR #7: panel de padres con PIN, ajustes, importar, trazo en minúsculas, recompensas, avance en
> el mapa, PWA y e2e) están fusionados en `main`. Hoy son jugables las tres fases. El **Plan 7**
> (identidad visual) está **ejecutado en su rama** `feat/plan-7-identidad-visual`, sin fusionar:
> el arte del loro y el elefantito, los fondos, las pegatinas, los iconos y la paleta final ya
> están integrados, y `docs/checklist-ipad.md` está escrita. **Faltan**: la revisión final de la
> rama, el despliegue en Vercel y la prueba del autor con esa lista
> (nada de eso se ha hecho: D29, D35), y el PR. La **boca sigue esquemática** (las bocas
> se aplazaron). 1394 tests (1 omitido), y `typecheck`, `lint`, `pnpm build` y `pnpm e2e` en
> verde.

---

## Índice

1. [Cómo ejecutarlo](#cómo-ejecutarlo)
2. [Documentos y en qué orden leerlos](#documentos-y-en-qué-orden-leerlos)
3. [Arquitectura](#arquitectura)
4. [Lo que ya está hecho: Plan 1](#lo-que-ya-está-hecho-plan-1)
5. [Lo que ya está hecho: Plan 2](#lo-que-ya-está-hecho-plan-2)
6. [Lo que ya está hecho: Plan 3](#lo-que-ya-está-hecho-plan-3)
7. [Lo que ya está hecho: Plan 4](#lo-que-ya-está-hecho-plan-4)
8. [Lo que ya está hecho: Plan 5](#lo-que-ya-está-hecho-plan-5)
9. [Lo que ya está hecho: Plan 6](#lo-que-ya-está-hecho-plan-6)
10. [Lo que ya está hecho: Plan 7](#lo-que-ya-está-hecho-plan-7)
11. [Lo que falta: después del Plan 7](#lo-que-falta-después-del-plan-7)
12. [Siguientes pasos concretos](#siguientes-pasos-concretos)
13. [Decisiones tomadas](#decisiones-tomadas)
14. [Trampas conocidas](#trampas-conocidas)
15. [Deuda menor aceptada](#deuda-menor-aceptada)
16. [Cómo se trabaja en este repo](#cómo-se-trabaja-en-este-repo)

---

## Cómo ejecutarlo

Requisitos: Node 22 y pnpm 10 (`packageManager: pnpm@10.33.3`).

```bash
pnpm install
pnpm test        # Vitest: 1394 tests (1 omitido: el de ficheros de audio)
pnpm typecheck   # tsc --noEmit, TypeScript estricto
pnpm lint        # biome check src e2e
pnpm dev         # Next.js: la aplicación, con las Fases 0, 1 y 2 jugables
pnpm e2e         # Playwright (Chromium, viewport de iPhone): construye y arranca en el 3100
```

Las tres puertas (`test`, `typecheck` y `lint`), `pnpm build` y `pnpm e2e` están en verde en la
rama del Plan 7.

**`pnpm e2e`** ejecuta `pnpm build && pnpm start -p 3100` por su cuenta (o reutiliza un servidor
ya levantado en ese puerto si no hay `CI`: si cambias código, páralo o el e2e probará el build
viejo) y corre J1-J4 (`e2e/`): una sesión de la Fase 1 con trazos por toques (J1), el trazo en
minúscula (J2), el panel de padres (J3) y el arranque sin red con service worker (J4). La primera
vez hace falta `pnpm exec playwright install chromium`. `J1`/`J2` fijan la semilla 7 del
planificador (S22): si `trazosDibujados` sale a 0, algo nuevo consume `Math.random` y hay que
buscar otra semilla. WebKit está previsto (`PW_WEBKIT=1`) pero sin probar.

**Probar desde otro dispositivo en la red local** (móvil o tableta, para la prueba manual de
`trace`): `DEV_ORIGINS=<ip-lan> pnpm dev -H 0.0.0.0`, con la IP sola, sin esquema ni puerto.
Next 16 bloquea en desarrollo las peticiones de origen cruzado a sus recursos de dev; sin
`DEV_ORIGINS` la página se pinta pero **no se hidrata** (el lienzo no respondería, y parecería
un fallo de las constantes de trazo en vez de un artefacto del arnés).

**Probar la voz desde un móvil o una tableta.** `getUserMedia` (el micrófono) solo funciona en
un **contexto seguro**: `https://` o `localhost`. El `http://<ip-lan>` de arriba **no lo es**, así
que desde el móvil el micrófono no se abriría y las vistas de voz caerían a los botones del
adulto (P4), lo que parece que «no funciona». La versión de Next instalada trae
`next dev --experimental-https`, pero **su certificado automático solo cubre `localhost`,
`127.0.0.1`, `::1` y el valor de `-H` (`0.0.0.0`), nunca la IP de la LAN**: desde
`https://<ip-lan>:3000` el nombre no coincidiría. Hay que generar el certificado a mano con
[`mkcert`](https://github.com/FiloSottile/mkcert) incluyendo la IP y pasárselo a Next
(`--experimental-https-key` y `--experimental-https-cert`; ver
`node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`):

```bash
mkdir -p certificates && cd certificates   # ya ignorado por git
mkcert -install                            # una vez: crea la CA raíz local
mkcert -key-file lan-key.pem -cert-file lan.pem <ip-lan> localhost 127.0.0.1
cd ..
DEV_ORIGINS=<ip-lan> pnpm dev --experimental-https \
  --experimental-https-key ./certificates/lan-key.pem \
  --experimental-https-cert ./certificates/lan.pem -H 0.0.0.0
# y en el móvil: https://<ip-lan>:3000
```

El móvil no confía por defecto en esa CA: hay que instalar y activar la CA raíz de `mkcert`
(`rootCA.pem`, en `mkcert -CAROOT`) en el dispositivo, o aceptar el aviso de Safari (sin la CA
el aviso puede repetirse). Sin HTTPS, o con `http://<ip-lan>`, la página carga pero el
micrófono no. **WSL2:** con la red en modo NAT el móvil puede no alcanzar el servidor; hace
falta un `portproxy` de Windows (`netsh interface portproxy add v4tov4 ...`) o poner WSL2 en
red *mirrored*. No se ha probado con un móvil real (ver la deuda 1).

**`/dev/plantillas`** (solo con `pnpm dev`; en producción da 404): un selector de plantilla e
ítem que monta la presentación y la evaluación con un ejercicio planificado por el motor, y
botones para simular el rung 1, 2 o 3 y el bloqueo. Sirve para ver cada plantilla suelta,
incluidas `say-it` y `read-word` (con la opción «Micrófono real»), sin jugar una sesión.

**`/dev/arte`** (solo con `pnpm dev`; en producción da 404): una hoja con todo el arte del Plan
7 (compañeros con y sin gorra, fondos con piezas del mapa encima, pegatinas, partículas, iconos y
la boca esquemática) y la paleta con sus ratios de contraste. Sirvió para que el autor aprobara
la paleta y sirve para revisar el arte de un vistazo.

**`scripts/optimizar-arte.py`** (Plan 7, V2): convierte los **27 PNG** del arte que genera el
autor en las 31 salidas de `public/` (WebP para lo que pinta un `<img>`, PNG para los iconos de
interfaz, los cursores y los iconos de la app). Uso:
`python3 scripts/optimizar-arte.py <carpeta-origen> [--destino <raíz>]`. Valida todo antes de
escribir (si algo falla no toca ni un fichero), recorta al centro y no amplía. Con `method=6`
sobre `/mnt/c` es lento: lánzalo en segundo plano. Los tests del script están en
`scripts/test_optimizar_arte.py` (~30 s). Genera también las seis bocas, que no se
publican: si caen en `public/`, FI2 falla (`BOCAS_PUBLICADAS`). El arte va a `public/images/arte/` y los iconos a
`public/icons/`. Los originales no se versionan.

El test omitido comprueba que los ficheros de audio existen en disco en los 3 acentos. Solo
corre con `SILABIN_CHECK_AUDIO_FILES=1`, que se enciende cuando lleguen los audios reales.

Stack real instalado: Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5 estricto,
Tailwind CSS 4, Zod 4, Zustand 5, idb-keyval, Vitest 5 con jsdom y Testing Library, Biome 2,
Serwist con Turbopack (PWA, ver más abajo), Framer Motion y Playwright.

> **Next.js 16 tiene cambios rompedores respecto a versiones anteriores.** Antes de escribir
> código de Next, lee la guía correspondiente en `node_modules/next/dist/docs/` (ver
> `AGENTS.md`).

Framer Motion (`motion`, celebraciones y rastro del dedo) y Playwright (e2e) entraron con el
Plan 6 (D30).

### La PWA: instalación y actualización

`pnpm dev` sirve la app sin service worker (`SerwistProvider` lleva `disable` en desarrollo:
un SW cacheando confundiría los cambios en caliente con una app que no se actualiza). El
service worker solo existe con `pnpm build && pnpm start` (abre `http://localhost:3000`; en
DevTools → Application → Service Workers debe verse activado, y con «Offline» marcado la app
sigue arrancando), o en un despliegue real (ver
`docs/despliegue-vercel.md`, que además es lo único que tiene que hacer el autor a mano —
ningún agente despliega).

- **Se instala** desde el navegador (en iPad/iPhone, Safari → Compartir → «Añadir a pantalla
  de inicio»). El icono y el nombre salen de `src/app/manifest.ts`.
- **Funciona sin red:** la primera carga con red precachea la app, las ilustraciones de las
  palabras y los iconos (`src/app/sw.ts` y el route handler en
  `src/app/serwist/[path]/route.ts`). Una navegación sin red después sirve `/` precacheado en
  vez de fallar. Los audios (`speechSynthesis`) no se precachean: no son ficheros propios.
- **Cómo se actualiza:** sin `skipWaiting` automático (S11 del Plan 6) — un service worker
  nuevo que tomara el control a mitad de una sesión rompería la carga de fragmentos ya en
  curso. Cuando hay una versión nueva esperando, tocar «Toca para empezar» en la pantalla de
  inicio (`src/features/pwa/update.ts` + `StartScreen`) le pide que tome el control y recarga
  la página una vez, antes de empezar nada. Nunca pasa a mitad de una sesión.
- Los iconos (`public/icons/app-192.png`, `app-512.png`, `apple-touch-icon.png`) son el **loro**
  del Plan 7, que sustituye a la «S» provisional (S13). `app-512.png` se declara también
  `maskable`, aunque el loro ocupa cerca del 81 % del cuadro (Ruling del icono en el ledger): una
  máscara circular podría recortar plumas del contorno. Se comprueba en `docs/checklist-ipad.md`.

---

## Documentos y en qué orden leerlos

| Orden | Documento | Qué contiene |
|---|---|---|
| 1 | Este README | Estado, pendientes y siguientes pasos |
| 1b | `docs/superpowers/2026-09-28-plan-6-registro.md` | Registro del Plan 6 (padres, recompensas, PWA, e2e). Busca `Ruling` y `minor (deferred)`, y la **lista de la prueba manual del autor** |
| 1b2 | `docs/superpowers/2026-09-29-plan-7-registro.md` | Registro del Plan 7 (identidad visual): D32-D36, rulings V1-V16 y de tarea, la tabla de progreso y el estado final. Busca `Ruling` y `minor (deferred)` |
| 1b3 | `docs/superpowers/plans/2026-09-29-silabin-identidad-visual.md` | El Plan 7 (6 tareas): arte, compañeros, paleta y checklist, con los rulings V1-V16 |
| 1c | `docs/arte-plan-7-prompts.md` | Los prompts del arte del Plan 7 (compañeros, fondos, pegatinas, bocas, iconos). Integrado salvo la sección 5 (la boca), que queda por rehacer |
| 1d | `docs/despliegue-vercel.md` | Pasos del despliegue (D29), que hace el autor a mano |
| 1e | `docs/checklist-ipad.md` | **La lista de verificación del autor** (spec §10, D35): iPad, iPhone, PWA instalada y PC, con la prueba manual del Plan 6 dentro. Se pasa una vez sobre el despliegue final |
| 2 | `docs/superpowers/specs/2026-09-18-silabin-design.md` | **El spec aprobado. Es la autoridad.** Pedagogía, arquitectura, contenido, motor, voz, recompensas, UX y pruebas |
| 3 | `docs/superpowers/2026-09-27-plan-5-registro.md` | Registro de ejecución del Plan 5 (la voz). Busca `Ruling` y `minor (deferred)`, y la lista de la prueba manual del autor. Es la memoria de la rama `feat/plan-5-voz` |
| 4 | `docs/superpowers/plans/2026-09-28-silabin-voz.md` | El Plan 5 (7 tareas): `say-it`, `read-word` y el turno de voz, con los rulings P1-P15 y las decisiones D19-D23 |
| 5 | `docs/superpowers/2026-09-27-plan-4-registro.md` | Registro de ejecución del Plan 4 (`trace`). Busca `Ruling` y `minor (deferred)` |
| 6 | `docs/superpowers/plans/2026-09-27-silabin-trazo.md` | El Plan 4: la plantilla `trace`, con las decisiones D12-D18 |
| 7 | `docs/superpowers/2026-09-26-plan-3-registro.md` | Registro de ejecución del Plan 3. Busca `Ruling` para las decisiones y `minor (deferred)` para lo que se dejó a propósito. Es la memoria de la rama `feat/plan-3-plantillas-toque` |
| 8 | `docs/superpowers/plans/2026-09-26-silabin-plantillas-toque.md` | El Plan 3 (tareas 1-6, con la 5b): base visual, plantillas de toque y Fase 0 de punta a punta, con las decisiones D8-D11 al principio |
| 9 | `docs/diseno-visual.md` | Investigación de diseño para niños de 3 a 6 años, tabla de tokens, paleta final derivada del arte (Plan 7) y reglas visuales (D8). Recoge la decisión del autor sobre los ★ |
| 10 | `docs/ilustraciones-prompts.md` | Los prompts de las 65 ilustraciones y los 6 iconos (estilo 3D suave tipo juguete); es la plantilla de `arte-plan-7-prompts.md` |
| 11 | `docs/superpowers/2026-09-26-plan-2-registro.md` | Registro de ejecución del Plan 2 (12 rulings, R1-R12). Busca `Ruling` para las decisiones y `minor (deferred)` para lo que se dejó a propósito |
| 12 | `docs/superpowers/plans/2026-09-26-silabin-sesion.md` | El Plan 2 (9 tareas): sesión jugable de `count-syllables`, con las decisiones D1-D7 al principio |
| 13 | `docs/superpowers/2026-09-19-plan-1-registro.md` | Registro de ejecución del Plan 1. Busca `Ruling` y `minor (deferred)` |
| 14 | `docs/superpowers/plans/2026-09-18-silabin-nucleo.md` | El Plan 1 completo (22 tareas) y la hoja de ruta original al final |
| 15 | `docs/research/pedagogia-lectura-inicial.md` | Evidencia pedagógica: método fonético-silábico, orden de letras, espejo b/d/p/q |
| 16 | `docs/research/reconocimiento-voz-infantil.md` | Comparativa de reconocimiento de voz infantil; por qué el evaluador `parent` es el del día uno y Azure viene después |
| 17 | `docs/archivo-trampas-y-deuda.md` | Texto completo de las trampas y la deuda podadas del README; no se lee al retomar |

---

## Arquitectura

```
src/
  content/     Currículo como datos, validado con Zod al importar. Sin React.       ✅ hecho
  engine/      Motor: funciones puras, sin React ni DOM.                           ✅ hecho
  store/       Estado persistido, store de Zustand y puente con el motor.          ✅ hecho
  audio/       Interfaz AudioPlayer; placeholder con speechSynthesis y cola.       🟡 en parte (Planes 2-3)
  images/      Ilustraciones de las palabras: WebP (65) y emoji de respaldo.       ✅ hecho (Plan 3)
  speech/      Evaluador `parent`, captura de micrófono con VAD, `speechTarget`.   🟡 en parte (Plan 5)
  features/    Inicio, mapa, sesión (7 plantillas), fin, aviso, exportar.        🟡 en parte (Planes 2-5)
  components/  UI infantil: BigButton, OptionCard, Picture, ArtImage, Icon, Mouth.  🟡 en parte (Planes 3-7)
  app/         App, /dev/plantillas, /dev/arte, PWA; falta /api/speech-token.       🟡 en parte (Planes 3-7)
```

El arte del Plan 7 (compañeros, fondos, pegatinas, partículas e iconos nuevos) **no pasa por
`images/`**: vive en `public/images/arte/` y `public/icons/`, lo traduce `features/rewards/visuals.ts`
(el único sitio que lo hace, S21) y lo pinta `components/ArtImage`, con emoji o degradado de
respaldo si el fichero no carga (V7). `images/` sigue siendo solo las 65 ilustraciones de palabras.

**Regla de fronteras:** `features/` y `components/` nunca deciden pedagogía. Solo pintan lo
que ordena `engine/` y le devuelven eventos (acierto, fallo, tiempo). `engine/`, `content/`
y `speech/` (salvo la captura de audio) se prueban sin navegador. `features/` y
`components/` importan solo los barriles `@/engine`, `@/speech`, `@/store` y `@/audio`, nunca
`@/content` ni un módulo interno; `src/features/boundaries.test.ts` lo hace cumplir.

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

## Lo que ya está hecho: Plan 2

Plan 2 = **primera sesión jugable de `count-syllables`** (9 tareas, ledger en
`docs/superpowers/2026-09-26-plan-2-registro.md`). Fusionado en `main` mediante el PR #3. La
revisión final de rama (Opus) corrigió sus hallazgos (I1-I3, M1; ver el ledger).

- **Motor:** `engine/session.ts` (corrida de sesión pura: plan, intentos, resoluciones y
  cierre); sesión de solo repaso cuando se agota el currículo (`planReviewOnly`); `basePool`
  lanza en vez de caer a un respaldo; el barril `@/engine` está podado y reexporta lo que la
  interfaz necesita.
- **Store:** `createAppStore` (Zustand) guarda tras cada paso; `progress-bridge.ts` une el
  progreso del motor con el documento persistido y escribe el historial de sesiones; barril
  `@/store`.
- **`audio/`:** interfaz `AudioPlayer` (cola, `beat()` para el golpe del tambor), reproductor
  con `speechSynthesis` y reproductor silencioso.
- **`images/`:** `imageFor` con emoji para las 65 claves `img:` del currículo.
- **Interfaz:** `StartScreen` («Toca para empezar»), `MapScreen`, `SessionScreen`,
  `EndScreen`, y las vistas de `count-syllables` (presentación con luces por sílaba, tambor y
  pistas 1-2-3). `SaveWarning` avisa al adulto si no se guardó, y `ExportGesture` exporta el
  progreso manteniendo pulsado el logo 3 s.
- Al acabar el Plan 2 solo `phase0:clap` era jugable. El mapa atenúa las unidades cuyas
  plantillas aún no tienen vista (`isSessionPlayable`).

---

## Lo que ya está hecho: Plan 3

Plan 3 = **el resto de plantillas de toque y la base visual**, en la rama
`feat/plan-3-plantillas-toque` (tareas 1-6 con la 5b; ledger en
`docs/superpowers/2026-09-26-plan-3-registro.md`). Cada tarea pasó revisión; falta la revisión
final de la rama y el PR. Resultado: **la Fase 0 entera es jugable** (`phase0:clap`,
`phase0:rhyme`, `phase0:initial` y `phase0:hear-it`), con 817 tests (1 omitido).

- **Base visual (D8):** tokens de color, tipografía (Andika), radios y tamaño de objetivo en
  `src/app/globals.css`; componentes `OptionCard`, `Picture`, `ReplayButton` y `Icon`. La
  investigación y la tabla de tokens están en `docs/diseno-visual.md`. Tema claro fijo.
- **Audio:** `pickVoice` elige mejor voz del dispositivo (primero el acento, después la
  calidad) y la pausa entre sílabas tiene en cuenta la latencia de las voces «Natural» de red
  de Edge, que alargaba «ga ····· to» en la prueba manual del Plan 2.
- **Motor y contenido:** `engine/answers.ts` (`expectedAnswer`, `expectedPieces`,
  `reducedPieces`), `content/audio-keys.ts`, `rimeOf` y los ítems orales que necesitan
  `rhyme`, `initial-sound` y `hear-it`; el invariante M11 comprueba que cada plantilla de toque
  resuelve `correct` para cada ítem que acepta.
- **Interfaz:** `ChoiceEvaluation` (cuerpo común de `rhyme` e `initial-sound`), `hear-it`,
  `listen-tap` (par minúscula-mayúscula en cada letra) y `build` (tocar **o** arrastrar las
  piezas).
- **Ilustraciones e iconos reales (Tarea 5b):** 65 WebP en `public/images/palabras/` y 6 PNG
  en `public/icons/`, generados con `scripts/optimizar-ilustraciones.py` a partir de las
  ilustraciones originales; `Picture` e `Icon` usan `<img>` y, si la imagen no carga, `Picture`
  cae al emoji de respaldo.
- **Cierre (Tarea 6):** una prueba de integración con vistas, motor y store reales juega la
  Fase 0 de punta a punta (incluido un fallo a propósito en cada rung hasta el modelo), y la
  ruta `/dev/plantillas` (solo en desarrollo; 404 en producción) muestra `listen-tap` y `build`.
- Solo la Fase 0 es jugable: las unidades de la Fase 1 y la 2 declaran `trace` y `say-it`
  (y la 2 también `read-word`) y el mapa las atenúa hasta los Planes 4 y 5 (D10).

---

## Lo que ya está hecho: Plan 4

Plan 4 = **la plantilla `trace`: escribir letras con el dedo**, en la rama
`feat/plan-4-trace` (6 tareas; ledger en `docs/superpowers/2026-09-27-plan-4-registro.md`).
Cada tarea pasó revisión, y también la revisión final de la rama (Opus): devolvió "con
correcciones", y los hallazgos de código de esa revisión (la flecha estática tapando el
marcador de inicio en O/L/E/M, y la pista 2 sin respaldo visual quieto bajo movimiento
reducido en niveles de guía 2 y 3) ya están resueltos en el mismo commit del fix wave. La
prueba manual del autor en un dispositivo táctil real también se hizo (ver
`docs/superpowers/2026-09-27-plan-4-registro.md`, sección "Confirmación del autor — los
cuatro puntos pendientes de la Tarea 5"): traza torpe pero completa → pasa; garabato completo
→ falla; tiempo de espera de 1.5 s → se siente bien; letra distinta dibujada encima de la
guía → rechazada con feedback neutro. El PR se fusionó (#5). El toque accidental, que quedó
como decisión abierta, lo resolvió el Plan 5 (D19). Al escribir esto ninguna unidad real
ofrecía `trace` (D14); desde el Plan 5 la ofrecen la Fase 1 y la 2.

- **Motor:** `content/glyphs.ts` (`UPPER_GLYPHS`, la geometría de referencia de las 9 letras
  mayúsculas de las Fases 1 y 2 — a, e, i, o, u, m, l, s, p — y `glyphFor`) y
  `engine/trace.ts` (`scoreTrace`: cobertura por trazo y precisión sobre el total, con
  `TOLERANCE`/`MIN_COVERAGE`/`MIN_PRECISION`, sin exigir orden ni dirección, D12; y
  `guideLevel`, el nivel de guía según la caja Leitner del ítem, D13). `submitTrace` y
  `traceGuide` en `engine/session.ts` le dan a `trace` su propio camino de evaluación,
  paralelo a `submitAnswer`/`checkAnswer` (D17; cierra la trampa 9 para esta plantilla).
- **Interfaz:** `components/TraceCanvas.tsx` (el lienzo SVG: guía de 1 a 3 niveles, tinta con
  eventos `pointer`, solo el puntero primario dibuja y `pointerup`/`pointercancel` cierran
  igual), `session/trace/Evaluation.tsx` (pistas 1-2-3: guía al nivel anterior, animación con
  sonido, y modelo que no puntúa) y `session/trace/Presentation.tsx` (la mayúscula se dibuja
  sola en nivel 1 antes de pedir que se trace — introducción sin error, D12 del spec §2).
  `/dev/plantillas` amplía su selector con las 9 letras y los 3 niveles de guía.
- **R29 resuelto (D15):** con solo 2 opciones (nivel fácil de `listen-tap`/`initial-sound`
  con ítems `phoneme`), la pista 1 se limita a repetir el audio en vez de dejar solo la
  respuesta correcta.
- **Cierre (Tarea 5):** `Trace.integration.test.tsx` juega una sesión de punta a punta sobre
  un currículo de prueba con `letter:a` (un trazo correcto sube de caja, tres trazos lejos
  llegan al modelo y repasarlo avanza, y los contadores del fin de sesión cuentan bien);
  `allowedDevOrigins` en `next.config.ts` (desde `DEV_ORIGINS`) para poder probar `trace` a
  mano desde un móvil o una tableta en la red local.
- **Solo mayúsculas (D16):** las minúsculas y el interruptor `lowercaseTracing` llegan en el
  Plan 6. Los pares que se confunden con las constantes de partida (E sobre S, E sobre P, S
  sobre E, O sobre U, U sobre O) están fijados en `CONFUSABLE_PAIRS` como dato conocido del
  prototipo.
- **Cierre (Tarea 6):** arreglado un bug de movimiento reducido en `TraceCanvas.tsx`
  (`transitionDuration`/`transitionDelay` en línea seguían animando aunque
  `prefers-reduced-motion: reduce` estuviera activo) con `motion-reduce:transition-none` en
  los dos elementos animados (`anim-full`, `anim-dot`). D18: los marcadores de inicio
  superpuestos (A, E, M y P, que tienen dos trazos empezando en el mismo punto exacto) ahora
  se separan visualmente, desplazados a lo largo de la dirección inicial de su propio trazo.
  La pista 2 (antes un punto simple viajando por el trazo) ahora usa el mismo triángulo que la
  flecha estática de fin de trazo, viajando por `offsetPath`/`offset-rotate: auto`; esa misma
  guía animada se reproduce también tras `Presentation.tsx`, después de que la letra se dibuje
  sola entera (encadenada, no simultánea). Fix wave sobre la revisión final de la rama: la
  flecha estática ya no tapa el marcador de inicio en O/L/E/M, y la pista 2 tiene respaldo
  visual quieto bajo movimiento reducido también en niveles de guía 2 y 3.

---

## Lo que ya está hecho: Plan 5

Plan 5 = **la voz: `say-it` y `read-word`**, en la rama `feat/plan-5-voz` (7 tareas; ledger en
`docs/superpowers/2026-09-27-plan-5-registro.md`, con los rulings P1-P15 en el plan). Cada
tarea pasó su revisión y la revisión final de la rama, con Opus, se hizo y se aplicaron sus
correcciones. La prueba manual del autor en dispositivo real también está completa, los 8
puntos confirmados. **Falta** solo el PR. D19-D23 están [en la tabla](#decisiones-tomadas).

- **Motor y store:** `submitSpeech(verdict)` en `engine/session.ts` es el camino de evaluación
  de voz (como `submitTrace`, D17): el evaluador da un `"ok"`/`"retry"` y el motor aplica las
  pistas (P2: cada «Otra vez» avanza un escalón; el tercero llega como `assisted` y abre el
  modelo, donde basta con hablar). Cierra la trampa 9. Un invariante en `evaluable.test.ts`
  falla si una plantilla de una unidad jugable no puede evaluarse. **D19:** un trazo con tinta
  despreciable se ignora (`ignored`, sin intento ni pista). El contador `syllablesVoiced` y los
  ajustes `hideMic` y `speechMode` entran en el documento con su valor por defecto (D23, sin
  interfaz hasta el panel de padres).
- **`src/speech/`:** VAD por umbral de energía (D20, `AnalyserNode`; corta a 3 s o a 600 ms de
  silencio tras habla), captura con `getUserMedia` que nunca guarda audio y se cierra siempre
  (P6), el evaluador `parent` (siempre `unsure`: el adulto decide, P1), `pickEvaluator` y
  `speechTarget`. Los evaluadores `browser` y `azure` siguen sin existir.
- **Interfaz de voz:** `components/MicButton` y `components/Mouth` (boca esquemática, D21, con
  `safeMouthShapes` para que un dato de contenido no la tire), y `session/voice/VoiceTurn`: cuenta
  atrás de tres puntos, escucha, y **el adulto nunca queda atrapado** (P4): sin micrófono,
  denegado, `hideMic`, dos silencios seguidos o un evaluador que no contesta en 5 s dan los
  botones «Lo dijo bien» / «Otra vez». Un `heard` con una pista sonando se descarta (P7).
- **`say-it` y `read-word`** (`session/say-it/`, `session/read-word/`): presentación sin error y
  evaluación con pistas de menos a más (la boca en la pista 1 de `say-it`; sílabas separadas,
  primera sílaba y palabra entera con su imagen en `read-word`, que empieza con la imagen
  tapada y la descubre al acertar). Registradas en `registry.ts`: **la Fase 1 y la Fase 2
  pasan a ser jugables** (D22).
- **Cierre (Tarea 7):** `features/Voice.integration.test.tsx` juega sesiones de punta a punta
  con motor, store y vistas reales (`say-it`: acierto, tres «Otra vez» hasta el modelo,
  `hideMic` y dos silencios; `read-word`: imagen revelada y `wordsRead`; y el currículo real:
  toda plantilla de las unidades activas de la Fase 1 y la 2 tiene vista).
  `build/SessionFlow.test.tsx` ya no inyecta la corrida: llega a `build` con el store real y la
  Fase 2 activa (cierra la deuda 4). Poda de trampas y deuda al archivo.

---

## Lo que ya está hecho: Plan 6

Plan 6 = **lo funcional de padres, recompensas y PWA**, en la rama
`feat/plan-6-padres-recompensas` (11 tareas; ledger en
`docs/superpowers/2026-09-28-plan-6-registro.md`, con los rulings S1-S24 y las decisiones
D24-D31 [en la tabla](#decisiones-tomadas)). El arte definitivo queda para el Plan 7 (D24): nada
de este plan lo espera, y todo lo provisional pasa por `src/features/rewards/visuals.ts` (S21).

- **Motor y store:** `engine/rewards.ts` (logros, cosméticos, hitos de 10/25/50/100 estrellas,
  `totalStars`, `nextMilestone`), `unitProgress`, `pin.ts` (el PIN se guarda con hash; no es
  seguridad, solo una puerta para el niño), `previewImport`/`importDoc`/`resetAll`/`equip`/
  `setPin`/`checkPin`/`updateSettings` en el store. `importState` sigue el contrato de D27:
  solo un documento que **valida entero** se importa, con vista previa y confirmación; `{}`, una
  versión distinta o una clave corrupta se rechazan sin tocar nada.
- **Panel de padres** (`features/adult/`): mantener el logo 3 s abre la puerta (`AdultDoor`,
  D26); el PIN se crea la primera vez (`ParentGate`); si se olvida, una pregunta de adulto (una
  multiplicación) deja poner otro **sin tocar el progreso**. Dentro (`ParentPanel`): acento,
  trazo de minúsculas, longitud de la sesión (5 o 6), evaluador de voz, micrófono, nombre del
  niño, cambiar el PIN, progreso, y `DataSection`: exportar, importar con resumen y reiniciar con
  doble confirmación. Sin `crypto.subtle` (http en la red local) el panel lo dice en vez de
  fallar. `SaveWarning` sigue avisando de los fallos de guardado.
- **Trazo en minúsculas (D28):** los 9 glifos (a e i o u m l s p, la `a` de un solo piso), pares
  confundibles medidos como en G15 (`LOWER_CONFUSABLE_PAIRS`) e interruptor `lowercaseTracing`;
  el caso queda fijado al empezar la sesión (`SessionRun.traceCase`). En `trace` hay además
  botones de **borrar** y **listo** (D31b), además de la detección del toque accidental (D19).
- **Mapa (D31a):** contador de estrellas con barra al próximo hito, puntos de avance de la
  unidad activa (solo lo dominado, nunca huecos vacíos: trampa 4) y una marca discreta de
  «guardado».
- **Recompensas** (`features/rewards/`): galería «Mis premios», `Companion`, `CosmeticBackground`
  (detrás del mapa, la galería y el fin de sesión, **nunca** de la sesión) y `TrailLayer`, un
  único rastro del dedo con tope de 24 partículas y respeto de `prefers-reduced-motion` (S10).
  Los cosméticos y logros salen de `REWARDS`/`COSMETICS`; `visuals.ts` los traduce a marcadores
  (degradados, emoji).
- **PWA (D29, D30):** `src/app/sw.ts` con Serwist (sin `skipWaiting` automático: una versión
  nueva solo toma el control al tocar el inicio, S11), `manifest.ts`, iconos provisionales y
  `docs/despliegue-vercel.md`. **Desplegar es cosa del autor.**
- **e2e (Tarea 10):** Playwright con J1-J4 (ver [cómo ejecutarlo](#cómo-ejecutarlo)). J4 destapó
  un defecto de la Tarea 9 (la ruta de precaché volvía a listar `public/**` y el service worker
  no llegaba a registrarse en producción); corregido en `72c04b7`. Solo lo cubre J4.
- **Cierre (Tarea 11):** `features/Panel.integration.test.tsx` (Z1-Z3, store y vistas reales,
  adaptador en memoria): mapa → puerta → crear PIN → sesión de 6 → empezar con 6 pasos;
  exportar e importar ese JSON sobre un documento vacío devuelve el progreso; importar `{}` no
  cambia nada. Los prompts del arte están en `docs/arte-plan-7-prompts.md`. Poda de trampas y
  deuda al archivo.

---

## Lo que ya está hecho: Plan 7

Plan 7 = **identidad visual y lista de verificación en iPad**, en la rama
`feat/plan-7-identidad-visual` (6 tareas; ledger en
`docs/superpowers/2026-09-29-plan-7-registro.md`, con los rulings V1-V16 y las decisiones
D32-D36 [en la tabla](#decisiones-tomadas)). **Sin fusionar**: faltan la revisión final de la
rama, el despliegue y la prueba del autor, y el PR (ver «Siguientes pasos»).

- **Arte (D32, D36):** el autor generó 27 piezas; están integradas **21** (25 ficheros: 16 WebP y
  9 PNG, unos 746 KB) en `public/images/arte/` y `public/icons/`: los compañeros (**loro**,
  `companion:first`, que es también el icono de la app, y **elefantito**, `companion:second`, cada
  uno con y sin gorra), los fondos (clásico, Pradera, Espacio y Bosque), las pegatinas (avión,
  10/25/50/100 estrellas, sin número pintado: V6) y el trofeo, las partículas y cursores del
  rastro, y los iconos nuevos `erase`, `done`, `gallery` y `lock`. `scripts/optimizar-arte.py`
  las genera (V2; ver [cómo ejecutarlo](#cómo-ejecutarlo)) y `iconos-pwa.py` desapareció.
- **El arte en la interfaz (V7-V9, V16):** `components/ArtImage` cae al emoji de respaldo (🦜 y
  🐘) y el fondo a su degradado si el fichero no carga, así que ninguna vista se queda vacía sin
  red. `rewardArt` sustituye a `rewardIcon`: cada logro pinta la pieza que desbloquea, y un
  cosmético bloqueado es una silueta gris de su propia imagen. Compañero de 112 px en el mapa y 160
  px en el fin de sesión; logros de 96 px.
- **Cursor de PC y boca (V11, V12):** con `(pointer: fine)` el cursor pasa a la estrellita o la
  burbuja del rastro equipado (`data-trail-cursor` y `--trail-cursor` en `<html>`); en táctil no
  cambia. La boca apila sus seis fotogramas desde el montaje y solo cambia la opacidad, para que
  en el iPad no parpadee la primera vez. **Las bocas se aplazaron:** no hay ningún `mouth-*.webp`,
  `BOCAS_PUBLICADAS = false` (en `Mouth.tsx`) y `Mouth` pinta el SVG esquemático de D21 sin pedir
  ninguna imagen (deuda 5). Con `true` pide las seis y FI2 las exige.
- **Paleta final y legibilidad (D34, V13-V15):** dos tokens cambian para casar con el arte
  (`action` `#F9BE23`, el loro; `celebrate` `#E99810`, el ámbar de las pegatinas); el resto ya
  casaba. `src/app/tokens.test.ts` lee `globals.css` y comprueba el contraste AA, que no haya rojo
  ni verde intensos y que el manifest y el `viewport` usen los mismos colores que los tokens;
  `legibility.test.tsx` (LE1-LE5) exige que todo texto e indicador del mapa, la galería y el fin de
  sesión vaya sobre una superficie opaca de token, con cualquier fondo. `/dev/arte` enseña todo.
  El autor aprobó la paleta (2026-09-29, «SE VE BIEN») y aceptó los ★ a 2,34 : 1
  (2026-09-29); detalle en `docs/diseno-visual.md`.
- **Checklist (D35):** `docs/checklist-ipad.md` reúne los cuatro puntos del spec §10, los 11 del
  Plan 6 y sus añadidos, la deuda 1 y las pruebas del arte, agrupados por dispositivo, con una
  tabla de resultados. No se ha pasado.
- **Cierre (Tarea 6):** README, poda de trampas y deuda al archivo, comentario del `manifest`
  corregido y estado final en el ledger. T1-T5 salieron con 0-1 rondas de corrección; tabla en el
  ledger.

---

## Lo que falta: después del Plan 7

La hoja de ruta original está al final del Plan 1. Esta es la **versión revisada y
confirmada con el autor** (D7 y D24), ya con los planes 2 a 7 construidos.

| Plan | Contenido | Resultado visible |
|---|---|---|
| ~~2~~ | ~~Capa `audio/`, Zustand sobre `store/`, inicio, mapa, sesión, fin y `count-syllables` de punta a punta~~ **hecho** | Un niño juega una sesión real de `phase0:clap` |
| ~~3~~ | ~~`rhyme`, `initial-sound`, `hear-it`, `listen-tap` y `build`, con la base visual y las ilustraciones~~ **hecho** (PR #4) | La Fase 0 entera es jugable |
| ~~4~~ | ~~`trace`: lienzo, eventos táctiles, puntuación con tolerancia y 3 niveles de guía~~ **hecho** (PR #5) | Escribir letras con el dedo |
| ~~5~~ | ~~Voz: `getUserMedia`, VAD, evaluador `parent` pulido, `say-it` y `read-word`~~ **hecho** | Las Fases 1 y 2 son jugables |
| ~~6~~ | ~~Panel de padres con PIN y ajustes, importar, trazo en minúsculas, recompensas y cosméticos con marcadores, avance en el mapa, PWA y e2e~~ **hecho** (PR #7; la prueba manual pasa a `docs/checklist-ipad.md`, D35) | Una app completa y desplegable, aún con marcadores en vez de arte |
| ~~7~~ | ~~Identidad visual (D24): el arte del loro y el elefantito, fondos, pegatinas, trofeo, rastros, iconos, paleta final y `docs/checklist-ipad.md`~~ **hecho en su rama** (sin fusionar). **Sin hacer:** la boca (aplazada), la revisión final, el despliegue y la prueba del autor con la lista | La versión con cara propia; falta probarla en dispositivo real |
| Después | Spike de Azure, audios neurales en 3 acentos (`do`, `mx`, `neutro`), evaluador `browser`, y **locuciones de sílabas sueltas** para las pistas de `count-syllables` (hoy las dice `speechSynthesis` a partir del texto), más las de `ending:`, `stretch:` y `stretch-in:` | Validación automática de pronunciación |
| Idea aparcada | **Refactor de diseño pantalla a pantalla** con el plugin `frontend-design`, en un plan aparte, ahora que la paleta está aprobada (ledger del Plan 7) | Pantallas con más personalidad |
| Idea aparcada | **Objetos para los compañeros** (pajarita, gafas redondas, bufanda, corona, capa), como capas transparentes ganadas con hitos distintos. Pide cosméticos y logros nuevos en el motor y un punto de anclaje por compañero; ver el ledger del Plan 7 | Personalización del compañero |

**Voz, en «Después».** Antes de generar el lote entero, una **prueba de Azure con unos 10
audios en `do` y `mx`**. Y **los fonemas sueltos («mmm», «sss», «p») hay que grabarlos con voz
humana**: ninguna voz sintética los dice bien.

**Por qué el Plan 2 cambió respecto a la hoja de ruta original:** el Plan 1 decía que el
Plan 2 construiría `listen-tap`. Pero la primera unidad jugable del currículo es
`phase0:clap`, que solo declara `count-syllables`, y `listen-tap` no aparece hasta la Fase 1.
Con solo `listen-tap`, el motor planificaría ejercicios que la interfaz no sabe dibujar.
`count-syllables` es de toque puro, sin voz ni trazo, y sus ítems ya traen las opciones en
el dato. (Recomendación acordada el 2026-09-19.) `listen-tap` y `hear-it` (que no aparecía en
ningún plan original) se construyeron en el Plan 3.

**El audio no bloquea nada.** Hasta que existan la cuenta de Azure y los audios reales, la
capa `audio/` usa `speechSynthesis` del navegador detrás de la misma interfaz. Las 131
locuciones × 3 acentos (393 ficheros) se generan después sin rehacer nada.

---

## Siguientes pasos concretos

**Plan 7 ejecutado en su rama (2026-09-29); revisión final hecha (`Final review clean`) y preview
desplegado, con la pasada automatizada hecha el 2026-10-02.** Queda, en este orden:

1. **Los dos fallos de la pasada están arreglados** (2026-10-03): I9 (T7, un solo reproductor
   con el acento en vivo) y C3/H2 (T8, variante `apaisado-bajo` y `e2e/apaisado.spec.ts`).
   Re-medidos sobre el preview de `4a1ea31`. Detalle en el ledger del Plan 7, «Ejecución de las
   correcciones».
2. **Cerrar la deuda 1 con dispositivo real** en `docs/checklist-ipad.md`: lo que solo vale en
   hardware (I1-I3, I6, H1, P1-P3, P8, P9, I12-I13, I15 con niño). Nadie lo prueba por el autor.
3. **Abrir el PR** de `feat/plan-7-identidad-visual` contra `main`.
4. **Después:** rehacer la boca con un estilo que apruebe el autor (deuda 5) y, si procede, el
   refactor de diseño o los objetos de los compañeros.

---

## Decisiones tomadas

Las cuatro decisiones que el Plan 1 dejó abiertas, más las de producto del Plan 2, se
resolvieron con el autor el 2026-09-26. Están en la tabla D1-D7 del
[Plan 2](docs/superpowers/plans/2026-09-26-silabin-sesion.md). D8-D11 son del
[Plan 3](docs/superpowers/plans/2026-09-26-silabin-plantillas-toque.md). D12-D17 son del
[Plan 4](docs/superpowers/plans/2026-09-27-silabin-trazo.md). D19-D23 son del
[Plan 5](docs/superpowers/plans/2026-09-28-silabin-voz.md) (texto completo en la sección
«Decisiones tomadas con el autor» de su
[registro](docs/superpowers/2026-09-27-plan-5-registro.md)). D24-D31 son del
[Plan 6](docs/superpowers/plans/2026-09-28-silabin-padres-recompensas.md) (texto completo en su
[registro](docs/superpowers/2026-09-28-plan-6-registro.md)). D32-D36 son del
[Plan 7](docs/superpowers/plans/2026-09-29-silabin-identidad-visual.md) (texto completo en su
[registro](docs/superpowers/2026-09-29-plan-7-registro.md)).

| # | Decisión |
|---|---|
| D1 | Imágenes: detrás de `src/images/`, clave `img:<palabra>`. Las 65 ilustraciones reales (2026-09-26, estilo 3D suave tipo juguete; ver `docs/ilustraciones-prompts.md`) **ya están integradas** como WebP optimizados (Tarea 5b del Plan 3); el **emoji queda solo como respaldo** si la imagen no carga |
| D2 | `basePool` **lanza error** en vez de caer al respaldo global, y un invariante de contenido lo comprueba en `pnpm test` |
| D2b | Consecuencia de D2: las 4 unidades de Fase 2 declaran `initial-sound` con peso 1 |
| D3 | Barril `@/engine`: reexporta `curriculum`, `CurriculumIndex`, `templates`, `TemplateId`, `HintStep`, `Item` y `Unit`; deja de exportar `owningUnits`, `similarity`, `createRng`, `promote`, `demote`, `MASTERY_TARGET`, `REVIEW_SHARE` y `unitMasteryRatio` |
| D4 | Currículo agotado (`activeUnitId === null`): **sesión de solo repaso** planificada por el motor |
| D5 | `saveState` → `{ saved: false }`: **aviso discreto para el adulto** y reintento en el siguiente guardado |
| D6 | **Exportación mínima** con gesto oculto de adulto (mantener pulsado el logo 3 s) |
| D7 | Hoja de ruta de los planes 3 a 6 **confirmada** (la de 4 a 6 sigue en pie; ver [arriba](#lo-que-falta-después-del-plan-7)) |
| D8 | Estilo visual: **base mínima dentro del Plan 3**. Tokens de color, tipografía, radios y tamaño de objetivo en `globals.css` y componentes base. La identidad final (paleta definitiva, ilustraciones, compañero) llegará después y cambiará los tokens sin tocar las vistas. Detalle en [`docs/diseno-visual.md`](docs/diseno-visual.md) |
| D9 | `importState` **va al Plan 6** con el contrato fijado: un import deliberado del adulto **sustituye `doc` entero y quita `readFailed`** (y `recovered`). **Hecho en el Plan 6**, precisado por D27 |
| D10 | Las 5 plantillas de toque (`rhyme`, `initial-sound`, `hear-it`, `listen-tap`, `build`). Tras el Plan 3 **solo la Fase 0 es jugable**: las unidades de Fase 1 y 2 declaran `trace` y `say-it`, y el mapa las atenúa hasta los Planes 4 y 5. `listen-tap` y `build` se prueban con tests y con `/dev/plantillas` |
| D11 | La prueba manual del Plan 2 la hizo el autor **antes** de ejecutar el Plan 3 (Edge y Chrome, sin fallos salvo la pausa larga entre sílabas en Edge, atendida en la Tarea 1) |
| D12 | `trace` se evalúa **solo por la forma del trazo**: cobertura por trazo más precisión sobre el total, con tolerancia generosa. No exige orden ni dirección |
| D13 | El nivel de guía de `trace` sigue la **caja Leitner del ítem**: caja 0 → guía 1, caja 1 → guía 2, cajas 2 y 3 → guía 3. El nivel 3 conserva un carril muy tenue, nunca desaparece del todo |
| D14 | La **Fase 1 se desbloquea en el Plan 5**, con `say-it` (hecho, D22). Nada provisional en el planificador mientras tanto |
| D15 | Resuelve R29 del registro del Plan 3: con solo 2 opciones, la pista 1 se limita a **repetir el audio** (no puede quitar un distractor sin dejar solo la respuesta correcta). El nivel fácil sigue ofreciendo 2 opciones |
| D16 | `trace` **solo mayúsculas**; las minúsculas y el interruptor `lowercaseTracing` quedan para el Plan 6. **Hecho en el Plan 6** (D28) |
| D17 | El trazo entra al motor por `submitTrace`, y lo puntúa el motor (`scoreTrace`), nunca la interfaz; la interfaz pinta con SVG y eventos `pointer` |
| D18 | Los marcadores de inicio superpuestos (A, E, M, P) se separan desplazándolos a lo largo de la dirección de su propio trazo; la pista 2 pasa de un punto simple a una **flecha de dirección animada** (mismo mecanismo `offsetPath`/`offset-rotate:auto`), que también se reproduce una vez tras la presentación completa de la letra (encadenada, no simultánea) |
| D19 | **Toque accidental en `trace`:** se ignora. Con la tinta total mínima, se borra sola y no cuenta intento ni gasta pista (coherente con «sin habla detectada → no cuenta intento»). Cierra la decisión abierta del Plan 4 |
| D20 | **VAD por umbral de energía**, no Silero: `getUserMedia` + `AnalyserNode`, corta a 3 s o a 600 ms de silencio tras habla, sin dependencias nuevas. Silero llega con `browser`/`azure` |
| D21 | **Boca de la pista 1 de `say-it`:** SVG esquemático con pocas posiciones por fonema, más la instrucción repetida. Placeholder como D8. **El Plan 7 aplazó el arte** (el autor rechazó dos veces las bocas fotorrealistas): la boca sigue esquemática, con los prompts por rehacer en `docs/arte-plan-7-prompts.md` (deuda 5) |
| D22 | **Desbloqueo:** el Plan 5 deja jugables la Fase 1 **y** la Fase 2 (incluye sustituir la inyección de `build/SessionFlow.test.tsx`) |
| D23 | **«Ocultar micrófono» y `speechMode`:** entran en el store con su valor por defecto y se respetan con tests (`hideMic` lo leen las vistas, `speechMode` lo lee `speech/`; ninguno entra en `engine/`). La interfaz llegó con el panel de padres (Plan 6) |
| D24 | **El trabajo se reparte en dos planes.** Plan 6, funcional (panel de padres, ajustes, importar, minúsculas, recompensas con marcadores, avance en el mapa, borrar y confirmar en `trace`, PWA y e2e). Plan 7, identidad visual (arte, compañero, boca, paleta) y la lista de verificación en iPad. Ninguna tarea del Plan 6 espera al arte |
| D25 | **El arte lo genera el autor a partir de prompts** en el estilo de `docs/ilustraciones-prompts.md`; el Plan 6 los deja escritos en `docs/arte-plan-7-prompts.md` y el Plan 7 los integró con `scripts/optimizar-arte.py` (V2; `optimizar-ilustraciones.py` sigue siendo el de las 65 ilustraciones de palabras) |
| D26 | **Panel de padres:** se entra manteniendo el logo 3 s, que abre el PIN; exportar pasa dentro del panel. PIN olvidado: pregunta de adulto y PIN nuevo **sin tocar el progreso**. El PIN se define la primera vez (`pinHash: null`) |
| D27 | **Contrato de importar** (precisa D9): solo se importa un documento que **valide entero** con `persistedStateSchema`, versión incluida; si no, se rechaza con mensaje y no se toca nada (nunca se rescata ni se importa un documento vacío). Si valida: vista previa, confirmación y sustitución de `doc` entero |
| D28 | **Trazo en minúsculas** dentro del Plan 6: 9 glifos (la `a` de un solo piso), pares confundibles medidos, interruptor `lowercaseTracing`. Cierra D16 |
| D29 | **HTTPS para la PWA: Vercel.** Desplegar es una acción del autor; ningún agente despliega. La URL es pública aunque nadie la conozca |
| D30 | **Dependencias nuevas:** Playwright (e2e), Framer Motion (celebraciones y rastro) y Serwist (service worker con precaché, para Turbopack) |
| D31 | **Entran las dos ideas de la antigua deuda 10:** avance dentro de la unidad activa en el mapa, contador de estrellas con barra al hito y señal de «guardado»; y botones de **borrar** y **confirmar** en `trace` |
| D32 | **El autor genera el arte antes de la integración**, con los nombres de `docs/arte-plan-7-prompts.md`. Las tareas sin arte (T1-T3) se ejecutaron primero y las de integración esperaron a los ficheros |
| D33 | Compañeros: pollito y zorrito. **Sustituida por D36** |
| D34 | **La paleta final se deriva del arte:** una tarea ajusta los tokens de `globals.css`, con la vista previa `/dev/arte` que el autor aprueba y un test automático que exige el contraste AA (`tokens.test.ts`) |
| D35 | **La prueba manual del Plan 6 no se hizo** (ni el despliegue en Vercel): sus 11 puntos y los dos añadidos entran en `docs/checklist-ipad.md`, con una sola pasada en el dispositivo sobre la versión final que despliega el autor (D29) |
| D36 | **Los compañeros son un loro (`companion:first`, icono de la app) y un elefantito (`companion:second`)**, no un pollito y un zorrito: encarnan «escuchar y repetir sonidos» y respetan «sin rojo ni verde intensos». Los emojis de respaldo son 🦜 y 🐘 |

**Pares confundibles de `trace` (dato conocido, del prototipo de la Tarea 1 del Plan 4):** con
las constantes de partida (`TOLERANCE`, `MIN_COVERAGE`, `MIN_PRECISION`) que trae hoy el
código, estos pares también pasan como válidos, no solo la letra correcta: E sobre S, E sobre
P, S sobre E, O sobre U y U sobre O (confirmado en `pnpm test`, G15 de `glyphs.test.ts`, sin
pares nuevos respecto al prototipo). Es una consecuencia aceptada de D12 (tolerancia generosa,
solo forma). La **prueba manual del Plan 4 ya se hizo**, y de sus cuatro confirmaciones
ninguna llevó a mover ninguna constante: el autor dejó esta lista de pares tal cual estaba.
Queda **confirmada**, no pendiente.

Los rulings tomados durante la ejecución están en los registros:
[Plan 2](docs/superpowers/2026-09-26-plan-2-registro.md) (R1-R12),
[Plan 3](docs/superpowers/2026-09-26-plan-3-registro.md),
[Plan 4](docs/superpowers/2026-09-27-plan-4-registro.md) y
[Plan 5](docs/superpowers/2026-09-27-plan-5-registro.md) (rulings de la voz, `VoiceTurn`,
`say-it` y `read-word`) y
[Plan 6](docs/superpowers/2026-09-28-plan-6-registro.md) (rulings S y de tarea, la prueba manual) y
[Plan 7](docs/superpowers/2026-09-29-plan-7-registro.md) (rulings V y de tarea, el estado final).

---

## Trampas conocidas

Solo las **vivas**, con tope de 8 (regla de poda en `CLAUDE.md`). Las resueltas y el texto
completo de cada una están en [`docs/archivo-trampas-y-deuda.md`](docs/archivo-trampas-y-deuda.md).
Las trampas 1-9 de los Planes 1 a 5 están resueltas, y las que salieron del Plan 6 son test o
regla (la semilla de J1/J2 se comprueba en el propio e2e y «el fondo cosmético nunca envuelve la
sesión» tiene un test en `App`). La del Plan 7 (`optimizar-arte.py` genera también las seis
bocas, que no deben publicarse) es test: FI2 y `BOCAS_PUBLICADAS`.

Ninguna trampa viva.

---

## Deuda menor aceptada

Solo lo **pendiente**, con tope de 10 entradas. Nada bloquea. El resto, y el detalle, en
[`docs/archivo-trampas-y-deuda.md`](docs/archivo-trampas-y-deuda.md) y en los registros
(busca `minor (deferred)`). Notas visuales en [`docs/diseno-visual.md`](docs/diseno-visual.md).

1. **Prueba en dispositivos reales → `docs/checklist-ipad.md`** (escrita, Plan 7): la pasa el autor
   sobre el despliegue. Viva hasta entonces; no se automatiza (dispositivo real, D11).
2. **`AudioPlayer` debe resolver o rechazar siempre:** si `play` se cuelga, `hear-it`, `listen-tap` y
   `rhyme` no avanzan. Sin invariante posible: depende de cada reproductor real.
3. **Tras un fallo de lectura de IndexedDB no se guarda nada** (I3): «Reintentar» solo
   desbloquea con el disco vacío; **importar** (D27) o recargar sí lo resuelven.
4. **Accesibilidad y objetivos táctiles < 72 px:** modelo (56 px), `SaveWarning` (~36 px), tambor de
   224 px fijos, el `<input type="file">` de importar (lo controla el navegador) y las piezas de la
   bandeja de `build`, separadas 12 px en vez de 16.
5. **La boca sigue esquemática (bocas aplazadas):** el autor rechazó dos veces el arte fotorrealista
   (D21 pide esquemática) y no hay `mouth-*.webp`; hay que rehacer la sección 5 de los prompts y poner `BOCAS_PUBLICADAS = true`. Arte, no test.
6. **Arte y glifos a criterio del autor:** ilustraciones dudosas (`una`, `asa`, `sumo`, iglú...) y los
   glifos sin arte (V10: 🔁, ✓, ✕, ★/☆). Es gusto, no test.
7. **Minors de los Planes 2, 3 y 6** (ledgers y archivo): `ParentGate` sin `.catch`, `DataSection` de
   220 líneas, sin test de `{capture, passive}` en `TrailLayer`, duplicaciones del motor.
8. **Minors del Plan 7** (ledger, `minor (deferred)`; lista completa en el archivo): script, `visuals.ts`,
   `art-files.test.ts`, `Companion.tsx`, `Mouth` en servidor, `legibility.test.tsx`, `leerTokens`.
9. **`speechTarget` copia `item.text` y `phonemes` sin adaptar tildes ni acento** (M16, P14).
   Solo importa con evaluadores `browser`/`azure`, que aún no existen.
10. **El e2e es frágil por diseño:** semilla 7 (S22), solver limitado, espera fija de 3300 ms y WebKit
    sin probar. No se automatiza más sin forzar el planificador.

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
