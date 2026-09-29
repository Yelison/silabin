# Plan 6: registro de ejecución

Rama: `feat/plan-6-padres-recompensas` (desde `main` en `d70d997`, tras fusionar el Plan 5).
Plan: `docs/superpowers/plans/2026-09-28-silabin-padres-recompensas.md` (11 tareas).

Este registro es la memoria del plan. Al retomar, léelo primero (`grep -n` y el tramo final).

## Estado

| Fase | Estado |
|---|---|
| Decisiones con el autor (D24-D31) | **hechas** (2026-09-28, abajo) |
| Rulings de planificación (S1-S24) | **fijados** (S1-S16 abajo; S17-S23 en la sección «Decisiones» del plan) |
| Redacción del plan | **hecha** (2026-09-28, Opus). Pendiente de revisión del autor |
| Ejecución | en curso: Tareas 1-7/11 completas (`/model sonnet`, `superpowers:subagent-driven-development`) |

## Decisiones tomadas con el autor (2026-09-28)

| # | Decisión |
|---|---|
| D24 | **El trabajo se reparte en dos planes.** Plan 6, funcional: panel de padres con PIN, ajustes, importar, trazo en minúsculas, recompensas y cosméticos con marcadores provisionales, avance en el mapa, borrar y confirmar en `trace`, PWA y e2e. Plan 7: identidad visual (arte, compañero, boca, paleta final) y la lista de verificación en iPad (`docs/checklist-ipad.md`) sobre la versión final. Ninguna tarea del Plan 6 espera al arte |
| D25 | **El arte lo genera el autor a partir de prompts**, igual que la Tarea 5b del Plan 3: prompts en el estilo de `docs/ilustraciones-prompts.md` (3D suave tipo juguete), y `scripts/optimizar-ilustraciones.py` los integra. Abarca el compañero y el 2.º personaje, los 3 fondos, las pegatinas, el trofeo, los rastros y **la boca** (una imagen por posición). El Plan 6 **deja escritos los prompts** para que el autor genere las imágenes mientras se ejecuta; el Plan 7 las integra |
| D26 | **Panel de padres:** se entra manteniendo pulsado el logo 3 s (el gesto actual de exportar), que abre el PIN. Exportar pasa **dentro** del panel. Si se olvida el PIN, una **pregunta de adulto** (p. ej. una multiplicación) deja poner uno nuevo **sin tocar el progreso**. El PIN se define la primera vez que se entra (`pinHash: null`) |
| D27 | **Contrato de importar** (sustituye y precisa D9): solo se importa un documento que **valide entero** con `persistedStateSchema`, versión incluida. Si no valida (JSON roto, `{}`, `version` distinta, una clave corrupta), **se rechaza** con un mensaje para el adulto y no se toca nada: **nunca se rescata ni se importa un documento vacío**. Si valida: vista previa (sesiones, estrellas, unidades completas), confirmación del adulto, y entonces sustituye `doc` entero y quita `readFailed` y `recovered` (D9) |
| D28 | **Trazo en minúsculas dentro del Plan 6:** 9 glifos (a e i o u m l s p; la `a` de un solo piso, como Andika), pares confundibles medidos como en G15 y el interruptor `lowercaseTracing` en el panel. Cierra D16 |
| D29 | **HTTPS de verdad para la PWA: Vercel.** El plan documenta los pasos del despliegue. **Desplegar es una acción del autor** o necesita su permiso explícito en su momento: ningún agente despliega por su cuenta. La URL es pública aunque nadie la conozca |
| D30 | **Dependencias nuevas:** Playwright (e2e del spec §10 con viewport de iPhone y trazos táctiles en la Fase 1; R25 la dejó para este plan), Framer Motion (celebraciones y rastro de dedo) y Serwist (service worker con precaché; integración para Turbopack) |
| D31 | **Entran las dos ideas de la deuda 10:** (a) avance dentro de la unidad activa en el mapa, contador de estrellas con barra al próximo hito (§7) y señal discreta de «guardado»; (b) botones de **borrar** y **confirmar** en `trace`, además de la detección automática del toque accidental (D19) |

## Rulings de planificación (prefijo S)

El prefijo S no choca con R (Planes 2-3) ni con P (Plan 5). Al redactar el plan se fijan o se
corrigen; lo que cambie queda anotado aquí.

