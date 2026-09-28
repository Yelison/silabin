# Plan 6: registro de ejecución

Rama: `feat/plan-6-padres-recompensas` (desde `main` en `d70d997`, tras fusionar el Plan 5).
Plan: `docs/superpowers/plans/2026-09-28-silabin-padres-recompensas.md` (**por redactar**).

Este registro es la memoria del plan. Al retomar, léelo primero (`grep -n` y el tramo final).

## Estado

| Fase | Estado |
|---|---|
| Decisiones con el autor (D24-D31) | **hechas** (2026-09-28, abajo) |
| Rulings de planificación (S1-S16) | **borrador** (abajo): el plan los fija o los corrige |
| Redacción del plan | **pendiente**: sesión nueva en `/model opus` |
| Ejecución | pendiente: `/model sonnet`, `superpowers:subagent-driven-development` |

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

## Rulings de planificación (borrador, prefijo S)

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

## Reparto de tareas propuesto (borrador)

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

**Recordatorios para el plan:** en la tarea de identidad (Plan 7) instalar entonces
`frontend-design@claude-plugins-official`, no antes (memoria del autor). El cierre actualiza
la línea de estado del README, que todavía dice que falta el PR del Plan 5.
