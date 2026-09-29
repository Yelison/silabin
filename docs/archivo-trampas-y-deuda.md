# Archivo de trampas y deuda menor

Texto completo de las trampas y la deuda menor tal como estaban en el README al cerrar el
Plan 4 (2026-09-27), más lo que salió del README al cerrar los Planes 5, 6 y 7 (secciones
«Plan 5», «Plan 6» y «Plan 7» del final). **No se lee al retomar**: el README solo guarda lo
vivo (ver la regla de poda en `CLAUDE.md`). Consulta aquí el detalle con `grep -n` cuando una
entrada del README remita a él.

## Trampas conocidas

Las trampas 1-8 salieron de la cabecera del registro del Plan 1; cada una era un bug real si
se ignoraba. Estado tras el Plan 2:

1. ✅ **El mapa debe recalcular al cargar.** Resuelta: `withProgress` en
   `src/store/progress-bridge.ts` pasa siempre por `recomputeUnitStatuses`, y `startSession`
   (`src/engine/session.ts`) recalcula las unidades antes de decidir la activa (R1).
2. ✅ **`activeUnitId` devuelve `string | null`.** Resuelta: `null` da una sesión de solo
   repaso (D4, `planReviewOnly` en `engine/planner.ts`).
3. ✅ **`saveState` devuelve `{ saved: boolean }`.** Resuelta: el store guarda tras cada paso
   y `SaveWarning` (`src/features/adult/`) avisa al adulto con `saveFailed`; reintenta en el
   siguiente guardado (D5).
4. ✅ **`unitMasteryRatio` devuelve `1` para una unidad vacía.** Resuelta en el Plan 5
   (T1, e91db39): ya no sale del barril `@/engine` y el test C3 (`PODADOS` en
   `src/engine/index.test.ts`) falla si vuelve a exportarse. Si algún día una barra de
   progreso necesita ese dato, usa `isUnitComplete`, que devuelve `false` para una unidad
   vacía.
5. ✅ **El historial de sesiones no se escribía.** Resuelta: `appendSession` en
   `progress-bridge.ts`, llamada desde `app-store.ts` al terminar cada sesión.
6. ✅ **Exportar no tenía interfaz.** Resuelta con una exportación mínima (D6):
   `ExportGesture` en `src/features/adult/`. **Importar** desde la interfaz sigue siendo del
   Plan 6.
7. ✅ **iOS exige un gesto antes de cualquier audio.** Resuelta: la primera pantalla es
   `StartScreen` («Toca para empezar») y todo audio pasa por la cola de `AudioPlayer`.
8. ✅ **Los tests de componentes necesitan `jsdom`.** Resuelta en el Plan 5 (T1, e91db39):
   `vitest.config.ts` usa `test.projects` (`node` para `*.test.ts`, `jsdom` para
   `*.test.tsx`), y los centinelas `src/test-env.test.tsx` y `src/test-env-node.test.ts` fallan
   si se rompe. Ya no hace falta el comentario `// @vitest-environment jsdom`.
9. ✅ **Cerrada para `trace` en el Plan 4 y para `say-it` y `read-word` en el Plan 5 (T2,
   fefe69f y 1229fbe: `submitSpeech` y el invariante de `evaluable.test.ts`).** Texto original
   (Plan 4): `checkAnswer` lanza para un ítem sin respuesta que comparar
   (`expectedAnswer` devuelve `null`), pero `trace` ya no pasa nunca por ahí: `submitTrace`
   (`src/engine/session.ts`) es su propio camino de evaluación, con `scoreTrace` contra la
   geometría de referencia de la letra (D17), y `submitAnswer` lanza explícitamente si se le
   pasa un ejercicio `trace` («usa `submitTrace`, no `submitAnswer`»); `SessionScreen` solo
   llama a `submitAnswer`/`answer` para las plantillas de toque. `say-it` y `read-word` siguen
   sin evaluador propio (`expectedAnswer` les devuelve `null` igual que a `trace` antes de
   esta tarea) y siguen siendo inofensivas solo porque la Fase 1 y la 2 aún no son jugables
   (D14): hay que resolverlas en el Plan 5 antes de desbloquearlas, con una guarda o un camino
   de evaluación propio como el de `trace`, o el niño topará con una excepción a mitad de
   sesión.

