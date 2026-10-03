# Silabín Plan 7, correcciones de la pasada sobre el preview: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** cerrar los dos fallos que dejó abiertos la pasada de verificación del 2026-10-02
antes del PR del Plan 7:
- **A (I9):** tras cambiar el acento en el panel, la voz queda muda;
- **B (C3/H2):** en apaisado bajo, `trace`, `build` y el fin de sesión hacen scroll.

**Architecture:**
- **A:** un solo reproductor durante toda la vida de la app.
  - `createSpeechPlayer` lee el acento en vivo, con un getter, al elegir voz y `lang`.
  - `App.tsx` deja de recrear el reproductor al cambiar el acento.
  - Se conservan el `unlocked` y el `AudioContext` que se desbloquearon en el gesto de
    «Empezar».
  - La interfaz `AudioPlayer` no cambia.
- **B:**
  - Una variante de Tailwind para apaisado bajo reordena y compacta las tres pantallas.
  - Un e2e nuevo en `e2e/` mide el scroll en Chromium. Sustituye la aritmética que falló en C3.

**Tech Stack:** el del Plan 7, sin dependencias nuevas: Next.js 16, React 19, Tailwind 4,
Vitest, Biome y Playwright.

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md`:
- §2: sonido y no nombre;
- §9: «sin scroll dentro de un ejercicio», «horizontal y vertical; el trazo usa el lado corto
  como referencia» y objetivos ≥ 72 px.

La regla del 60 % está en `docs/superpowers/plans/2026-09-27-silabin-trazo.md:72`.

**Ledger:** `docs/superpowers/2026-09-29-plan-7-registro.md`, sección «Plan de corrección
(2026-10-02)». Allí están los Rulings V17-V22 con su porqué y su coste.

## Global Constraints

- `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit.
- TDD: primero el test que falla y luego el código.
- TypeScript estricto, sin `any`.
- `features/` y `components/` no deciden pedagogía. `audio/` no importa React.
- Conventional Commits en español, con el porqué en el asunto. Termina con
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Objetivos táctiles ≥ 72 px, separados ≥ 16 px. Ningún ejercicio ni el fin de sesión hacen
  scroll.
- La letra ocupa al menos el 60 % del lado corto (trazo, l. 72). Se mide como en el Ruling 5
  del plan de trazo: el lienzo contra el lado corto del viewport.
- Unidades de alto en `svh`, no en `vh` ni en `screen`. En Safari con la barra visible, `vh`
  es más alto que lo que se ve.

## Review Focus

1. **Dos cambios de acento seguidos** (mx y luego do) antes de que suene nada: suena el
   último. Lo cubre un test de la T7.
2. **`voiceschanged` llega después de cambiar el acento**, como pasa en iOS, donde las voces
   llegan tarde: debe elegir la voz del acento actual, no la del inicial. Lo cubre un test de
   la T7.
3. **Cambio de acento con algo sonando:** la frase termina y la siguiente usa el acento nuevo,
   sin excepción ni cola colgada. Lo cubre un test de la T7 (Ruling V18).
4. **No hay regresión en vertical ni en iPad** al compactar para apaisado bajo:
   - 360×640 y 390×844 deben seguir sin scroll;
   - en 1194×834 y 834×1194, el lienzo de `trace` no puede encoger.

   Lo cubre el e2e de la T8.
5. **El peor caso de cada pantalla, no el cómodo:**
   - `trace` con tinta, porque aparecen «Borrar» y «Listo»;
   - `build` con las 6 piezas en la bandeja y con una ya colocada, que lleva la insignia
     numerada;
   - el fin de sesión con al menos un logro.

   Lo cubre el e2e de la T8.

---

## Tarea 7: un solo reproductor; el acento se lee en vivo (defecto A, I9)

**Riesgo:** contrato entre `audio/` y `App`, y toca el sonido (principio del spec §2).
**Effort:** `high`. Revisión completa con mutaciones.

**Files:**
- Modify: `src/audio/speech-player.ts`:
  - `Deps` (l. ~31-38);
  - la elección de voz (l. ~163-169);
  - el `lang` de la utterance (l. ~237).
- Modify: `src/features/App.tsx`:
  - la fábrica `createAudio` (l. 41-44);
  - el comentario y las props de `App` (l. ~96-110);
  - se borra el efecto S3 (l. 130-143).
- Test: `src/audio/speech-player.test.ts`, con un `describe("acento en vivo")` nuevo.
- Test: `src/features/App.test.tsx`. Se reescribe N8 (l. 252-273) y se ajusta
  `reproductorFalsoCon` a la firma nueva.
