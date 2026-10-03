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
| Arte (D32) | **hecho salvo las bocas** (2026-09-29): 21 de las 27 piezas integradas; las 6 bocas se aplazaron (Ruling de la T3) |
| Correcciones A y B (2026-10-02) | **planificadas** (T7 y T8, V17-V22; ver «Plan de corrección» al pie). Pendiente la ejecución en Sonnet |
| Ejecución | **T1-T6 hechas** (2026-09-29). Pendientes: decisión del autor sobre los ★, revisión final de la rama (Opus), despliegue y checklist del autor, y el PR. Ver «Estado final» al pie |

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
| 3 | **completa** (`04017e4..21915fc`) | 0 | 1 (la mutación de deps `[cursor === null, fino]` de `TrailLayer`; diferida y cerrada después en `79566f6`) |
| 4 | **completa** (`76c07b1..f80f3fb`) | 0 | 2 (una: 🦊 por 🐘 en `five-vowels`, cerrada en `79566f6`; la otra n/d, el ledger no la nombra) |
| 5 | **completa** (`e3f53ca..943baa2`; `79566f6` viene de su primer despacho abortado) | 1 | 3 de 16 tras la revisión completa (b4 banda «Álbum», c1 lector de tokens, h atenuación de bloqueadas); las 3 cerradas en la ronda 1 y las 3 mueren en la repetición del revisor |
| 6 | **completa** (commit de cierre; revisión de cumplimiento pendiente, la despacha el coordinador) | n/d | n/a (docs, sin mutación) |
| 7 (defecto A) | pendiente; plan en `docs/superpowers/plans/2026-10-02-silabin-plan-7-correcciones.md` | | |
| 8 (defecto B) | pendiente; mismo plan | | |

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
- Task 4: minor (deferred): el recuento de mutaciones del ledger no cuadra: «3 mutaciones del implementador + 13 del revisor» (16, o 13 en total según cómo se lea) frente a «11 muertas y 2 sobreviven» (13), y solo se nombra una superviviente (🦊 por 🐘, ya cerrada en `79566f6`); la otra es n/d. No se puede reconstruir sin repetir la revisión; la tabla de progreso lo declara «n/d»
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
- Task 5: minor (deferred): la regex `\bbg-` de `src/features/legibility.test.tsx:33` casa también con `hover:bg-card`/`disabled:bg-card`; hoy no hay ninguno; endurecer con `(?<![\w:-])` si aparece
- Task 5: minor (deferred): la fórmula de contraste y la lista de pares están duplicadas en `ArteDev.tsx` y `tokens.test.ts`, y los pares del test no leen la tabla del `.md`
- Task 5: ⚠️ sin verificar por el revisor (los resuelve el coordinador): dominantes Pillow de `docs/diseno-visual.md` y origen de `#E99810` en `sticker-10`; `pnpm build` y `pnpm e2e` los corrió el implementador (verdes), no el revisor
- Task 5: fix round 1/2 (4 addressed, 0 open — Important b4 banda «Álbum» con LE2b, c1 lector de tokens que lanza, h atenuación bloqueadas con U7b, docs de ★ 1,93:1 y «Pendiente»; commits e567a4d, 943baa2). Re-revisión acotada: all findings addressed; las 3 mutaciones mueren también en la repetición del revisor; sin Critical ni Important nuevos
- Task 5: complete (commits e3f53ca..943baa2, review clean tras 1 ronda; effort medium; 1 ronda de corrección; mutaciones que sobreviven a la revisión completa: 3 de 16, todas cerradas en la ronda). Coordinador: `pnpm test` 1394 pasan; el ⚠️ del origen de `celebrate` resuelto (dominante de `sticker-10` medido con Pillow: #E99812 ≈ #E99810)
- Task 5: minor (deferred): un `--color-x: #rrggbb` sin `;` antes de `}` lo ignora `leerTokens` (exige CSS mal formado); y `cierra = css.indexOf("}", abre)` corta en la primera `}` del bloque `@theme inline` si algún día hay una dentro
- Task 5: ⚠️ ABIERTA para el autor: decidir si los ★ (`celebrate`) se quedan a 2,34:1 sobre `card`, 2,22:1 sobre `surface` y 1,93:1 sobre `calm`, o pasan a un ocre oscuro (~#C47A00, 3,4:1 sobre `card`); decidir antes de la revisión final de la rama
- Task 6: complete (cierre del plan, docs; commits 431171a..8f2312b, revisión de cumplimiento con 1 ronda de corrección: Important = deudas del README de más de 2 líneas, corregido y re-revisado, all findings addressed). `docs/checklist-ipad.md` creada (4 grupos: iPad I1-I15, iPhone H1-H5, PWA P1-P9, PC C1-C6, con tabla de resultados); README (estado, sección del Plan 7, hoja de ruta, D32-D36, `images/`, `optimizar-arte.py` y `/dev/arte`, siguientes pasos), poda al archivo, `diseno-visual.md` («Pendiente»), cabecera de `arte-plan-7-prompts.md` y comentario de `manifest.ts:7-9` corregido. Puertas: `pnpm test` 1394 pasan (1 omitido), typecheck, lint, `pnpm build` y `pnpm e2e` en verde
- Ruling: la poda funde entradas en vez de resolverlas — para caber en 10 deudas al añadir las bocas y los minors del Plan 7, se fundieron la 5 (ilustraciones) con los glifos V10, y la 6, la 7 y la 9 (minors de los Planes 2, 3 y 6) en una; ninguna se pudo convertir en test ni cerrar sin tocar código. El texto original está en `docs/archivo-trampas-y-deuda.md`. Coste si es equivocado: una entrada fundida pierde detalle en el README, pero no en el archivo
- Ruling: entra **una trampa viva** (`optimizar-arte.py` genera las seis bocas y no deben copiarse a `public/`) — FI2 acepta «ninguna o las seis», así que un test no la ve; coste si es equivocado: una línea del README de más
- Ruling: el test del emoji de respaldo de `REWARD_ART` (menor de la T4) **no** va a la deuda porque ya lo cubre `79566f6` (`visuals.test.ts`, incluido `five-vowels` → 🐘); el brief lo daba por pendiente. Tampoco el test de cambio entre rastros (menor de la T3), ya en `TrailLayer.test.tsx`
- Ruling: se corrige también la línea de `docs/despliegue-vercel.md` que aún decía «la «S» provisional» (el icono ya es el loro) y se enlaza el checklist — es un doc que ya era falso, una línea; coste si es equivocado: ninguno
- Ruling: la lista del Plan 5 no aporta puntos al checklist — sus 8 puntos constan como confirmados (2026-09-28); solo se repiten I1, I3 y P8 porque cambian con el despliegue HTTPS real y con la PWA
- Ruling: la decisión de los ★ **no se resuelve** aquí; consta como abierta en el README («Siguientes pasos») y en `diseno-visual.md` («Pendiente»)
- Task 6: minor (deferred): la deuda 7 del README (minors del Plan 6) dice que faltan tests de `{capture, passive}` en `TrailLayer` y de la navegación del 🎁; no se ha reverificado si el Plan 7 (T3, `79566f6`) cubrió alguno. Comprobar al tocar `TrailLayer`

## Estado final (2026-09-29)

**El Plan 7 está ejecutado en su rama (T1-T6) y sin fusionar.**

| Tarea | Estado | Rondas de corrección | Mutaciones supervivientes |
|---|---|---|---|
| 1 · Tubería del arte | completa | 0 | 0 |
| 2 · El arte en la interfaz | completa | 0 | 0 |
| 3 · Cursor y boca | completa | 0 | 1 (diferida, cerrada en `79566f6`) |
| 4 · Integración del arte | completa | 0 | 2 (una cerrada en `79566f6`; la otra n/d) |
| 5 · Paleta y legibilidad | completa | 1 | 3 (cerradas en la ronda) |
| 6 · Cierre | completa (1 ronda: deudas del README > 2 líneas) | n/d (docs, sin mutación) | n/a |

Puertas al cierre de la T6: `pnpm test` 1394 pasan (1 omitido), `typecheck`, `lint`,
`pnpm build` y `pnpm e2e` en verde.

**Lo que queda, en orden:**
1. **⚠️ Decisión del autor sobre los ★ de `celebrate`** (2,34 : 1 sobre `card`, 2,22 : 1 sobre
   `surface`, 1,93 : 1 sobre `calm`, o un ocre oscuro ~#C47A00). Abierta; decidir antes de la
   revisión final.
2. Revisión final de la rama (Opus).
3. El autor despliega en Vercel y pasa `docs/checklist-ipad.md` (cierra la deuda 1 y la prueba
   manual del Plan 6, D35). Los fallos vuelven a este ledger.
4. PR de `feat/plan-7-identidad-visual` contra `main`.

**Deuda viva que sale del plan** (README): las bocas aplazadas (deuda 5), los glifos sin arte
(V10, en la 6) y los `minor (deferred)` de T1-T5 (deuda 8). Trampa viva: no publicar `mouth-*`
desde `optimizar-arte.py`.
- Task 6: minor (deferred): la única trampa viva del README (`optimizar-arte.py` genera las 6 bocas y no deben copiarse a `public/`) ocupa 5 líneas (CLAUDE.md pide 1-2); recortar en el próximo cierre
- Task 6: minor (deferred): al recortar la deuda 8 se perdió el paréntesis «(usa `@playwright/test` del repo)»; restaurarlo en el bloque de `docs/archivo-trampas-y-deuda.md`
- Task 5: Ruling del autor (2026-09-29): **acepto 2,34 : 1** para los ★ de `celebrate` (sobre `card`; 2,22 : 1 sobre `surface`, 1,93 : 1 sobre `calm`). Se queda `celebrate` como está, sin ocre oscuro — porque los ★ van siempre con un número, la pegatina o la forma (★ llenas y vacías) y el `aria-label`, y un ocre oscuro deja de leerse como celebración — si fuera equivocada, costaría una tarea de corrección de tokens (ocre ~#C47A00) con nueva medición de contraste. Cierra la ⚠️ ABIERTA de la T5; README y `docs/diseno-visual.md` se actualizan en el cierre.
- Task 5 (cierre de los ★): docs por implementador sonnet, commits a7db150..f028099; revisión de cumplimiento con 1 ronda de corrección (2 Important: remisiones colgantes a «Abierto para el autor» en `docs/diseno-visual.md:82` y `docs/checklist-ipad.md:437`), re-revisión acotada: 2 addressed, 0 open. README y `docs/diseno-visual.md` ya no presentan los ★ como abiertos («Decisiones del autor»). Sin mutación (docs).
- Task 5: minor (deferred): `docs/diseno-visual.md:81-84` mezcla punto y coma decimales (2.34 / 2,34), ya así antes del cierre
- Estado (2026-09-29, tras el Ruling del autor): la ⚠️ de los ★ queda cerrada; siguiente paso, revisión final de la rama (Opus).
- Final review (Opus, 618e6b3..e99e8c3): 0 Critical, 1 Important, 5 Minor; veredicto «con arreglos». Important 1: la trampa de las bocas (`optimizar-arte.py` publicaría las 6 bocas rechazadas; FI2 acepta «ninguna o las seis») se puede convertir en test; el README decía lo contrario. Minor 1 (Mouth pide 6 webp inexistentes → 404 por montaje) y Minor 2 (comentarios de `Mouth.tsx`) van con el mismo arreglo.
- Final review: Ruling: interruptor único `BOCAS_PUBLICADAS = false` exportado desde `Mouth.tsx`; con `false`, `Mouth` pinta solo la boca esquemática y FI2 exige que no haya ningún `mouth-*.webp` (con `true`, las 6 y < 30 KB); el script no cambia — porque así la trampa pasa a ser test (CLAUDE.md: opción preferida) y se quita la regresión de 404 — si fuera equivocado, cuesta cambiar una constante y un test cuando el autor apruebe las bocas, o revertir el interruptor.
- Final review: Ruling: las `minor (deferred)` de T1-T5 y las de T6 (salvo la trampa de 5 líneas y el paréntesis perdido, que se cierran en el despacho de corrección) NO bloquean el PR, según el triage del revisor Opus: son tooling de desarrollo, cosmética o tests algo frágiles sin riesgo para el niño; siguen en la deuda 8 del README — si fuera equivocado, cuesta una tarea de limpieza en el Plan 8.
- Final review: minor (deferred): `cosmeticVisual` con `Object.hasOwn` (una línea) y quitar/recolorear el `ring-4 ring-action` de la unidad activa del mapa (ya estaba en `main`), al tocar esos ficheros
- Final review: cerrado por el coordinador en el ledger: l.229 citaba `legibility.test.tsx:1128` (es `src/features/legibility.test.tsx:33`); la deferida de T6 de la deuda 7 queda reverificada por el revisor: el 🎁 sí está cubierto (`App.test.tsx:295`, anterior al Plan 7) y `{capture, passive}` sigue sin afirmarse, como ya dice el README y `docs/archivo-trampas-y-deuda.md:324-328`. Nota histórica: donde V5/V8 dicen «zorrito» y «pollito» se entiende «loro» y «elefantito» (D36).
- Final review: fix wave 1/1 (commit 62dd6ce, `BOCAS_PUBLICADAS`): re-revisión acotada 4 addressed, 0 open; 3 mutaciones reproducidas por el revisor (+1 extra), ninguna sobrevive; puertas: 1398 tests (1 omitido), typecheck y lint en verde.
- Final review: parked — `docs/diseno-visual.md:172-176` sigue diciendo que `Mouth` cae al esquemático «por el `onError`» y que «FI2 exige los seis o ninguno»; falso tras 62dd6ce — Ruling: real pero solo documentación, nada depende de ello, y el skill no permite una segunda ola de corrección; no bloquea el PR; se corrige en un commit de docs aparte antes del PR si el autor lo pide, o en el Plan 8. Si fuera equivocado, costaría que alguien lea una descripción obsoleta de las bocas.
- Final review: minor (deferred): BP1 (`Mouth.test.tsx`) compara con `BOCAS_PUBLICADAS ? 6 : 0` y no fija el valor actual; lo cubren FI2 y BP2-BP4
- Estado (2026-09-29): revisión final cerrada (`Final review clean` salvo lo parked). Falta: el autor despliega en Vercel y pasa `docs/checklist-ipad.md`; después push y PR (los pide el autor).
- Final review: parked cerrado — commit 9a5cf0d corrige `docs/diseno-visual.md` (viñeta de las bocas: `BOCAS_PUBLICADAS` y FI2 estricto en vez del `onError`); implementador sonnet, `pnpm lint` y `typecheck` en verde; diff de 10 líneas leído por el coordinador contra `Mouth.tsx` y `art-files.test.ts` (sin subagente revisor, por ser solo docs de una viñeta). Ya no queda nada parked.

## Pasada de verificación sobre el preview (2026-10-02)

**Método y alcance.** Arnés fuera del repo (`~/qa-silabin`, Playwright con los navegadores del
repo) contra el preview del commit `10d8b40`, más lo que el autor probó a mano en el iPad real.
Cada resultado lleva su método; **nada emulado cierra la deuda 1** (hardware real). Métodos:
«emulado WebKit iPad Pro 11» (ratón sobre WebKit; sin táctil real); «Chromium con viewport iPad
Pro 11» (el helper de trazo del repo solo funciona en Chromium); «Chromium iPhone 13», «Chromium
360×640», «Chromium 640×360», 667×375 y 852×393; «Firefox de Playwright, 1280×800, ratón» y
«Chromium de escritorio 1280×800». Los documentos se sembraron en IndexedDB con las recompensas
de la receta de «Antes de empezar» de la checklist, salvo el I5 (exportado del propio navegador,
editado a mano e importado por la UI).

**Sesión anterior (mismo preview).** Smoke en WebKit iPad Pro 11 sin errores. e2e J1, J2 y J4
pasan en Chromium iPhone 13 contra el preview. J2 (minúsculas con trazo) va como nota en I7 y J4
(sesión completa sin red) como nota en P4, **sin marcarlos OK**. En WebKit el helper de trazo no
funciona (limitación del helper, no de la app) y el `reload` offline da error interno de
Playwright.

**Hecho a mano por el autor (iPad real).** I10 con gorra OK (sin gorra no lo probó a mano); I11
OK; I14 OK; I15 OK con nota: la boca esquemática no se anima (deuda 5, `minor (deferred)`). I12 e
I13: no reportados.

| ID | Resultado | Método |
|---|---|---|
| I4 | OK | emulado WebKit iPad Pro 11 |
| I5 | OK parcial | emulado WebKit iPad Pro 11; exportación del mismo navegador, no «de otro dispositivo»; el `<input type="file">` con el dedo sin probar (deuda 4) |
| I9 | **Falla** (defecto A) | WebKit iPad Pro 11, síntesis real y simulada |
| I10 | OK | autor (con gorra); emulado (sin gorra, documento sembrado) |
| I11, I14 | OK | autor (I11 además emulado: los 4 fondos cargan) |
| I15 | OK con nota | autor; falta la prueba con niño |
| H2 | **Falla** (defecto B) | Chromium 640×360, 667×375 y 852×393 |
| H3 | OK | emulado Chromium 360×640; falta iPhone real |
| C1, C2 | OK parcial | emulado Chromium y Firefox de escritorio |
| C3 | **Falla** (640×360); OK (360×640) | Chromium (defecto B) |
| C4 | OK | emulado Firefox, ratón; táctil sin probar |
| C5 | OK parcial | emulado Chromium y Firefox; voz en español y acento sin probar (`getVoices()` vacío en headless) |
| I1-I3, I6-I8, I12, I13, H1, H4, H5, P1-P9, C6 | en blanco | dispositivo real, o sin probar (notas en la tabla de la checklist) |

**Descartado (no es defecto):** «Invalid Date» en el resumen del I5 (fechas inventadas mal en la
primera corrida; con fechas válidas sale «30/9/2026») y «Oír otra vez» fuera de pantalla en
360×640 (transitorio de la entrada; la medida estable es y=104).

- ⚠️ ABIERTO, defecto A (I9): **tras cambiar el acento en el panel, la voz queda muda hasta
  recargar y pulsar «Empezar».** Evidencia, WebKit iPad Pro 11 con síntesis simulada: 9
  elocuciones (es-US) antes; 0 tras elegir Dominicano; 0 tras Mexicano, sin recargar la página
  (marca intacta). Tras recargar y pulsar «Empezar» con Mexicano: 9 elocuciones en es-MX. Con la
  síntesis real de WebKit: 3, 1 y 0 elocuciones. Causa leída en el código:
  `src/features/App.tsx:136-143` crea un reproductor nuevo con `factory(accent)` al cambiar el
  acento; nace con `unlocked = false` (`src/audio/speech-player.ts:155`) y `play` sale sin sonar
  (`:341`); `unlock()` solo se llama desde `src/features/start/StartScreen.tsx:53`. Los tests no
  lo ven: `src/features/App.test.tsx:252` (N8) usa una fábrica de reproductores falsos y solo
  afirma que se llama a la fábrica y a `stop()` del anterior. Toca el audio (sonido como
  principio, spec §2). El arreglo es una tarea con implementador, revisión y mutaciones,
  `Effort: high`, y debe traer un test con reproductor real (o su `unlocked`) que falle sin el
  arreglo.
- ⚠️ ABIERTO, defecto B (C3/H2): **en apaisado y pantallas bajas, `trace` y `build` desbordan;
  el fin de sesión también.** `trace` (Chromium, sin barra del navegador, así que es lo
  optimista): a 640×360, «Oír otra vez» (80×80), «Borrar» y «Listo» (72×72) quedan en columna a
  la izquierda (y=121-201, 217-289, 305-377); «Listo» acaba en y=377 (17 px fuera), el lienzo
  acaba en y=402, scroll de 58 px y en la captura el pie de la A queda cortado. A 667×375,
  «Listo» acaba en y=383 (> 375), scroll de 56 px. A 852×393 los botones caben (y=391) pero el
  lienzo acaba en y=430, scroll de 53 px. `build` a 640×360: scroll de 49 px y las 6 piezas por
  debajo del borde (la bandeja). Fin de sesión a 640×360: scroll de 48 px; en la captura no se
  ve «Continuar». A 360×640 vertical está bien en todo. La franja de `trace` está en
  `src/features/session/trace/Evaluation.tsx` (~l. 244-272) y la bandeja de `build` en
  `src/features/session/build/Evaluation.tsx` (~l. 262-300). Contradice la hipótesis «cabe» de
  `docs/checklist-ipad.md` (C3: «hasta ahora solo se razonó por aritmética»): la aritmética era
  optimista. Toca el trazo, el ejercicio central de la pedagogía.
- Estado (2026-10-02): la deuda 1 **sigue abierta** (hardware real pendiente). Decisión del autor
  pendiente sobre A y B antes del PR: arreglarlos antes o aplazarlos.
- La tabla de resultados de `docs/checklist-ipad.md` se rellenó con esta pasada.

## Plan de corrección (2026-10-02)

Decisión del autor (2026-10-02): **arreglar A y luego B antes del PR.** El plan es
`docs/superpowers/plans/2026-10-02-silabin-plan-7-correcciones.md`, escrito en Opus, con dos
tareas:
- **T7 (A):** `Effort: high`, con mutaciones M1-M5.
- **T8 (B):** `Effort: medium`, protegida por un e2e.

Se ejecuta en Sonnet, con un corte de sesión entre T7 y T8.

- **V17 · A se arregla con un solo reproductor y el acento leído en vivo; no se recrea el
  reproductor con `unlock()`.**
  - Por qué: el acento cambia tras el `await guardar(...)` de `updateSettings`, fuera del
    gesto.
  - Un reproductor nuevo crea otro `AudioContext` (`createClicker`), que en iOS no se reanuda
    sin gesto. `beat()` quedaría mudo y se rompería `count-syllables`, que es la primera
    unidad. Además, el contexto anterior nunca se cierra.
  - Coste si fuera un error: si alguna voz de iOS no respetara el `lang` o la `voice` por
    utterance, el acento no cambiaría hasta recargar. Hoy ya se fija por utterance.
- **V18 · El cambio de acento ya no llama a `stop()`.**
  - Por qué: el panel de padres es del adulto y casi nunca suena nada mientras está abierto.
    Lo encolado termina y lo siguiente sale con el acento nuevo.
  - Coste si fuera un error: una frase en el acento anterior termina de sonar.
- **V19 · `audioFactory` de `App` pasa a recibir un getter; `AudioPlayer` no cambia.**
  - Se borra el test «con `audio` inyectado, cambiar el acento no crea un reproductor nuevo»,
    porque ya no existe el efecto S3 que lo justificaba.
  - Coste si fuera un error: ninguno funcional. Es la costura de test de `App`.
- **V20 · B se protege con un e2e en `e2e/apaisado.spec.ts` (Chromium), no con mutaciones.**
  - Por qué: jsdom no mide layout, y la hipótesis de C3 («cabe por aritmética») resultó
    falsa. Es la vía 1 de «Trampas y deuda»: la trampa pasa a ser test.
  - Coste: el e2e alarga `pnpm exec playwright test` unos minutos. No mide la barra de Safari,
    que queda para el dispositivo real (deuda 1).
- **V21 · El «60 % del lado corto» es la regla del plan de trazo (l. 72).**
  - Se mide como en su Ruling 5: el lienzo contra el lado corto del viewport.
  - Además, en 1194×834 el lienzo no puede encoger respecto a hoy.
  - Coste si fuera un error: un lienzo algo menor en teléfonos en horizontal. El iPad no
    cambia.
- **V22 · La puerta de cada tarea son los tests del repo, no el preview.**
  - Al final hay un solo despliegue y se vuelven a pasar:
    - `ipad-acento.spec.ts` en `webkit-ipad`, con síntesis simulada, para A;
    - `layout-trace.spec.ts` en `chromium-640x360` y a 667×375, para B.
  - Por qué: cada despliegue lo dispara el autor, y esperar uno por tarea frena sin dar más
    señal que el e2e local.
  - Coste: un fallo que solo aparezca en el build de Vercel se vería al final.