- **S1 · Importar no pasa por `migrate`.** `importState` hoy devuelve un documento vacío con
  `recovered: true` para un JSON roto y rescata clave a clave para un objeto cualquiera (`{}`),
  y un `version: 2` pasa rescatado como v1 sin aviso (comprobado en `schema.ts:168-205` y
  `persist.ts:111-122`). D27 exige `persistedStateSchema.safeParse` estricto y un resultado
  tipado `{ ok: true; state } | { ok: false; reason: "json" | "schema" | "version" }`. Coste si
  fuera un error: aflojar el contrato después, nunca al revés.
- **S2 · El hash del PIN usa `crypto.subtle` (SHA-256 con sal aleatoria, `sal:hex` en
  `pinHash`).** `crypto.subtle` solo existe en contextos seguros (`https` o `localhost`).
  Vercel y `localhost` lo son. En `http://<ip-lan>` el panel dice al adulto que necesita
  conexión segura, en vez de caer a un hash distinto (dos hashes serían incompatibles). El
  PIN es una puerta para el niño, no seguridad: el hash solo evita que el PIN salga en claro
  en la exportación. Coste si fuera un error: sustituir por un SHA-256 en TS puro con los
  vectores de prueba.
- **S3 · El cambio de acento se aplica al momento.** `App` crea el reproductor una sola vez
  (`App.tsx:88-93`, `actual ?? createAudio(...)`). Al cambiar `settings.accent`, `App` para el
  reproductor anterior y crea otro. Test: cambiar el acento en el panel y comprobar que el
  reproductor nuevo recibe el acento nuevo.
- **S4 · Nadie lee hoy `reducedCelebrations`.** `EndScreen`, y las celebraciones nuevas, lo
  respetan: sin animación de rebote ni partículas, solo estrellas quietas y un sonido corto.
  Además de `prefers-reduced-motion` (`MotionConfig reducedMotion="user"`).
- **S5 · Catálogo de cosméticos en `engine/cosmetics.ts` (puro), exportado por el barril.**
  `features/` no puede importar `@/content` (`boundaries.test.ts`), y los logros ya viven en
  `engine/rewards.ts`. Cada cosmético tiene `id`, `slot` (`background`, `companion` o `trail`)
  y `rewardId` (`null` para el cosmético por defecto de cada ranura). `resolveEquipped(rewards)`
  devuelve los tres equipados, **con el de por defecto** si el guardado es `null`, un id
  desconocido o uno aún no desbloqueado (puede ocurrir tras importar). La gorra de
  `ten-sessions` no tiene ranura (no cambia el esquema): el compañero la lleva sola cuando
  está ganada.
- **S6 · Informe de progreso en el motor.** `progressReport(content, state)` → fases →
  unidades → ítems, clasificados en `mastered`, `learning` («en repaso»: presentado y sin
  dominar) y `unseen` (sin presentar). Lo pinta el panel. El avance del mapa sale de una
  función nueva del barril (`unitProgress(content, state, unitId) → { mastered, total }`),
  no de `unitMasteryRatio` (D3 lo dejó fuera, y el test C3 lo comprueba).
- **S7 · Barra al próximo hito.** `nextMilestone(totalStars)` →
  `{ from, to } | null` sobre `STAR_MILESTONES`, `null` pasado el de 100.
- **S8 · Minúsculas en el motor.** Qué glifo se puntúa lo decide el motor (D17), así que
  `lowercaseTracing` sí entra en `engine/` (a diferencia de `hideMic` y `speechMode`, D23).
  `startSession` recibe `traceCase: "upper" | "lower"` y lo fija en la corrida: cambiar el
  ajuste a media sesión no cambia la letra de un ejercicio empezado. `glyphFor(letter, case)`.
  Los pares confundibles de minúsculas se miden y se fijan en `LOWER_CONFUSABLE_PAIRS`, como
  G15.
- **S9 · Borrar y confirmar en `trace` se suman al temporizador de 1,5 s** (probado en la
  prueba manual del Plan 4), no lo sustituyen. Borrar limpia la tinta y cancela el
  temporizador, y no cuenta intento ni gasta pista (igual que D19). Confirmar envía ya. La
  prueba manual del autor decide si el temporizador sobra. Iconos provisionales hasta el Plan 7.