- Si el test de `App` necesita el sintetizador falso de `speech-player.test.ts`
  (`FakeUtterance` y `FakeSynth`, l. 11-67), se extrae a `src/audio/fake-synth.ts`, sin
  lógica nueva, y lo importan los dos tests. No se duplica.

**Interfaces:**
- `createSpeechPlayer(deps: { synth; accent: Accent | (() => Accent); textFor?; beat? }): AudioPlayer`.
  - Con un `Accent` literal se comporta como hoy. `PlantillasDev.tsx` y los 13 tests
    existentes no cambian.
  - Con una función, el acento se lee en cada uso.
- `App` cambia `audioFactory` a `(accent: () => Settings["accent"]) => AudioPlayer`.
  - La fábrica real, `createAudio`, recibe ese getter.
  - `App` la llama **una sola vez**, tras `load()`, con
    `() => store.getState().doc.settings.accent`.
- La interfaz `AudioPlayer` de `src/audio/types.ts` **no cambia**.

**Detalle delicado (por esto falla hoy, y por esto no se arregla con `unlock()` sobre un
reproductor nuevo):**
- El acento cambia después de un `await guardar(...)` en `updateSettings`, fuera de cualquier
  gesto.
- Un reproductor nuevo crea su propio `AudioContext` en `createClicker`. Si se reanuda fuera
  del gesto, en iOS queda suspendido, `beat()` no suena y se rompe `count-syllables`, que es
  la primera unidad.
- Además, el contexto anterior nunca se cierra.

Por eso, el mismo reproductor. Dentro de él:
- **`lang`:** cada `perform` resuelve el acento actual y su `ACCENT_LANG`.
- **Voz:** se cachea junto con el acento para el que se eligió.
  - Si el acento actual difiere del cacheado, se vuelve a elegir con
    `pickVoice(synth.getVoices(), actual)`.
  - El listener de `voiceschanged` también usa el acento **actual**, no el capturado al crear.
- **`unlocked`:** ni `generation` ni `unlocked` se tocan al cambiar el acento.

**Casos de test.** Todos fallan antes del arreglo, salvo los que se marcan como regresión.

`speech-player.test.ts`, en un `describe("acento en vivo")`:
1. **Getter `mx` y luego `do`.** Con `accent: () => actual`, `actual = "mx"`, voces es-MX y
   es-DO, `unlock` y `play`, la utterance lleva la voz es-MX. Después:
   - `actual = "do"` y `play`: voz es-DO y `lang` "es-DO";
   - `unlocked` sigue en `true`.
2. **Dos cambios seguidos antes de sonar.** Sin voces disponibles: `mx`, luego `neutro`,
   luego `play`. La utterance lleva `lang` "es-US", porque cae a `ACCENT_LANG`.
3. **`voiceschanged` tras el cambio.** Se crea con `getVoices()` vacío y `actual = "mx"`;
   luego `actual = "do"`, llegan voces es-MX y es-DO y se dispara `voiceschanged`. El `play`
   siguiente usa es-DO.
4. **Cambio con algo sonando.** Primer `play` en `mx` sin `onend` todavía; se cambia a `do` y
   se lanza un segundo `play`. Al `onend` del primero:
   - el segundo sale con es-DO;
   - las dos promesas resuelven.
5. **Regresión.** Con `accent: "mx"` literal, todo igual que A7. Los tests existentes siguen
   en verde sin tocarlos.

`App.test.tsx`, N8 reescrito:
- **Preparación.** `fabrica = vi.fn((getAccent) => createSpeechPlayer({ synth: fakeSynth, accent: getAccent, beat: vi.fn() }))`.
  - Con el reproductor **real**, no con `props.audio`, porque `props.audio` desactiva justo el
    camino que falla.
  - Se pasa el `SpeechSynthesisUtterance` falso, con `vi.stubGlobal` si hace falta.
- **Pasos:**
  1. Pulsar «Empezar». Es el camino real de `unlock`, desde `StartScreen`.
  2. `await act(() => store.getState().updateSettings({ accent: "mx" }))`.
  3. `fabrica.mock.results[0].value.play({ key: <una clave del manifiesto> })`.
- **Se afirma:**
  - `fabrica` se llamó **exactamente 1 vez**;
  - `fakeSynth.speak` recibió, además de la locución vacía del unlock, una utterance con
    `lang` que empieza por "es-MX".
- **Hoy falla.** La fábrica se llama 2 veces y el segundo reproductor nace bloqueado: `play`
  no habla.
- Se borra el test «con `audio` inyectado, cambiar el acento no crea un reproductor nuevo»
  (l. 275-284), porque ya no hay efecto que lo justifique. Ruling V19.