---

## Deuda menor aceptada

Nada de esto bloquea, salvo lo que se marca como pendiente. Detalle en los registros (busca
`minor (deferred)`). Las notas visuales están en [`docs/diseno-visual.md`](docs/diseno-visual.md).

**Pendiente de la parte del Plan 2**

- **Prueba manual en iPhone/iPad.** El autor probó el Plan 2 con `pnpm dev` en Edge y Chrome
  (D11): sesiones, pistas y guardado bien. `createIdbAdapter`, `createSpeechPlayer` y
  `downloadInBrowser` reales solo se han comprobado a mano en Chromium, y ningún test las
  cubre en un navegador de verdad.
- **Comprobar en navegador que instrucción y palabra suenan seguidas sin cortarse** al empezar
  una evaluación (la palabra suena sola desde la revisión final, I1). Solo se probó con audio
  falso y por lectura del código.
- **`importState` movido al Plan 6 (D9).** Existe en `persist.ts` pero no está cableado al
  store ni a la interfaz. Contrato fijado: un import deliberado del adulto sustituye `doc`
  entero y quita `readFailed` (y `recovered`); si no, la app quedaría bloqueada sin escribir.
- **Tras un fallo de lectura de IndexedDB no se guarda nada** (I3): `guardar` no escribe
  mientras `readFailed`, para no pisar un documento bueno que solo no se pudo leer. «Reintentar»
  solo desbloquea si el disco está vacío; con un documento real no hace nada visible (no hay
  fusión de documentos) y hay que recargar la app. El niño sigue jugando en memoria y el
  adulto puede exportar desde `SaveWarning`.

**Plan 2, interfaz y accesibilidad** (la base visual del Plan 3 pudo resolver alguna; no se
ha reverificado)

- `EndScreen` con 0 estrellas pinta un `<span>` vacío con `aria-label`; hoy el motor no
  genera una corrida vacía, y un plan de 0 ejercicios haría `isSessionOver` verdadero al
  empezar y registraría 0 estrellas.
- Parpadeo en blanco al cerrar la sesión (`endSession` pone `run: null` antes del guardado).
- Objetivos táctiles por debajo de 72 px: los círculos del modelo (56 px) y el icono de
  `SaveWarning` (~36 px, y su panel sin `aria-modal` ni gestión de foco).
- El tambor usa `onClick` y no `pointerdown` (posible latencia en iPad), mide 224 px fijos
  (~576 px de alto total, con scroll en móvil apaisado), y `Presentation` no tiene botón de
  repetir.
- Con solo `recovered`, «Reintentar» de `SaveWarning` no cambia nada visible (el store no
  limpia `recovered`); con dos guardados en vuelo, un fallo antiguo puede pisar un
  `saveFailed: false` más nuevo (el disco queda bien, solo el aviso).
- `void endSession().then(...)` y `void presentationDone()` sin `.catch`; en StrictMode la
  instrucción puede sonar dos veces.

**Plan 2, motor, audio e imágenes**

- `planReviewOnly` repite unas 30 líneas de `makeExercise`; si cambia la regla del nivel de
  distractor, los dos modos divergen.
- `createSilentPlayer` y un `synth` indefinido no llaman a `onSegment`, así que la interfaz no
  debe depender de él para avanzar. El listener de `voiceschanged` no se quita y `AudioPlayer`
  no tiene `dispose` (un reproductor por aplicación). `startsWith("es")` aceptaría códigos
  de tres letras.
- Emoji de respaldo (ya solo salen si la ilustración no carga): los de Unicode 13/15 (🪽 🫏 🫓 🫖 🛖) pueden salir como cuadrado en
  Android/Windows antiguos, `👎` (mala) y `😠` (malo) rozan el principio de «sin mensajes
  negativos», `🍼` para «pipa» es dudoso, y el invariante I1 no detecta entradas huérfanas.