- **S10 · El rastro no roba eventos.** Las partículas van en una capa con
  `pointer-events: none`, escuchan en fase de captura sin llamar a `preventDefault` y nunca
  tocan el lienzo de `trace` ni el arrastre de `build`. Test: con un rastro equipado, un trazo
  y un arrastre dan el mismo resultado que sin él.
- **S11 · El service worker se actualiza en la pantalla de inicio.** Sin `skipWaiting`
  automático: un SW nuevo que borrase la precaché a mitad de sesión rompería la carga de
  fragmentos. Cuando hay un SW esperando, «Toca para empezar» le pide `SKIP_WAITING` y recarga
  antes de que empiece nada. Desactivado en `next dev`. La precaché cubre la app, las 65
  ilustraciones y los iconos; todavía no hay audios (`speechSynthesis`).
- **S12 · El e2e de Playwright no conoce las respuestas.** El planificador tira de
  `Math.random` y la sesión es impredecible. Resuelve cualquier ejercicio así: en las opciones
  toca la marcada por el modelo (`marked`) y, si no hay ninguna, la primera, hasta que el rung 3
  garantiza el acierto. En `say-it` y `read-word` pulsa «Lo dijo bien» (en headless no hay
  micrófono, P4). En `trace` dibuja el glifo de `glyphs.ts` escalado a la caja del lienzo, con
  toques por CDP (`Input.dispatchTouchEvent`) en Chromium. El estado de la Fase 1 se siembra
  escribiendo el documento de prueba en IndexedDB (`silabin.state.v1`) antes de recargar.
  Proyecto por defecto: Chromium con el dispositivo iPhone; WebKit solo si el sistema tiene sus
  dependencias (en WSL hace falta `install-deps` con sudo). Corre con `pnpm e2e`, aparte de
  `pnpm test`.
- **S13 · Iconos de la PWA provisionales** (192, 512, `apple-touch-icon`), generados por
  script. El Plan 7 los sustituye.
- **S14 · Framer Motion llega como `motion` (`motion/react`).** Hay que comprobarlo con
  context7 antes de instalar: no se adivinan nombres de paquete. Lo mismo para Serwist con
  Turbopack (`@serwist/turbopack`, `esbuild`, `serwist`, con un route handler; ver
  serwist.pages.dev/docs/next/turbo).
- **S15 · Reiniciar todo** pide doble confirmación y **se niega mientras `readFailed`** (el
  disco puede tener un documento bueno sin leer). Borra con `adapter.clear()` y vuelve a
  `emptyPersistedState()`, conservando el `pinHash`: reiniciar el progreso no deja la app sin
  puerta.
- **S16 · `childName`** solo se ve en la interfaz del adulto (panel y nombre del fichero
  exportado). El niño no ve texto (§9).

## Reparto de tareas

Once tareas. `Effort` según CLAUDE.md: `high` para lógica nueva, contratos y máquinas de
estado; `medium` para el resto.

| # | Tarea | Riesgo · Effort |
|---|---|---|
| 1 | Motor: `cosmetics.ts` (S5), `progressReport` y `unitProgress` (S6), `nextMilestone` (S7) | lógica · high |
| 2 | Store: `updateSettings`, `importDoc` (D27, S1), `resetAll` (S15), `setPin`/`checkPin` (S2), `equip`; acento en vivo (S3) | contrato · high |
| 3 | Minúsculas: `LOWER_GLYPHS`, `glyphFor(letter, case)`, `traceCase` en la corrida (S8), pares medidos | lógica · high |
| 4 | `trace`: borrar y confirmar (S9, D31b) | UI + flujo · medium |
| 5 | Panel: puerta de PIN (alta, entrada, pregunta de adulto, D26), estructura y ajustes (incluidos `hideMic`, `speechMode` con el evaluador activo, `lowercaseTracing` y el acento) | UI + contrato · high |
| 6 | Panel: progreso (S6) y datos (exportar, importar con vista previa D27, reiniciar S15) | UI · medium |
| 7 | Mapa: contador de estrellas, barra al hito, avance de la unidad, «guardado» (D31a) | UI · medium |
| 8 | Recompensas: galería y equipar, cosméticos aplicados con marcadores provisionales, rastro (S10), celebraciones con Framer Motion (S4) | UI · medium |
| 9 | PWA: Serwist, manifest, iconos (S13), actualización en inicio (S11), pasos de Vercel (D29) | config · medium |
| 10 | e2e con Playwright (S12) | tests · medium |
| 11 | Cierre: prompts del arte para el Plan 7 (D25), README y poda, lista de la prueba manual del autor | docs · medium |