**Mutaciones obligatorias.** Cada una debe hacer fallar al menos un test; el implementador
informa del resultado de cada una:
- M1: restaurar en `App` la recreación con `factory(accent)` al cambiar el acento.
- M2: el listener de `voiceschanged` usa el acento inicial.
- M3: `utterance.lang` usa el acento inicial.
- M4: la voz cacheada no se invalida al cambiar el acento.
- M5: `unlocked = false` al detectar un cambio de acento.

**Criterios de aceptación:**
- Los 5 casos y N8 pasan; los 13 tests existentes de `speech-player` siguen sin cambios.
- `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde.
- El comentario de `App` describe el getter, no S3.

- [ ] **Paso 1:** extraer `FakeSynth`/`FakeUtterance` si `App.test` los necesita; tests verdes.
- [ ] **Paso 2:** escribir los casos 1-4 de `speech-player` y verlos fallar
      (`pnpm vitest run src/audio/speech-player.test.ts 2>&1 | tail -20`).
- [ ] **Paso 3:** implementar el getter en `speech-player.ts`; casos 1-5 en verde.
- [ ] **Paso 4:** reescribir N8 contra la firma nueva y verlo fallar con la recreación aún
      presente (adaptada la firma, sin quitar el efecto).
- [ ] **Paso 5:** quitar el efecto S3 y llamar a la fábrica una vez con el getter; N8 en verde.
- [ ] **Paso 6:** mutaciones M1-M5, revertidas una a una.
- [ ] **Paso 7:** puertas y commit, por ejemplo
      `fix(audio): el acento se lee en vivo para que el reproductor desbloqueado no se pierda al cambiarlo`.

---

## Tarea 8: apaisado bajo sin scroll en `trace`, `build` y fin de sesión (defecto B, C3/H2)

**Riesgo:** estilos de las pantallas del ejercicio central, sin lógica.
**Effort:** `medium`. Revisión de cumplimiento con las medidas. Sin mutaciones: el e2e es la
protección, Ruling V20.

**Files:**
- Modify: `src/app/globals.css`. Añadir una variante:
  `@custom-variant apaisado-bajo (@media (orientation: landscape) and (max-height: 500px));`.
  - Nombre y umbral se pueden ajustar si la medida lo pide; se anota en el ledger.
  - El umbral deja fuera al iPad (834 de alto) y dentro a los teléfonos en horizontal
    (360-430).
  - Ya existe `@custom-variant short (@media (max-height: 760px))` en `globals.css:35`.
    Antes de añadir otra variante, busca con `grep -rn "short:" src` dónde se usa. Si
    combinar `landscape:short:` basta sin tocar el iPad mini en horizontal (744 de alto), se
    reutiliza; si no, se crea la nueva. La elección y su porqué van en el informe.
- Modify: `src/features/session/SessionScreen.tsx:305-310`. Cabecera y relleno más
  compactos en `apaisado-bajo`, si hace falta. La cabecera conserva su botón de salir de
  48 px: es del adulto y no cuenta para los 72 px.
- Modify: `src/features/session/trace/Evaluation.tsx:241-290`.
  - **Medidas hoy en Chromium, sin barra del navegador:**

    | Viewport | Alto disponible | Botones | Lienzo |
    |---|---|---|---|
    | 640×360 | ~248 px tras cabecera y relleno | columna 80+72+72+2×16 = 256 | `landscape:h-[85vh]` = 306 |
    | 667×375 | — | «Listo» acaba en y=383 | — |
    | 852×393 | — | caben | — |

  - **Arreglo:**
    - en `apaisado-bajo`, el lienzo mide contra el alto que queda (`svh` menos cabecera y
      rellenos);
    - la franja de botones cabe en ese alto, con menos hueco o con «Oír otra vez» separado,
      a elección del implementador;
    - los botones siguen ≥ 72 px y separados ≥ 16 px.
  - Se conserva el hueco fijo de Borrar/Listo: la franja no cambia de tamaño al soltar el
    primer trazo, por el comentario de las l. 243-249.
- Modify: `src/features/session/build/Evaluation.tsx:262-297`. En `apaisado-bajo`, «Oír» y
  las casillas a un lado y la bandeja al otro (o en una fila), sin scroll. Se conservan:
  - el hueco de 28 px donde cabe la mano del modelo;
  - la insignia numerada (`-bottom-5 -left-5`) dentro de pantalla.
- Modify: `src/features/session/EndScreen.tsx:74-77`.
  - `min-h-screen` pasa a `min-h-svh`.
  - En `apaisado-bajo`: compañero, ★ y logros en fila, o con tamaños menores, sin scroll.
  - Hoy hay 48 px de scroll a 640×360.
- Create: `e2e/apaisado.spec.ts` y, si hacen falta, helpers nuevos en `e2e/helpers/`:
  - portados de `~/qa-silabin/specs/lib.ts`: `docHasta`, `docConSilabas`, `avanzarHasta`
    y `empezar`;
  - adaptados a los helpers del repo (`seed.ts`, `solve.ts`), sin rutas absolutas a
    `~/qa-silabin`.

**Contrato del e2e (`e2e/apaisado.spec.ts`).** Corre en el proyecto `iphone`, que es
Chromium. Cada test fija el viewport con `page.setViewportSize`. Una función `medir(page)`
devuelve:
- `scroll = document.documentElement.scrollHeight - innerHeight`;
- las cajas de los botones del niño;
- la caja del lienzo, en `trace`.

Casos, en estos viewports: **640×360, 667×375 y 852×393**, más **360×640** y **1194×834** para
detectar regresiones:
1. **`trace`, sin tinta y con tinta.** Un trazo con el ratón o con `dibujarGlifo`, para que
   aparezcan «Borrar» y «Listo». Se afirma:
   - `scroll <= 0`;
   - «Oír otra vez», «Borrar» y «Listo» enteros dentro del viewport y ≥ 72 px;
   - lado corto del lienzo ≥ 0,6 × `min(innerWidth, innerHeight)`.
   - En 1194×834, el lienzo no es más pequeño que hoy. El implementador mide y anota el
     valor de hoy antes de tocar nada y lo fija como límite inferior en el test.
2. **`build`**, con la semilla 2 y `docConSilabas()`. Se mide con la bandeja llena y otra vez
   tras colocar una pieza. Se afirma:
   - `scroll <= 0`;
   - todas las piezas y casillas enteras dentro del viewport;
   - la insignia de la pieza colocada, dentro del viewport.
3. **Fin de sesión.** Se completa una sesión con `resolverSesion` y se afirma `scroll <= 0`
   y el compañero, las ★ y cada `[data-reward]` dentro del viewport.
   - El documento sembrado debe dar al menos un logro: se afirma `[data-reward]` ≥ 1.
   - Si ningún documento sembrable lo da, se deja como Ruling en el informe, con el cálculo
     del margen para una fila de logros de 96 px.

**Criterios de aceptación:**
- Los casos 1-3 fallan antes del arreglo en 640×360 y 667×375; queda el log en el informe.
- Después, pasan en todos los viewports.
- Los e2e existentes (`fase1`, `offline`) siguen en verde: `pnpm exec playwright test 2>&1 | tail -20`.
- `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde.
- El implementador adjunta capturas de 640×360 de las tres pantallas en
  `.superpowers/sdd/plan-7/`.