- Huecos de test conocidos (mutaciones supervivientes): `startSession` con `seed`,
  `masteredAt === now`, el orden de `run.resolutions`, el desempate `lastSessionIndex` del
  modo normal, y un invariante que solo mire el primer elemento de `introduces`.
  `boundaries.test.ts` no detecta `require(...)`.

**Plan 3 (abiertas al cerrar la rama; el detalle está en el registro, busca `minor (deferred)`)**

- **Ilustraciones, a criterio del autor:** `una` (uña) parece una mano con uñas pintadas y puede
  leerse como «mano»; `asa` es una taza entera y puede leerse como «taza»; `sumo` va con el
  torso descubierto; iglú y velo tienen poco contraste sobre `--color-calm` a 96 px. `mama`,
  `mimo`, `pelo`, `uno`, `escoba` y `ala` llegan al borde del cuadro, el estilo es mixto
  (personas más planas que los objetos 3D) y `mala` y `tomate` tienen rojo dominante. `pipa` es
  un biberón a propósito (en República Dominicana «pipa» es el biberón).
- **`scripts/optimizar-ilustraciones.py`:** solo cuenta 65 PNG y no valida los nombres contra
  el currículo (un sobrante no lo caza nadie), y un fallo a mitad deja WebP parciales en
  `public/`. Tampoco se ha corrido contra `/mnt/c` ni comprobado el precacheo de la PWA.
- **Navegadores sin probar:** Safari iOS y Firefox, sobre todo el arrastre de `build` (solo se
  verificó en Chromium); la lista de verificación del Plan 6 debe incluir tocar y arrastrar.
- **Sin medir en 360 × 640:** scroll con tres imágenes (presentación de `phoneme:a` e
  `initial-sound`), la cabecera de `hear-it`, y la bandeja de `build` con unas 13 piezas de
  72 px. La mano de `OptionCard` marcada solapa unos 17 px la tarjeta y en `compact` puede
  rozar la letra. El aspecto de los iconos dentro de `BigButton`/`ReplayButton` tampoco se ha
  visto en un navegador. El emoji de respaldo de `Picture` (~128 px) ocupa menos que la imagen
  de 160 px: pequeño salto de layout.
- **Audio y presentaciones:** si `audio.play` nunca resuelve ni rechaza, las presentaciones de
  `hear-it`, `listen-tap` y `rhyme` (y la `sequence` de `ChoiceEvaluation`) dejan al niño sin
  avanzar; hay que comprobar que el `AudioPlayer` real siempre resuelve o rechaza.
  `PAUSE_MS` de `listen-tap` puede bajar a 0 sin que falle ningún test.
- **Motor y duplicaciones:** el patrón `letter:${phoneme}` está repetido en `answers.ts` y
  `planner.ts` (un `letterIdOf` lo unificaría); `picture:${item.text}` y la partición «inicio +
  resto» (`onsetRequest`) están escritas en línea en `hint-effects.ts` y las presentaciones;
  `expectedPieces` y `reducedPieces` lanzan ante datos incoherentes; M11 barre 200 semillas por
  unidad (determinista, pero de cobertura probabilística).
- **Huecos de test:** `layout="grid"`, la cancelación de la secuencia por `token` y
  `ReplayButton disabled={locked}` en `choice/`; `pointercancel`, `attemptKey` durante un
  arrastre y el `dimmed` del resto de piezas en `build`; el rung 2 de `PlantillasDev.test.tsx`
  (herramienta de desarrollo); `jugarSesion` en `Phase0.integration.test.tsx` solo exige
  `evaluaciones > 0`; `PAUSE_MS`.
- ✅ **`build` no sale por la vía normal:** el planificador aún no saca `build` en `phase2:m`, así
  que `build/SessionFlow.test.tsx` inyecta la corrida con `store.setState` (R24). Cuando la
  unidad sea jugable (Planes 4 y 5), sustituir la inyección. **Resuelta en el Plan 5 (T7,
  1b23591):** el test carga un documento con la Fase 2 activa y `letter:m` dominada, y la
  semilla fija de `crearStore` planifica un `build` de `syllable:ma`; el helper
  `documentoConUnidadesHechas` vive en `features/test-support.tsx`. La última aserción pasó de
  «`onEnd` se llama una vez» (la corrida inyectada tenía un solo ejercicio) a «pasa al ejercicio
  siguiente, queda `assisted` y `onEnd` no se llama»: es lo mismo (la sesión avanza) sin depender
  de una corrida de un solo ejercicio.