**Review Focus (semillas):** importar un fichero equivocado (D27); primer uso con
`pinHash: null`; reiniciar con `readFailed`; SW viejo tras un despliegue (S11); rastro encima
de `trace` y de `build` (S10); `equipped` con un id bloqueado o desconocido tras importar (S5).

Añadidos al redactar el plan (texto completo en su sección «Decisiones»): S17 (el avance de
la unidad solo enseña lo ganado), S18 (importar conserva el PIN del dispositivo), S19 (el fondo
nunca dentro de un ejercicio), S20 (cursor de PC por rastro → Plan 7, `minor (deferred)`), S21
(iconos provisionales con emoji), S22 (e2e con `Math.random` sembrado por `addInitScript`),
S23 (revisión de la precaché con `VERCEL_GIT_COMMIT_SHA`) y S24 (cada minúscula ocupa su
caja entera, porque `TOLERANCE` se mide en alturas de caja).

## Progreso de ejecución

| Tarea | Estado | Rondas | Mutaciones supervivientes |
|---|---|---|---|
| 1 | completa (commits `865937b`..`9eb94d0`) | 1/5 | 0 (las 5 mandatadas atrapadas; ronda 1 corrigió cobertura de `counts` por cubo y `bestStars`, que solo se comprobaban por suma) |
| 2 | completa (commits `c7ea145`..`80c0e13`), Approved | 0/5 | 0 (9 mutaciones: las 6 del brief más 3 que el implementador añadió por su cuenta, todas confirmadas por el revisor contra el diff) |
| 3 | completa (commit `6bf2f44`), Approved | 0/5 | 0 (5 mutaciones: las 4 del brief más `acceptsModelTrace`, todas atrapadas y confirmadas por el revisor contra el diff) |
| 4 | completa (commit `65f606a`), Approved | 0/5 | 0 (2 mutaciones del brief, ambas atrapadas, verificadas por el revisor contra la lógica del diff) |
| 5 | completa (commits `06be294`..`5522970`), Needs fixes → fix round 1/5 → Approved | 1/5 | 0 (3 mutaciones del brief, todas atrapadas, verificadas por el revisor contra el diff) |
| 6 | completa (commit `b525553`), Approved | 0/5 | 0 (1 mutación del brief, atrapada con `toBe` de identidad de referencia, verificada por el revisor contra el diff) |
| 7-11 | pendientes | | |

**Ruling (Tarea 1):** el brief (K7) usa los ids abreviados `phase1:a`/`phase1:e`, pero los
ids reales del currículo son `phase1:vowel-a`/`phase1:vowel-e` (`src/content/phase1.ts:34`
construye `phase1:vowel-${vowel}`). Se usan los ids reales en la Tarea 1 (test) y en todo lo
que venga después. — Por qué: los ids abreviados no existen, el test fallaría al arrancar. —
Coste si fuera un error: ninguno, son solo literales de test. **Aviso para T2, T6, T7 y T8**
si sus briefs citan el mismo id abreviado: comprobar contra `src/content/phase1.ts` antes de
despachar.

**Minor (deferred) de la Tarea 1:** sombra de nombre entre el parámetro `totalStars` de
`nextMilestone` y la función exportada `totalStars(state)` (`rewards.ts:47`, viene del
contrato del brief); fallback silencioso de `text` al id crudo si falta el ítem
(`progress-report.ts:545`); asimetría entre `progressReport` (mira `!presented` primero) y
`unitProgress` (llama `isMastered` directo) — no alcanzable por la máquina de estados actual.

