# Plan 7: registro de ejecución

Rama: `feat/plan-7-identidad-visual`, creada desde `main` en `618e6b3`, después de fusionar el
Plan 6 (PR #7).
Plan: `docs/superpowers/plans/2026-09-29-silabin-identidad-visual.md` (6 tareas).

Este registro es la memoria del plan. Al retomar, léelo primero con `grep -n` y el tramo final.

## Estado

| Fase | Estado |
|---|---|
| Decisiones con el autor (D32-D35) | **hechas** (2026-09-29, abajo) |
| Rulings de planificación (V1-V16) | **fijados** (abajo) |
| Redacción del plan | **hecha** (2026-09-29, Opus). Pendiente de la revisión del autor |
| Arte (D32) | **pendiente**: lo genera el autor en `C:\Users\Yelisson\Downloads\silabin-arte-plan-7`. Bloquea la T4 y las siguientes, no la T1 ni la T3 |
| Ejecución | en curso: T1 y T2 hechas (2026-09-29) |

## Decisiones tomadas con el autor (2026-09-29)

| # | Decisión |
|---|---|
| D32 | **El autor genera el arte antes de la integración**, en `C:\Users\Yelisson\Downloads\silabin-arte-plan-7` (`/mnt/c/Users/Yelisson/Downloads/silabin-arte-plan-7`), con los nombres de `docs/arte-plan-7-prompts.md`. Las tareas sin arte (T1-T3) se ejecutan primero, y las de integración (T4-T6) esperan a que estén todos los ficheros. El 2026-09-29 no había ninguno: en `Downloads` solo estaban las ilustraciones y los iconos del Plan 3 |
| D33 | **Compañeros: pollito (`companion:first`) y zorrito (`companion:second`)**, los que sugerían los marcadores. Los prompts no cambian |
| D34 | **La paleta final se deriva del arte.** Una tarea ajusta los tokens de `globals.css` para que casen con los compañeros y los fondos, con una vista previa (`/dev/arte`) que el autor aprueba. Un test automático exige el contraste AA |
| D35 | **La prueba manual del Plan 6 no se hizo** (ni el despliegue en Vercel). Sus 11 puntos y los dos añadidos entran en `docs/checklist-ipad.md`, y hay una sola pasada en el dispositivo, sobre la versión final desplegada por el autor (D29). El README decía que faltaba el PR del Plan 6, pero el PR #7 ya estaba fusionado |
| D36 | **Los compañeros pasan a ser un loro (`companion:first`, icono de la app) y un elefantito (`companion:second`)**, en lugar de pollito y zorrito (D33, sustituida). Por qué: encarnan «escuchar y repetir sonidos» (loro = `say-it`, orejas grandes = `listen-tap` y `hear-it`); el loro va amarillo y azul para respetar «sin rojo ni verde intensos». Las gorras se mantienen (naranja suave y amarilla suave, por contraste con cada animal). Los nombres de fichero no cambian. Prompts en `docs/arte-plan-7-prompts.md`. **Pendiente de código (T4):** emojis de respaldo en `visuals.ts` 🐣→🦜 y 🦊→🐘, con sus asertos (AR2, AR3, AR6-AR8 y los de rewards/EndScreen que los nombren) |

## Rulings de planificación (prefijo V)

El prefijo V no choca con R (Planes 2 y 3), P (Plan 5) ni S (Plan 6).

- **V1 · Las tareas sin arte van primero, y la T4 tiene una precondición.**
  - Orden: T1 (script con PNG sintéticos), T2 (contrato de `visuals.ts` con respaldo) y T3
    (cursor y boca) no necesitan los ficheros.
  - Antes de la T4, el coordinador ejecuta el bucle de la sección «Precondición del arte» del
    plan.
  - Coste si fuera un error: si el arte llega tarde, la rama espera. Nada se integra a medias.
- **V2 · Un script nuevo (`optimizar-arte.py`) cubre las 27 piezas.**
  - Por qué: `optimizar-ilustraciones.py` está atado a 65 ficheros, 384 px y `palabras/`, y
    mezclar dos modos en él lo complica.
  - `iconos-pwa.py` se borra: la «S» provisional ya no hace falta.
  - D25 decía que el arte se integraba «con `optimizar-ilustraciones.py`»; se cumple la
    intención (un script con Pillow), no el nombre.
  - Coste si fuera un error: dos scripts parecidos.
- **V3 · Formato, tamaño y presupuesto según la clase de pieza** (tabla de piezas del plan).
  - WebP para todo lo que pinta un `<img>`.
  - PNG para los iconos de la interfaz (convención de `Icon`), para los cursores (Safari no
    acepta WebP en `cursor`) y para los iconos de la app (iOS).
  - Los presupuestos salen del peso de hoy: las ilustraciones pesan < 60 KB a 384 px y los
    iconos, 19-34 KB a 256 px.
  - Coste si fuera un error: subir un presupuesto, que es una línea en `art-files.test.ts`.
- **V4 · El script valida todo antes de escribir, recorta al centro y no amplía.**
  - Por qué: el chat de imágenes da 1024 × 1536, no 1536 × 2048. Por eso los fondos se
    recortan a 3:4 y se quedan en 960 × 1280.
  - Una pieza transparente sin transparencia se vería como una caja en la interfaz.
  - Un lote incompleto no debe dejar `public/` a medias.
  - Coste si fuera un error: en un iPad Pro, el fondo se amplía unas 2 veces; los fondos son
    suaves y el prompt pide el centro despejado.
- **V5 · Del icono de la app solo se genera `app-512`.**
  - Los de 192 y 180 px salen de él, y el manifest gana una entrada `purpose: "maskable"`
    (el personaje ocupa el 70 % central, dentro de la zona segura).
  - Es una imagen menos que generar.
  - Coste si fuera un error: el personaje sale un poco más pequeño en el de 192.
- **V6 · Las pegatinas de estrellas no llevan número pintado.**
  - Por qué: el spec §9 dice que el niño no ve texto, y la revisión final del Plan 6 ya quitó
    los títulos visibles de la galería (M4).
  - La serie se lee por tamaño y adorno; el número va en el `aria-label`.
  - Corrige la frase de `arte-plan-7-prompts.md` que decía que «el número lo pinta la
    interfaz».
  - Coste si fuera un error: pintar un número es una línea, pero violaría §9.
- **V7 · Todo el arte tiene respaldo.**
  - `ArtImage` cae al emoji, como `Picture` (D1).
  - El fondo cae a su degradado.
  - La boca cae al SVG esquemático de D21, que se conserva como `MouthSchematic`.
  - Coste si fuera un error: algo más de código que un `<img>` a secas, a cambio de que una
    vista nunca se quede vacía, sin red y con la precaché incompleta.
- **V8 · Cada logro pinta la pieza que desbloquea** (`rewardArt` sustituye a `rewardIcon`).
  - Pradera → su fondo, «Compañero nuevo» → el zorrito, Estrellitas → su partícula, etc.
  - La gorra (`ten-sessions`) enseña al pollito con gorra.
  - Ningún emoji de respaldo es una letra ni una cifra: 🅰️ pasa a ✈️ (sonido y no nombre).
  - Coste si fuera un error: cambiar una fila de la tabla.
- **V9 · Un cosmético bloqueado se ve como silueta gris de su propia imagen**, como en el
  álbum, en vez de 🔒. Coste si fuera un error: volver al candado es una línea.
- **V10 · Iconos nuevos: `erase`, `done`, `gallery` y `lock`.**
  - `lock` se añade a los prompts: el 🔒 aparece en cada unidad bloqueada del mapa.
  - «Volver al mapa» usa `next` en espejo, sin arte nuevo.
  - **`minor (deferred)`**: 🔁 de «Repasar» (solo sale con el currículo agotado), ✓ del
    equipado y de «guardado», ✕ de salir (del adulto) y ★/☆ (glifos tipográficos con colores
    de token).
  - Coste si fuera un error: un icono más que generar.
- **V11 · El cursor de PC por rastro (S20) solo cambia con `(pointer: fine)`.**
  - `TrailLayer` pone `data-trail-cursor` y `--trail-cursor` en `<html>`, y `globals.css`
    aplica `cursor: var(--trail-cursor), auto`.
  - No depende del movimiento reducido ni de `reducedCelebrations`: es estático.
  - No se usa `style.cursor` porque jsdom puede descartar un `url()` y el test pasaría en falso.
  - Coste si fuera un error: el cursor cambia también con las celebraciones reducidas.
- **V12 · La boca apila sus seis fotogramas desde el montaje y solo cambia la opacidad.**
  - Por qué: en el iPad, cambiar el `src` cada 450 ms dejaría huecos en blanco la primera vez.
  - `MOUTH_STEP_MS`, `data-shape`, el movimiento reducido y `onDone` no cambian.
  - Coste si fuera un error: seis imágenes de < 30 KB decodificadas a la vez.
- **V13 · Todo texto sobre el fondo cosmético va sobre una superficie opaca de token.**
  - Por qué: `bg:espacio` es oscuro, y hoy el título, el contador y la marca de «guardado»
    del mapa se pintan directamente sobre el fondo.
  - Lo comprueba un test (LE1-LE3), no una revisión visual.
  - Coste si fuera un error: las bandas tapan algo del fondo.
- **V14 · La paleta se propone con colores medidos en el arte y la aprueba el autor antes de
  la revisión.**
  - Los tests CO fijan tres invariantes: la tabla AA, «sin rojo ni verde intensos» y que el
    manifest y el `viewport` usen los mismos colores que los tokens.
  - Convierten en tests tres reglas que hoy solo están escritas (CLAUDE.md, forma preferida de
    la poda).
  - Coste si fuera un error: el umbral de «intenso» (S ≥ 0,5, L entre 0,25 y 0,75) puede
    rechazar un verde apagado del bosque. Se ajusta en el test, con su porqué.
- **V15 · `/dev/arte`**, solo en `pnpm dev` (404 en producción, como `/dev/plantillas`).
  - Muestra una hoja con todo el arte, los fondos con piezas del mapa encima y la paleta con
    sus ratios.
  - Sirve para que el autor apruebe la paleta y para la prueba de legibilidad.
  - Coste si fuera un error: una ruta de desarrollo más que mantener.
- **V16 · Tamaños:**
  - compañero: 112 px en el mapa y 160 px en el fin de sesión (hoy, unos 60 px de emoji);
  - logros del fin de sesión: 96 px;
  - partícula: 28 px;
  - boca: 128 px, el tamaño al que el prompt pide que se distingan.
  - Coste si fuera un error: son clases de tamaño.

## Reparto de tareas

| # | Tarea | Riesgo · Effort | ¿Arte? | Sesión |
|---|---|---|---|---|
| 1 | Tubería del arte: `optimizar-arte.py` y sus tests (OP1-OP8) | script · medium | no | 1 |
| 2 | El arte en la interfaz: `ArtImage`, `visuals.ts` y sus cinco llamadores (AR1-AR13) | contrato de UI · high | no | 1 |
| 3 | Cursor de PC por rastro y boca con fotogramas (RA1-RA5, BO1-BO5) | UI · medium | no | 2 |
| 4 | Integración del arte: ficheros, iconos nuevos e invariantes de disco (FI1-FI8) | assets · medium | sí | 2 |
| 5 | Paleta final, legibilidad y `/dev/arte` (CO1-CO4, LE1-LE5), con la puerta del autor | estilos · medium | sí | 3 |
| 6 | Cierre: `docs/checklist-ipad.md`, README, poda y ledger | docs · medium | sí | 3 |

**Review Focus:**
1. arte que no carga;
2. fondo oscuro detrás del texto;
3. la primera vez que suena la boca en el iPad;
4. cursor en dispositivos híbridos;
5. el peso del arte en la precaché.

## Progreso de ejecución

| Tarea | Estado | Rondas | Mutaciones supervivientes |
|---|---|---|---|
| 1 | **completa** (`6a73cc3`) | 0 | 0 (las 2 mutaciones mueren) |
| 2 | **completa** (`5629e15`) | 0 | 0 (las 4 mutaciones mueren) |
| 3 | pendiente | | |
| 4 | pendiente (precondición D32) | | |
| 5 | pendiente | | |
| 6 | pendiente | | |

## Escaneo previo (2026-09-29, sesión de ejecución 1)

| Par / tarea | Qué produce ↔ qué consume | Resultado |
|---|---|---|
| T1 ↔ T2 | tabla de piezas: rutas `images/arte/*.webp`, `icons/*.png` ↔ `visuals.ts` apunta a ellas | coherente; recuento comprobado: 31 salidas = 22 WebP + 9 PNG (4+4+6+2+6 y 2+4+3) |
| T1 ↔ T4 | script y su tabla `PIEZAS` ↔ T4 lo lanza y `art-files.test.ts` fija presupuestos | coherente; ambos citan la misma tabla |
| T1 ↔ T6 | borrar `iconos-pwa.py` y menciones en README ↔ T6 vuelve a tocar README | sin conflicto (T6 poda, no reintroduce) |
| T2 ↔ T3 | `cursor` en `CosmeticVisual` ↔ T3 lo consume en `TrailLayer` | orden T2 → T3 ya fijado en el plan |
| T3 ↔ T5 | `globals.css` (regla del cursor) ↔ T5 (tokens) | ficheros compartidos, zonas distintas |
| T4 ↔ T5 | `MapScreen.tsx` (galería y candado) ↔ T5 (superficies) | mismo fichero, orden T4 → T5 |
| T1 internamente | OP1-OP8 ↔ contrato: OP8 (1024×1100 → recorte 1:1 → 512) y OP6 (200 < 384) cuadran con el recorte sin ampliar | coherente |
| T2-T6 internamente | no releídas en detalle (T2 y T3 se releen al despacharlas; T4-T6 esperan al arte) | pendiente de relectura por tarea |

Sin conflictos que exijan `Ruling:` antes de la T1.

## Ejecución

- Task 1: complete (commits 4a79b9b..6a73cc3, review clean; effort medium, 0 rondas de corrección, mutaciones 1 y 2 muertas)
- Task 1: minor (deferred): OP1 no comprueba `img.format` (WEBP/PNG) de cada salida
- Task 1: minor (deferred): ningún test comprueba que OP1 no emite `aviso:` con orígenes cuadrados
- Task 1: minor (deferred): docstring de `optimizar-arte.py:118` dice «cuenta» donde quiere decir «lista»; comentario de `manifest.ts` (~l. 9) redundante tras quitar la «S»
- Task 1: minor (deferred): la escritura no es atómica (disco lleno a mitad deja un lote parcial); V4 solo cubre la validación
- Nota: los tests del script tardan ~30 s (method=6); la T4 lanza el script en segundo plano.
- Task 2: complete (commits 4131a26..5629e15, review clean; effort high, 0 rondas de corrección, 4 mutaciones muertas: AR5, AR7, AR9, AR3)
- Task 2: minor (deferred): `cosmeticVisual` usa `COSMETIC_VISUALS[id] ?? …` (visuals.ts:85-89), así que `cosmeticVisual("toString")` devuelve una función; igualar con `Object.hasOwn` como `rewardArt`. No se dispara hoy (los ids vienen de `resolveEquipped`)
- Task 2: minor (deferred): cast `REWARD_ART[rewardId] as Art` evitable (visuals.ts ~121)
- Task 2: minor (deferred): `withCap` reutiliza el emoji del compañero: si falla `companion-N-gorra.webp`, el respaldo es el animal sin gorra (así lo dice el brief)
- Task 2: minor (deferred): `className="block"` en `TrailLayer` (~93) choca con `inline-flex` del respaldo; solo cosmético
- Task 2: minor (deferred): AR9 comprueba 2 de las 6 clases del `img` de fondo; no hay test de que la miniatura de fondo del álbum caiga al degradado tras `error`
- Task 2: ⚠️ para T4/T5 (no verificable sin arte): `bg-espacio` detrás de texto del mapa (LE1-LE3), y `Companion` a 112 px junto al botón 🎁 de 72 px en `MapScreen`; `onError` con el arte ausente en `pnpm build`/e2e
- Ruling: los emojis de respaldo se cambian en la T4, no ahora — la T2 ya está revisada y aprobada, y es una línea por compañero; si fuera un error, alguien ve 🐣 en vez de 🦜 solo cuando la imagen no carga
- Idea aparcada (no es del Plan 7): **objetos para los compañeros** (pajarita, gafas redondas, bufanda, corona, capa) como capas transparentes sueltas, ganadas con hitos distintos. Pide cosméticos y logros nuevos en el motor, y resolver el anclaje por compañero. Va a «Después» del README
- Task 3: complete (commits 04017e4..21915fc, review clean; effort medium, 0 rondas de corrección; mutaciones del brief 1-4 muertas y 10 finas del revisor muertas, 1 sobrevive)
- Task 3: minor (deferred): falta un test de cambio directo entre dos rastros con cursor (`trail:estrellitas` → `trail:burbujas`) en `TrailLayer.test.tsx`: la mutación de deps `[cursor === null, fino]` sobrevive. Añadir en la T5 o al cerrar (equipar `trail:burbujas` en `act`, comprobar `data-trail-cursor` y `--trail-cursor` = `url("/icons/cursor-burbuja.png") 16 16`)
- Task 3: minor (deferred): JSDoc de `Mouth` en `Mouth.tsx` con una línea de más de 150 caracteres (cosmético)
- Task 3: ⚠️ para T4/T5 (no verificable en jsdom): que `cursor: var(--trail-cursor), auto` surta efecto en un navegador real con `(pointer: fine)`, y que `layout.tsx` no pise los atributos de `<html>` al hidratar; se comprueba con `browser-qa` en la T4/T5
- Task 3: nota: el implementador cambió `svg[data-shape]` por `[data-shape]` en `Presentation`, `Evaluation`, `SayIt.integration` y `PlantillasDev` (la boca es ahora un `div`); el revisor verificó que no perdieron fuerza. Si un fotograma falla, la boca se queda en el SVG mientras siga montada (sin reintento)
- Ruling: el hueco del test de cambio entre rastros con cursor se difiere como `minor` en vez de abrir ronda de corrección — el código es correcto (deps del efecto incluyen `id` y `cursor`) y el brief solo nombra el caso en prosa; si fuera un error, una refactorización futura del efecto podría dejar un cursor obsoleto sin que ningún test lo detecte
- Ruling: las **bocas se aplazan** (2026-09-29): el autor probó dos veces el arte de la boca y no le gustó (fotorrealista, desagradable, choca con D21 «esquemática, no realista»); la T4 integra las otras 21 piezas y **no publica ningún `mouth-*.webp`**. La boca sigue con el SVG esquemático por el `onError` de la T3 (V7), sin cambios de código. Por qué no publicar las bocas actuales: el autor las rechaza y un niño las vería. Por qué no una bandera en código: obligaría a tocar los tests BO1-BO3 recién aprobados. Coste si es equivocado: seis peticiones 404 por sesión con boca (silenciosas; el respaldo pinta el SVG) hasta que llegue el arte nuevo. Ajustes en la T4: el script se ejecuta con los 27 orígenes (valida todo) hacia una carpeta temporal y solo se copian a `public/` las salidas que no son `mouth-*`; **FI2** pasa a «todo o nada» (si existe algún `mouth-*.webp`, existen los seis y pesan < 30 KB; si no existe ninguno, pasa y deja constancia con un comentario); se omite la parte de bocas de la hoja de contacto. Deuda viva para el README: la boca sigue esquemática hasta que haya arte aprobado (la sección 5 de `docs/arte-plan-7-prompts.md` queda por rehacer)
- Ruling: los orígenes están en `.../Downloads/silabin-arte-plan-7/silabin-arte-plan-7/` (el zip se extrajo dos veces). La T4 usa esa ruta anidada y no se mueve nada en Downloads — es una ruta, no tocar ficheros del autor; si fuera equivocado, la precondición de D32 apunta a una carpeta que no coincide con la real y hay que corregirla en el plan
- Ruling: el icono de la app ocupa el 81 % × 83 % del cuadro, no el 70 % de V5, y aun así la T4 declara `maskable` como manda el plan — la cabeza es casi circular y las facciones quedan dentro del círculo seguro del 80 %; coste si es equivocado: en Android con máscara circular se recortan unas plumas del contorno. Si molesta, se regenera con más margen
- Ruling: la T4 hace también los emojis de respaldo de D36 (`visuals.ts`, `Companion.tsx` y sus tests): 🐣→🦜 y 🦊→🐘, incluido `five-vowels` (`visuals.ts:62`, usa `companion-2`)
- Task 4: complete (commits 76c07b1..f80f3fb, review clean; effort medium, 0 rondas de corrección; 3 mutaciones del implementador + 13 del revisor, 11 muertas y 2 sobreviven; build OK con 117 entradas precacheadas (3493 KiB), e2e 4/4 con J4 sin red, suite 1363 pasan)
- Task 4: 25 salidas publicadas (16 WebP y 9 PNG, ~746 KB), sin `mouth-*` por el Ruling de las bocas
- Task 4: minor (deferred): sobrevive 🦊 en lugar de 🐘 en `five-vowels` (`visuals.ts:62`): ningún test fija el emoji de respaldo de las piezas de `REWARD_ART`. Añadir un test parametrizado del respaldo de `rewardArt` (la T5 o la T6, junto a otro test de `visuals`)
- Task 4: minor (deferred): rama `cosmetic === null` de `Companion.tsx:22` con 🐣→🦜 es código muerto (`resolveEquipped(...).companion` siempre trae compañero); borrar o cubrir
- Task 4: minor (deferred): `art-files.test.ts:57` `expect(rutas.length).toBe(18)` obliga a subir el número a mano al añadir un cosmético con fichero nuevo; mejor mínimo + presencia del conjunto obligatorio
- Task 4: minor (deferred): comentario de `manifest.ts:7-9` afirma que el personaje solo pierde el fondo con la máscara; el icono ocupa el 81 % y una máscara circular recortaría plumaje (Ruling del icono); corregir el comentario en la T6
- Task 4: minor (deferred): FI5 falla con «expected undefined to be 'true'» si falta el icono; afirmar antes `not.toBeNull()` sobre la imagen
- Task 4: ⚠️ para el autor: la prueba de que el arte es apto para niños (bocas incluidas, aplazadas)
- Task 5: primer despacho abortado (2026-09-29) — el plugin `frontend-design` no estaba instalado cuando se despachó (el coordinador dio por hecho lo que el autor dijo sin comprobarlo en `~/.claude-personal/plugins/`); se instaló después y solo lo cargan las sesiones nuevas. Antes de parar, el implementador dejó el commit `79566f6` (los menores diferidos 4a y 4b: test parametrizado del emoji de respaldo de `rewardArt` y cambio directo entre dos rastros con cursor; **sin revisar**, sus mutaciones no constan) y un `tokens.test.ts` sin commitear, descartado. La T5 se relanza desde `e3f53ca`+`79566f6` con la skill; queda pendiente el punto 4c (cursor en navegador real)
- Ruling: se conserva `79566f6` en vez de revertirlo — es independiente del diseño y cubre dos menores que ya estaban rulados; coste si es equivocado: dos tests con mutaciones sin verificar, que la revisión de la T5 comprueba con sus propias mutaciones
- Task 5: implementada, pendiente de la PUERTA DEL AUTOR (commits 79566f6, cf7a9b3..26df843; effort medium; 0 rondas; revisión NO despachada hasta que el autor apruebe la paleta en `/dev/arte`). Puertas: test 1392 pasan, typecheck y lint verdes, `pnpm build` verde, e2e 4/4. Mutaciones del implementador: 4a, 4b, las 4 del plan y 4 extras, todas mueren, ninguna sobrevive
- Task 5: 4c hecho en Chromium de escritorio con `pointer: fine` (`@playwright/test` del repo contra `pnpm dev`): el cursor cambia en caliente entre rastros y con `trail:none` vuelve a `auto`; `layout.tsx` no pisa `class` ni `lang` de `<html>`; en táctil no hay cursor. No probado en WebKit ni en iPad real (D11)
- Task 5: cambios de token: `action` #F5B83D→#F9BE23 (loro), `celebrate` #FF9F1C→#E99810 (ámbar de las pegatinas); el resto se queda. Detalle y ratios en `docs/diseno-visual.md`
- Ruling: la banda del mapa es `bg-surface`, no `bg-card` — el botón de la galería y la barra de estrellas (`bg-card`) desaparecerían sobre `bg-card`; coste si es equivocado: una clase en `MapScreen.tsx`, `RewardsScreen` y el fin de sesión (LE1-LE3 aceptan ambas)
- Ruling: puntos de avance de `bg-calm` a `bg-calm-border` (`data-unit-dot`) — `calm` sobre `surface` da ~1,1:1 y no se veía; `calm-border` da 3,53:1; coste: vuelven a ser casi invisibles, una clase
- Ruling: barra de estrellas de `h-2` a `h-3` con `border-2 border-calm-border` — la pista sobre la banda da 1,06:1 sin borde, con borde 3,72:1; coste: barra más gruesa, una clase
- Ruling: la marca de «guardado» pasa a ficha redonda `bg-card` de 40 px — era texto pintado directamente sobre el fondo (V13); coste: un ✓ dentro de un círculo blanco, una clase
- Ruling: se atenúa el contenido y no la ficha (`data-dim`) en unidades bloqueadas, la activa «llega después» y «Repasar» — con `opacity-*` en la ficha el fondo se ve a su través y la superficie no es opaca (V13); cambia U7 de `MapScreen.test.tsx`; coste: las fichas bloqueadas se mezclan con el fondo (LE1 lo detecta)
- Ruling: LE cuenta también `[data-cosmetic]` como indicadores y la galería lleva bandas `bg-surface` por sección — los bordes de estado solo cumplen 3:1 sobre `surface`/`card`; coste: LE2 exige menos si se quita
- Ruling: `manifest.test.ts` H1 usa `THEME_COLORS` en vez de hex literales — CO3 ata `THEME_COLORS` a los tokens; coste: un hex más que mantener a mano
- Ruling: las bocas de `/dev/arte` se pintan tras montar (`useMontado`) — `Mouth` renderizado en servidor pierde el `onError` y deja fotogramas rotos; coste: bocas con imagen rota en `/dev/arte`, solo en desarrollo
- Task 5: ⚠️ para el autor: los ★ (`celebrate`) quedan a 2,34:1 sobre `card` y 2,22:1 sobre `surface`, por debajo de 3:1 (antes 2,05:1); llegar a 3:1 exige un ocre oscuro (~#C47A00, 3,4:1 sobre `card`). Decisión abierta: aceptar o cambiar
- Task 5: minor (deferred): `Mouth.tsx` no funciona si se renderiza en el servidor (su `onError` no salta y los fotogramas quedan rotos); en la app no pasa porque sale tras un toque; endurecer cuando lleguen las bocas
- Task 5: minor (deferred): el `ring-4 ring-action` de la unidad activa del mapa es del mismo color que su fondo y no se ve (anterior a la T5)
- Task 5: minor (deferred): el MCP de Playwright no funciona en este entorno (pide `/opt/google/chrome/chrome`); browser-qa se hace con `@playwright/test` del repo
- Ideas aparcadas (2026-09-29): refactor de diseño por pantallas con `frontend-design` en un plan aparte, tras aprobar la paleta
- Task 5: PUERTA DEL AUTOR superada (2026-09-29): el autor vio /dev/arte y el mapa y dijo «SE VE BIEN». No se pronunció aparte sobre los ★ a 2,34:1; el ⚠️ sigue abierto en el ledger hasta que lo confirme. Revisión despachada (BASE e3f53ca, HEAD 26df843)
- Task 5: revisión (Sonnet, `review-e3f53ca..26df843`): spec ✅, calidad Approved, 0 Critical, 1 Important; 13 de 16 mutaciones del revisor mueren. Sobreviven: b4 (banda `bg-surface` de «Álbum» de `RewardsScreen.tsx:206`, Important: `INDICADORES` sin `[data-reward]` y LE2 gana todos los logros), c1 (`--color-danger: rgb(...)` ignorado por el lector de tokens) y h (la atenuación de unidades bloqueadas del mapa no tiene test)
- Task 5: fix round 1/2 despachada al implementador original (Important b4 + menores c1, h y dos de docs); commits pendientes
- Ruling: los menores 1, 2, 3 y 4 de la revisión entran en la ronda 1 junto al Important — un solo despacho reanudado cuesta menos que abrir un plan de deuda; cubren reglas críticas (lector de tokens, «lo bloqueado se ve atenuado») y un doc que ya es falso; coste si es equivocado: una ronda con más superficie de diff de la necesaria, que la re-revisión acotada comprueba
- Task 5: minor (deferred): la regex `\bbg-` de `legibility.test.tsx:1128` casa también con `hover:bg-card`/`disabled:bg-card`; hoy no hay ninguno; endurecer con `(?<![\w:-])` si aparece
- Task 5: minor (deferred): la fórmula de contraste y la lista de pares están duplicadas en `ArteDev.tsx` y `tokens.test.ts`, y los pares del test no leen la tabla del `.md`
- Task 5: ⚠️ sin verificar por el revisor (los resuelve el coordinador): dominantes Pillow de `docs/diseno-visual.md` y origen de `#E99810` en `sticker-10`; `pnpm build` y `pnpm e2e` los corrió el implementador (verdes), no el revisor