- **Tarea 6:** un `pkill` de procesos `next` en el puerto 3000 durante la implementación y la
  revisión; si el autor tenía un `pnpm dev` en marcha, hay que relanzarlo.
- **Para el Plan 6:** el mapa no enseña ningún avance hasta completar una unidad (5-6 sesiones
  en `phase0:clap`), y ni el niño ni el adulto ven que se guarda.

**Plan 2, tests y limpieza**

- T4: el test de `app-store.test.ts` «abandonar restaura progress desde el documento»
  exagera lo que comprueba (renombrarlo); la guarda `isSessionOver` de `endSession` duplica
  la de `finishSession`, y `beginSession`, `answer` y `presentationDone` no comprueban
  `status === "loading"`; los tests del puente se pasaron a verde antes de verificar el rojo
  (sin efecto duradero).
- T5: `current` en `speakOne` es de solo escritura a propósito (retiene la utterance contra
  el GC) y falta un comentario que lo diga para que nadie lo borre por muerto.
- T6: el test del nombre del fichero de exportación no discrimina fecha local de UTC con
  `TZ=UTC`.
- T7: la guarda `alive` tras `feedback:retry` es defensiva y sin efecto observable.
- T8: `Presentation.tsx:906` `onClick={onDone}` sin guardia propia, neutralizada por `busy`
  de `SessionScreen`.
- T1 (proceso, trivial): el mensaje del commit sobre T1.1 es inexacto: el test falló primero
  por la función inexistente, no por las unidades de Fase 2.

**Plan 1**

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

**Plan 5 (2026-09-28): lo que salió del README al podarlo**

Del registro del Plan 5 (`docs/superpowers/2026-09-27-plan-5-registro.md`, busca `minor (deferred)`).

- **M14 sobrevive:** nada prueba la segunda reproducción del ítem tras `PAUSE_MS` en
  `say-it/Presentation` (un test avanzaría `PAUSE_MS` y esperaría dos `phoneme:a` seguidos).
- **`/dev/plantillas` desborda 11 px en apaisado** por su rejilla de dos columnas; a ancho de
  sesión (992 px) cabe. Solo es una página de desarrollo.
- **`Palabra.tsx` usa `text-[min(8rem,26vw)]`** y no se ha comprobado que coincida con
  `Written size="lg"` (pulido visual).
- **Duplicación entre `say-it` y `read-word` `Evaluation`** (`hintBusy`, `VoiceTurn`): extraer un
  hook común solo si aparece una tercera plantilla de voz.
- **~~Las 35 `img:<palabra>` sin resolver~~ (falso, corregido tras la revisión final):** las 37
  palabras del currículo tienen imagen y un test lo exige (65 ficheros en
  `public/images/palabras/`).
- **Poda del README:** la deuda 4 (`build` inyectado) se cerró (ver arriba) y las trampas 4, 8 y
  9 pasaron a este archivo como resueltas.
- **M4 (revisión final):** un permiso de micrófono denegado se vuelve a pedir en cada ejercicio
  (`VoiceTurn.tsx`, `sinMicrofono` es estado por montaje). Con niños puede ser un aviso repetido.

**Plan 6 (2026-09-29): lo que salió del README al podarlo**

- **Deuda 1 anterior (prueba en dispositivos reales, texto completo):** iPhone/iPad y Firefox
  (sobre todo el arrastre de `build`), pantallas de 360 × 640, los adaptadores reales
  (`createIdbAdapter`, `createSpeechPlayer`, `downloadInBrowser`) y la prueba con niños de la boca
  (D21, y que desaparezca en la pista 2). Todo visto solo en Chromium. Micrófono, VAD y
  `AudioContext` en Safari iOS ya probados en dispositivo real (Plan 5). Pasa a
  `docs/checklist-ipad.md` del Plan 7; lo funcional del Plan 6 lo cubre la prueba manual del
  ledger.