**Ruling (Tarea 2):** el revisor encontró que el orden TDD no se siguió estrictamente en
`pin.ts` y `persist.ts` (implementación casi simultánea al test, con RED reconstruido
después «a propósito», autorrevelado por el implementador). Se acepta sin ronda de
corrección. — Por qué: el RED reconstruido es honesto y verificable, y el revisor confirmó
contra el diff (no contra el reporte) que las 9 mutaciones probadas (las 6 del brief más 3
que el implementador añadió por su cuenta tras consultar su propio `advisor()`) están
genuinamente atrapadas por tests no vacíos. Rehacer el test-first ahora reescribiría los
mismos ficheros sin cambiar el código final. — Coste si fuera un error: si un TDD real
hubiera revelado un problema de diseño que la mutación no atrapa, quedaría sin ver; riesgo
residual bajo porque la mutación es la técnica que más hallazgos ha dado en este proyecto.
**Recordatorio para las próximas tareas: TDD real, no reconstruido.**

**Minor (deferred) de la Tarea 2:** comprobación muerta en `equip` tras `canEquip`
(`app-store.ts`, `canEquip` ya descarta ids desconocidos); `verifyPin` compara con `===` no
constante en el tiempo (consistente con el modelo de amenaza: el PIN no es seguridad);
`ExportGesture.test.tsx` tocado fuera de la lista de ficheros del brief (mecánico,
consecuencia de romper la firma de `importState`).

**Recordatorios para el plan:** en la tarea de identidad (Plan 7) instalar entonces
`frontend-design@claude-plugins-official`, no antes (memoria del autor). El cierre actualiza
la línea de estado del README, que todavía dice que falta el PR del Plan 5.

**Ruling (Tarea 3):** el brief lista `src/features/session/trace/Evaluation.tsx` como
fichero a tocar, pero el diff no lo toca — solo su test. Se acepta sin ronda de corrección.
— Por qué: `SessionScreen.tsx:226` ya construye `guide: traceGuide(curriculum, run)`, y
`traceGuide` ya lee `run.traceCase` tras el cambio en `session.ts`; `Evaluation` recibe el
glifo correcto por props sin cambio propio. Tocarlo para leer el store ahí también habría
duplicado una decisión que ya toma el motor (regla del repo: `features/` nunca decide
pedagogía). El revisor verificó la ruta real contra el diff (no contra el reporte) y
confirmó que el test de integración nuevo `S2b` (`SessionScreen.test.tsx`) la ejercita de
punta a punta. — Coste si fuera un error: si la conexión real estuviera rota, `S2b` (que
monta `SessionScreen` con la vista real, no un `guide` fabricado a mano) lo habría
atrapado; el riesgo residual es que `S2b` mismo tenga un hueco, pero el revisor confirmó que
ejercita el camino real.

**Ruling (Tarea 3):** la confundibilidad bidireccional `a/o` y `a/u` en minúscula
(señalada por el implementador como preocupación) se acepta como comportamiento esperado,
no como defecto. — Por qué: S8 manda medir los pares confundibles y documentarlos en
`LOWER_CONFUSABLE_PAIRS` sin ajustar `TOLERANCE` ni forzar la geometría para esquivarlos —
exactamente lo que se hizo (el reporte documenta un intento revertido de encoger la `a` que
el propio implementador identificó como forzar el resultado del test, no medir). — Coste si
fuera un error: un niño puede recibir crédito indebido al trazar `a` como `o`/`u` o
viceversa; queda anotado como posible mejora futura (una `a` con óvalo más estrecho) que
requeriría remedir toda la matriz — no bloquea esta tarea.

**Ruling (Tarea 3):** el patrón "TDD parcial revelado en el propio reporte, sin aviso
previo al coordinador" (visto ya en la Tarea 2 con `pin.ts`/`persist.ts`, y ahora en `L1`/
`glyphFor` y `D1b`) se acepta esta vez también, pero no se repite una tercera vez sin aviso
previo. — Por qué: el propio brief de la Tarea 3 pedía explícitamente «prototipo de glifos y
medición de pares» como primer paso antes de «tests; verlos fallar; implementar» — el atajo
en `L1`/`glyphFor` estaba inducido por el propio plan, no elegido por el implementador; y el
rojo se forzó a posteriori de forma verificable (`throw` marcado `TDD-TEMP`, confirmado por
el revisor). `D1b` (selector de `PlantillasDev.tsx`) es la pieza sin justificación de plan,
pero es una herramienta de solo desarrollo, no motor ni pedagogía. — Coste si fuera un
error: bajo, acotado a una herramienta interna; la próxima vez que ocurra sin aviso previo
al despachar (no al reportar), el coordinador debe pararlo y pedir que se anuncie antes de
escribir el test, no solo confesarlo después.