- En el informe va la tabla de medidas antes y después: scroll, y (fondo de «Listo»), alto
  del lienzo.

- [ ] **Paso 1:** portar los helpers y escribir `e2e/apaisado.spec.ts`; verlo fallar en
      640×360 y 667×375, y anotar las medidas de hoy (incluida la del lienzo en 1194×834).
- [ ] **Paso 2:** variante `apaisado-bajo` y `trace`; caso 1 en verde en todos los viewports.
- [ ] **Paso 3:** `build`; caso 2 en verde.
- [ ] **Paso 4:** `EndScreen` (y la cabecera de `SessionScreen`, si hizo falta); caso 3 en
      verde.
- [ ] **Paso 5:** e2e completos y puertas; commit, por ejemplo
      `fix(session): el apaisado bajo no hace scroll en trazo, construir y fin de sesión`.

---

## Después de las dos tareas

1. **Revisión final** de la rama sobre el diff de T7+T8, con `model: "opus"` y effort
   `high`.
2. **Despliegue de preview.** Lo dispara el autor o un commit vacío, como en `10d8b40`.
3. **Re-medida contra el preview** con el arnés `~/qa-silabin` (Ruling V22):
   - `ipad-acento.spec.ts` en `webkit-ipad`, con síntesis simulada: tras cambiar a
     Dominicano y a Mexicano, sin recargar, hay elocuciones con el `lang` nuevo;
   - `layout-trace.spec.ts` en `chromium-640x360` y con `VP=667x375`.
4. **Actualizar** `docs/checklist-ipad.md` (I9, H2 y C3), el ledger y el README.
   - Si C3 queda protegido por el e2e, la trampa de la «aritmética optimista» sale del
     README.
5. **PR** del Plan 7.