- **Deuda 10 anterior, cerrada (D31):** el mapa no enseñaba avance hasta completar una unidad y
  nadie veía que se guarda; y del `trace` (D19), un botón de borrar y otro de confirmar. Resuelto
  en las Tareas 4 y 7 del Plan 6.
- **`importState` movido al Plan 6 (D9), resuelto:** cableado con `previewImport`/`importDoc` y
  la interfaz de `DataSection` (D27).
- **Deuda 3 anterior (fallo de lectura de IndexedDB), texto completo:** `guardar` no escribe
  mientras `readFailed`; «Reintentar» solo desbloquea con el disco vacío. Con un documento real
  hay que recargar, o **importar** una exportación (D27), que quita `readFailed`.
- **Minors por tarea del Plan 6** (todos en el ledger, `minor (deferred)`): T1 sombra de nombre de
  `totalStars`, fallback silencioso de `text` en `progress-report.ts`, asimetría `progressReport`/
  `unitProgress`; T2 comprobación muerta en `equip`, `verifyPin` con `===`; T3 `D1b` de
  `PlantillasDev` con aserciones débiles; T4 `handleStrokeStart` repite el patrón de
  `cancelarTemporizador`, `!disabled` incluye `locked`; T5 `ParentGate` sin `.catch` y el nombre
  del niño sin resincronizar; T6 input de fichero sin área táctil garantizada, sin mensaje tras
  «Reiniciar todo», `DataSection` en 220 líneas; T7 `role="img"` atípico y tests de la hora con
  la misma lógica que la implementación; T8 fallbacks repetidos en `Companion`/
  `CosmeticBackground`, sin test de `{capture, passive}` en `TrailLayer` ni del botón 🎁; T9
  `spawnSync("git")` en el route handler de precaché, `description` del manifest sin test, un
  flake puntual de N8; T10 solver limitado, errores de `dibujarGlifo` tragados, espera fija de
  3300 ms, J3 con `mouse`, selectores por `data-state`, `reuseExistingServer` con build viejo,
  J1/J2 solo miran `glifos[0]`, WebKit sin probar.
- **Pendiente heredado de la Tarea 4:** el layout apaisado 640 × 360 de la franja de 3 botones
  de `trace` se razonó por aritmética y no se ha verificado en pantalla; va a la prueba manual y
  a `checklist-ipad.md`.

**Plan 7 (2026-09-29): lo que salió del README al podarlo**

Al añadir las entradas del Plan 7 (bocas, minors del plan, arte a criterio) la deuda estaba en
el tope de 10, así que se fusionaron entradas. Ninguna se convirtió en test ni se resolvió: todas
siguen vivas, con el mismo contenido, en menos líneas.

- **Deuda 1 anterior (prueba en dispositivos reales):** iPhone/iPad, Firefox (sobre todo el
  arrastre de `build`), 360 × 640 y apaisado 640 × 360 (franja de botones de `trace`), los
  adaptadores reales y la prueba con niños de la boca (D21). Se escribía «sobre la versión con el
  arte final; la prueba manual del Plan 6 (ledger) cubre lo funcional». Ahora es
  `docs/checklist-ipad.md`, ya escrita, que incluye también la prueba del Plan 6.
- **Deuda 5 anterior, fusionada en la 6 (ilustraciones a criterio del autor):** `una`, `asa`,
  `sumo`, contraste de iglú y velo, imágenes al borde del cuadro, estilo mixto; emoji de
  respaldo dudosos. Se le añaden los glifos sin arte de V10.
- **Deuda 6 anterior, fusionada en la 7 (duplicaciones del motor y mutaciones supervivientes de
  los Planes 2 y 3):** `planReviewOnly` repite `makeExercise`, claves `letter:`/`picture:` en
  línea; lista en la sección «Plan 3» de este archivo.