**Minor (deferred) de la Tarea 3:** `D1b` (`PlantillasDev.test.tsx:703`) tiene un título que
dice comprobar "el glifo de la evaluación y del marcador" pero no comprueba el marcador,
solo cuenta carriles SVG; las aserciones de `D1b` (`PlantillasDev.test.tsx:716-729`) son más
débiles que el estándar de producción (`Presentation.test.tsx` compara el atributo `d`
exacto) — aceptable para una herramienta de solo desarrollo.

**Ruling (Tarea 4):** los botones «Borrar» y «Listo» pintan el emoji (🧽/👍) directamente,
no el componente `Icon`/PNG. — Por qué: S21 los lista explícitamente como provisionales con
emoji hasta el Plan 7, a diferencia del icono de `ReplayButton` (ya migrado a `Icon` en un
plan anterior, no provisional); añadir entradas nuevas a `ICON_NAMES` exigiría crear PNGs
reales que el Plan 7 reemplazaría de todos modos. — Coste si fuera un error: ninguno de
diseño final (es explícitamente provisional); si acaso, repintar dos botones en el Plan 7 en
vez de uno menos. Dado al implementador antes del despacho, no como corrección.

**Minor (deferred) de la Tarea 4:** `handleStrokeStart` (`Evaluation.tsx:233-239`, código
preexistente fuera del alcance de esta tarea) repite en línea el mismo patrón que ahora
centraliza `cancelarTemporizador()` unas líneas arriba — DRY trivial, sin tomar; la
condición de visibilidad `!disabled` incluye `locked`, sin test de esta tarea que lo
ejercite con tinta presente (el revisor confirmó que en la práctica `locked` implica
`submitted` en todos los caminos reales, así que es redundante-pero-inofensivo, no una
ampliación de comportamiento).

**Pendiente antes de cerrar el plan (no bloquea la Tarea 4):** el layout de landscape
(640×360) de la franja de 3 botones (72×72 cada uno, huecos siempre montados) se razonó por
aritmética (248 px de columna dentro de "~328 px libres" estimados, no derivados de clases
del diff) pero no se verificó con `browser-qa` ni dispositivo real — señalado tanto por el
implementador como por el revisor. Queda para la prueba manual de cierre del plan (S11 ya
prevé iPad/iPhone real; añadir landscape 640×360 a esa pasada antes del PR).

**Ruling (Tarea 5):** el reparto exacto de responsabilidades entre `ParentGate.tsx`,
`ParentPanel.tsx` y `App.tsx` lo decidió el implementador — el brief lo daba como orientación,
no como contrato, y pedía priorizar lo que exigieran las pruebas N1-N10. — Por qué: el propio
brief dice textualmente "si al implementar ves una forma más limpia... trata esta lectura como
orientación, no como contrato". El revisor confirmó fichero por fichero que los 6 ficheros
listados en el brief tienen su hunk correspondiente y que las N1-N10 pasan. — Coste si fuera un
error: cambio acotado a esos dos ficheros (`ParentGate`/`ParentPanel`), sin tocar el store ni el
contrato con `App`.

**Ruling (Tarea 5, del implementador, aceptado sin ronda de corrección):** `crypto.subtle` ya
está disponible en el entorno de test jsdom de este repo (Node trae `webcrypto` nativo); solo el
test N1 lo quita con `vi.stubGlobal`/`vi.unstubAllGlobals`, en vez de inyectarlo en N2-N9 como
sugería el brief. — Por qué: el brief preveía el caso de que faltara, pero el implementador lo
confirmó con un test de scratch antes de decidir, y un error aquí fallaría de forma visible y
consistente (`pinSupported() === false` en todos los tests), no como un falso verde silencioso.
— Coste si fuera un error: ninguno oculto; el fallo sería ruidoso y se vería en la primera
corrida.