- **Deuda 7 anterior, fusionada en la 7 (interfaz del Plan 2 sin reverificar):** parpadeo al
  cerrar sesión, `void ...` sin `.catch`, instrucción doble en StrictMode, `Presentation` sin
  botón de repetir.
- **Deuda 9 anterior, fusionada en la 7 (minors del Plan 6 sin arreglar):** `ParentGate` sin
  `.catch` en `setPin`/`checkPin`, el nombre del niño no se resincroniza dentro del panel,
  `DataSection` con 220 líneas, sin test de `{capture, passive}` en `TrailLayer` ni de la
  navegación del 🎁. (Su estado actual no se ha reverificado en el Plan 7: el ledger del Plan 6
  tiene el detalle.)
- **Minors por tarea del Plan 7** (todos en el ledger, `minor (deferred)`):
  - T1: OP1 no comprueba `img.format` de cada salida; ningún test comprueba que OP1 no emite
    `aviso:` con orígenes cuadrados; el docstring de `optimizar-arte.py` dice «cuenta» donde quiere
    decir «lista»; la escritura no es atómica (disco lleno a mitad deja un lote parcial).
  - T2: `cosmeticVisual` usa `COSMETIC_VISUALS[id] ?? …`, así que `cosmeticVisual("toString")`
    devuelve una función (igualar con `Object.hasOwn` como `rewardArt`; no se dispara hoy); cast
    `REWARD_ART[rewardId] as Art` evitable; `withCap` reutiliza el emoji del compañero (si falla
    `companion-N-gorra.webp` el respaldo es el animal sin gorra); `className="block"` de
    `TrailLayer` choca con el `inline-flex` del respaldo; AR9 comprueba 2 de las 6 clases del `img`
    de fondo y no hay test de que la miniatura de fondo del álbum caiga al degradado tras `error`.
  - T3: JSDoc de `Mouth` con una línea de más de 150 caracteres.
  - T4: `art-files.test.ts:57` `expect(rutas.length).toBe(18)` obliga a subir el número a mano al
    añadir un cosmético con fichero nuevo (mejor mínimo más presencia del conjunto obligatorio);
    FI5 falla con «expected undefined to be 'true'» si falta el icono (afirmar antes
    `not.toBeNull()`); rama `cosmetic === null` de `Companion.tsx:22` es código muerto
    (`resolveEquipped(...).companion` siempre trae compañero).
  - T5: `Mouth.tsx` no funciona si se renderiza en el servidor (su `onError` no salta y los
    fotogramas quedan rotos; en la app no pasa porque sale tras un toque); el `ring-4 ring-action`
    de la unidad activa del mapa es del mismo color que su fondo y no se ve (anterior a la T5); el
    MCP de Playwright no funciona en este entorno (pide `/opt/google/chrome/chrome`) y browser-qa
    se hace con `@playwright/test` del repo; la regex `\bbg-` de `legibility.test.tsx` casa también
    con `hover:bg-card`/`disabled:bg-card` (hoy no hay ninguno; endurecer con `(?<![\w:-])`); la
    fórmula de contraste y la lista de pares están duplicadas en `ArteDev.tsx` y `tokens.test.ts`, y
    los pares del test no leen la tabla del `.md`; un `--color-x: #rrggbb` sin `;` antes de `}` lo
    ignora `leerTokens`, y `cierra = css.indexOf("}", abre)` corta en la primera `}` del bloque
    `@theme inline` si algún día hay una dentro.
  - Ya resueltos durante el plan: el test parametrizado del emoji de respaldo de `REWARD_ART` y el
    del cambio directo entre dos rastros con cursor (`79566f6`), y el comentario del `manifest.ts`
    sobre la máscara (Tarea 6).
- **Glifos que quedan sin arte (V10):** 🔁 de «Repasar» (solo sale con el currículo agotado), ✓ del
  equipado y de «guardado», ✕ de salir (del adulto) y ★/☆ (glifos tipográficos con colores de
  token).
- **Bocas aplazadas:** ver Ruling en el ledger del Plan 7 (2026-09-29). Seis peticiones 404
  silenciosas por sesión con boca hasta que llegue el arte nuevo; el respaldo pinta el SVG.