**Ruling (Tarea 5, del implementador):** el nombre del niño se recorta en cada pulsación
(`onChange`) y el campo local no se resincroniza desde `settings.childName` tras el primer
pintado. — Por qué: resincronizar borraría en vivo un espacio final que el adulto acaba de
teclear. — Coste si fuera un error: bajo — nada más toca `childName` durante una sesión del
panel hoy; si algo lo hiciera, el campo no lo reflejaría hasta cerrar y reabrir. Registrado
también como Minor (deferred) por el revisor de tarea.

**Minor (deferred) de la Tarea 5:** `ParentGate.tsx` no captura un rechazo de la promesa en
`setPin`/`checkPin` (`void setPin(...).then(...)`, `void checkPin(...).then(...)`); bajo
impacto porque el contrato de la Tarea 2 no documenta que estas funciones rechacen en uso
normal. El campo "Nombre del niño" no se resincroniza si `settings.childName` cambia por fuera
del propio campo mientras el panel está abierto (ver Ruling arriba).

**Ronda de corrección de la Tarea 5 (1/5):** el revisor de tarea encontró un hallazgo
Importante — `ParentPanel.tsx` no cerraba con `Escape` (la restricción global dice "Escape
cierra los diálogos", en plural, y el panel ya autenticado es su propio diálogo sin listener
propio). El implementador original lo corrigió con el mismo patrón de `keydown` que ya usaba
`ParentGate.tsx`, con un test nuevo (RED/GREEN confirmado). La re-revisión acotada verificó
`ADDRESSED` y que los dos listeners de `keydown` (puerta y panel) nunca coexisten — el de
`ParentGate` se desactiva con `if (authenticated) return`, así que no hay doble disparo de
`onClose` — sin ruptura nueva.

**Ruling (Tarea 6):** `exportFilename` amplía su firma a `(date, childName)` — cambio no listado
en «Files» del brief, pero necesario para cumplir D3 (el nombre del fichero exportado lleva el
nombre del niño). — Por qué: el único punto de llamada (`ParentPanel.tsx`) se actualizó en el
mismo diff, sin dejar llamadas rotas; el revisor lo verificó como riesgo nombrado. — Coste si
fuera un error: cambio acotado a `download.ts` y su único punto de llamada.

**Minor (deferred) de la Tarea 6:** el `<input type="file">` nativo del selector de importar no
tiene garantizado un área táctil ≥44px (lo controla el navegador); verificar a ojo en el
dispositivo real durante el QA visual del plan. No hay mensaje de éxito explícito tras
«Reiniciar todo» más allá de cerrar el diálogo — el brief solo pide texto para `read-failed`, no
es un incumplimiento. `DataSection.tsx` queda en 220 líneas (export/import/reset); vigilar si
una tarea futura le añade más antes de dividirlo.

**Tarea 7 (Mapa: estrellas, hito, avance de la unidad y «guardado», D31a):** implementador y
revisor (Sonnet) aprobaron sin rondas de corrección. `StarCounter`, `UnitDots` y `SavedMark`
usan `nextMilestone`, `totalStars` y `unitProgress` del motor (Tarea 1) sin modificarlos. S17
verificado: los puntos de avance de la unidad activa son solo `mastered`, sin huecos vacíos
por lo que falta. El test «trampa 4» (ninguna unidad pinta su propia barra de dominio) se
reescribió acotado a los botones de unidad porque la nueva barra global de hito rompía su
aserción de "cero barras en todo el contenedor" — el revisor confirmó que la protección
original se conserva intacta con el nuevo alcance, no se debilitó.

**Minor (deferred) de la Tarea 7:** `role="img"` en `SavedMark`/`UnitDots` (MapScreen.tsx) es
una elección de ARIA algo atípica para un check y unos puntos de progreso — `role="status"` o
un nodo de texto oculto sería más convencional; sin impacto funcional, satisface el lint de
Biome. Los tests de la hora «HH:MM» replican la misma lógica de formateo (`getHours`/
`getMinutes`/`padStart`) que la implementación, así que no detectarían un bug sistemático ahí.
El número de `StarCounter` no lleva contexto accesible más allá del dígito (el `★` es
`aria-hidden`) — el brief no lo pedía.

Task 7: complete (commits `8436835`..`572f08f`, review clean, 3 minor deferred).