**Plan 7, ronda de corrección 1 de la Tarea 6: texto completo de las deudas que se recortaron a dos líneas en el README**

- **Deuda 1 (prueba en dispositivos reales):** `docs/checklist-ipad.md` (escrita en el Plan 7) la
  pasa el autor una sola vez sobre el despliegue de Vercel: iPad, iPhone, la PWA instalada,
  Chrome y Firefox (el arrastre de `build`), 360 × 640 y 640 × 360, y los adaptadores reales de
  voz. Sigue viva hasta que la pase; no se automatiza porque depende de un dispositivo real (D11).
- **Deuda 2 (`AudioPlayer`):** debe resolver o rechazar siempre: si `play` se queda colgado, las
  presentaciones de `hear-it`, `listen-tap`, `rhyme` y `ChoiceEvaluation` no avanzan. No se puede
  automatizar con un invariante: depende de cada reproductor real.
- **Deuda 4 (accesibilidad y objetivos táctiles < 72 px):** círculos del modelo (56 px), icono de
  `SaveWarning` (~36 px, sin `aria-modal` ni foco), tambor con `onClick` y 224 px fijos, y el
  `<input type="file">` de importar (lo controla el navegador).
- **Deuda 5 (la boca sigue esquemática, bocas aplazadas, Plan 7):** el autor rechazó dos veces el
  arte fotorrealista y D21 pide una boca esquemática: no hay `mouth-*.webp` y `Mouth` pinta su SVG
  por el `onError`. Falta rehacer la sección 5 de `docs/arte-plan-7-prompts.md` con un estilo que
  apruebe el autor, y probar con un niño que cada forma se distingue a 128 px. Es una decisión de
  arte, no se automatiza.
- **Deuda 6 (arte y glifos a criterio del autor):** ilustraciones `una`, `asa`, `sumo`, contraste
  de iglú y velo, imágenes al borde, estilo mixto y emojis de respaldo dudosos; y los glifos sin
  arte (V10): 🔁 «Repasar», ✓ del equipado y de «guardado», ✕ de salir, ★/☆.
- **Deuda 7 (minors de los Planes 2, 3 y 6):** duplicaciones del motor y mutaciones supervivientes
  (`planReviewOnly` repite `makeExercise`), interfaz del Plan 2 sin reverificar, `ParentGate` sin
  `.catch`, `DataSection` de 220 líneas y tests de `TrailLayer` y del 🎁 que faltan. **Corrección:**
  lo del 🎁 ya no es cierto (el botón usa el icono de galería; `map/MapScreen.test.tsx` FI6 prohíbe el
  emoji y `features/App.test.tsx` hace clic en «Mis premios»). Comprobado en el repo el resto que sigue
  vigente: `ParentGate` sin `.catch` (`setPin`/`checkPin`), `DataSection` de 220 líneas y ningún
  test de `{capture, passive}` en `TrailLayer`. Sin reverificar: la interfaz del Plan 2 y la
  duplicación del motor.
- **Deuda 8 (minors del Plan 7):** el script (sin comprobar `img.format`, escritura no atómica),
  `visuals.ts` (`cosmeticVisual("toString")`), `art-files.test.ts` con `toBe(18)` y FI5 sin
  `not.toBeNull()`, rama muerta en `Companion.tsx:22`, `Mouth` no funciona renderizada en
  servidor, `ring-4 ring-action` invisible en la unidad activa, la regex `\bbg-` de
  `legibility.test.tsx`, la fórmula de contraste duplicada (`ArteDev.tsx` y `tokens.test.ts`),
  `leerTokens` con `}` o sin `;`, y el MCP de Playwright caído en este entorno. Desglose por tarea
  arriba, en «Minors por tarea del Plan 7».
- **Deuda 10 (e2e frágil):** semilla 7 (S22), el solver solo prueba `initial-sound`, `say-it`,
  `listen-tap` y `trace`, espera fija de 3300 ms acoplada a `PANEL_HOLD_MS`, y WebKit
  (`PW_WEBKIT=1`) sin probar. No se automatiza más sin forzar el planificador.
