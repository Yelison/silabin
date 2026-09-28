# SDD ledger — plan: docs/superpowers/plans/2026-09-27-silabin-trazo.md

Ledger versionado del Plan 4 (modelo: `2026-09-26-plan-3-registro.md`). Busca `Ruling` para las
decisiones tomadas sin consultar y `minor (deferred)` para lo que se dejó sin arreglar.

Spec: docs/superpowers/specs/2026-09-27-trace-design.md (autoridad en `trace`; D12-D17), sobre docs/superpowers/specs/2026-09-18-silabin-design.md
Rama: feat/plan-4-trace (desde main en 8f51a2c)
Plan escrito con Opus 5.5 el 2026-09-27. Ejecución: coordinador en Sonnet (puerta de modelo del CLAUDE.md). Implementadores y revisores de tarea: `model: "sonnet"`. Revisión final: opus.
Briefs/reportes/diffs (desechables): `.superpowers/sdd/2026-09-27-silabin-trazo/`. Briefs con `sed -n A,Bp` (el plan usa «Tarea N»).

## Decisiones con el autor (2026-09-27)

D12 se evalúa solo la forma (cobertura por trazo + precisión, tolerancia generosa), sin orden ni dirección.
D13 nivel de guía según la caja Leitner (0 → 1, 1 → 2, 2-3 → 3); el nivel 3 conserva un carril muy tenue.
D14 la Fase 1 se desbloquea en el Plan 5, con `say-it`; nada provisional en el planificador.
D15 R29: con 2 opciones la pista 1 solo repite el audio; el nivel fácil sigue con 2.
D16 solo mayúsculas; las minúsculas y `lowercaseTracing`, en el Plan 6.
D17 el trazo entra por `submitTrace` y lo puntúa el motor; SVG con eventos `pointer`.
(La numeración sigue la tabla D1-D11 del README; la «D12» del registro del Plan 3 era interna de aquel plan.)

## Hallazgo al escribir el plan

Prototipo desechable de la puntuación con los trazos de la Tarea 1 y las constantes de partida (0.15 / 0.75 / 0.8): las 9 letras pasan con sus trazos y con temblor ±0.08; pasan también 5 pares cruzados (E sobre S, E sobre P, S sobre E, O sobre U, U sobre O). Con tolerancia 0.10 solo U sobre O. Cerca del umbral, pero fallan: E sobre O, L sobre I, S sobre O, P sobre S. El plan los fija en `CONFUSABLE_PAIRS` (G15) y la prueba manual de la Tarea 5 decide si se mueven las constantes.

Márgenes medidos a 0.15 / 0.75 / 0.8 (cobertura mínima / precisión): las 9 letras con temblor ±0.08, 1.000 / 1.000 todas. Pares fuera de la lista más cerca de pasar: L sobre I 1.000 / **0.780** (el más frágil, a 0.02); E sobre O 0.720 / 0.784; P sobre S 0.700 / 0.849; E sobre L 1.000 / 0.705; S sobre P 0.804 / 0.700. Si la implementación da L sobre I como aprobado, primero se compara el remuestreo con el del plan.

## Revisión del plan por el advisor (Opus, 2026-09-27)

Plan sólido; cuatro ajustes aplicados antes de ejecutar: (1) los márgenes de arriba, que se habrían perdido con el scratchpad; (2) X3 de R29 incluye un ítem oral de `phase0:initial` (3 opciones del dato, verificado en `phase0.ts:82` y en `buildOptions`), la única unidad jugable hoy; (3) la prueba manual de la Tarea 5 añade `allowedDevOrigins` desde `DEV_ORIGINS` en `next.config.ts`, porque Next 16 bloquea en desarrollo los orígenes de la red local y la página no se hidrataría en el móvil; (4) Tarea 2: M4 de `answers.test.ts` llama a `checkAnswer` directamente y no cambia; C5 exige el mensaje nuevo de `submitAnswer` a propósito.

## Ejecución con Subagent-Driven Development (2026-09-27, coordinador en Sonnet)

Puerta de modelo verificada: sesión en Sonnet. Espacio de trabajo desechable:
`.superpowers/sdd/2026-09-27-silabin-trazo/` (solo tenía `plan-path` de cuando se escribió el plan).

**Escaneo previo a la Tarea 1** (tabla, no veredicto):

| Par / tarea | Comprobado | Resultado |
|---|---|---|
| T1 → T2 (interfaz) | T2 «Consumes (T1)»: `scoreTrace`, `guideLevel`, `glyphFor`, `TraceStroke`, `GuideLevel`, `Glyph` contra lo que T1 «Produces» | coincide exactamente en nombres y firmas |
| T1 consigo misma (G17) | El invariante habla de «unidad que declara `trace`»; `phase1.ts` (vocales) y `phase2.ts` (m,l,s,p) ya declaran `templateId: "trace"` en sus `exercises` | las 9 letras de la tabla de trazos (A,E,I,O,U,M,L,S,P) son exactamente los `letter:*` que esas unidades introducen; el invariante no es vacío |
| T1 consigo misma (glyphFor / claves) | `UPPER_GLYPHS` se indexa por `item.text`; `letter:a`…`letter:u` (phase1) y `letter:m/l/s/p` (phase2) tienen `text` en minúscula de una letra | coincide |
| Usos de `glyphFor`/`scoreTrace`/`guideLevel` en el resto del plan (T2-T4) | `grep` de las tres firmas en todo el plan | ningún uso diverge de la firma de T1 |

Escaneo limpio para la Tarea 1 y su consumidor inmediato (T2). No se leyeron las Tareas 3-5 en profundidad: el advisor ya revisó el plan completo el 2026-09-27 (ver arriba) y esta sesión solo despacha la Tarea 1.

**Tarea 1 — implementación:** commit `1045f20` (feat(engine): puntuar el trazo por forma, con
tolerancia, para no frustrar a quien empieza). `pnpm test` 844 pasan / 1 skip, typecheck y lint
limpios. G15 confirma los 5 pares previstos (E→S, E→P, O→U, U→O, S→E) y ninguno nuevo — sin
`Ruling` R30 necesario, la lista prevista se sostiene tal cual.

**Tarea 1 — revisión (ronda 0, sonnet):** ✅ cumplimiento del spec (geometría, constantes,
algoritmo, `guideLevel`, G1-G17, G15/`CONFUSABLE_PAIRS` todo verificado con ejecución
independiente, no solo lectura). **Needs fixes** — 3 Important, 0 Critical:
1. Duplicación literal de `resampleForTest`/`withTremor` entre `glyphs.test.ts` y
   `trace.test.ts` (más una tercera versión interna en `trace.ts`) — code quality.
2. El informe de la mutación 2 (distancia al punto más cercano) subcuenta los tests que
   rompen: dice 7, el revisor verificó por ejecución que son 8 (faltan G1, G2, G12, G14).
   Veredicto "detectada" correcto, cifra incorrecta.
3. El informe de la mutación 3 (sin precisión) subcuenta los pares nuevos en G15: dice 3
   (s>l, s>p, p>i), el revisor verificó por ejecución que son 12. Veredicto "detectada"
   correcto, alcance mal representado.
Minor (deferred): G5 (dedo rápido, solo 2 extremos) es matemáticamente idéntico a G1 para la
`L` sintética del brief — no ejercita distancia-al-segmento de forma distinta a G1 con esta
fixture; queda anotado, no bloquea.
Mutación 5 (remuestreo sin arrastre entre segmentos) — confirmada que sobrevive por ejecución
independiente del revisor, no solo por el informe del implementador. Es la debilidad conocida
y aceptada del brief para estas 9 letras con `TOLERANCE=0.15`; no se pide test nuevo.

Fix round 1/5: se resume al implementador original (mismo agente, sonnet) con los 3 Important
verbatim.

**Tarea 1 — fix round 1/5 (commits 1045f20..24b017b):**
1. Duplicación de `resampleForTest`/`withTremor` → arreglada: `src/engine/trace-test-fixtures.ts`
   nuevo, importado desde ambos test files; `git show` confirma `trace.ts` de producción
   idéntico al commit anterior.
2. Cifra de la mutación 2 → el implementador discrepó del primer revisor (7 tests rotos, no 8;
   G12 no detecta esta mutación porque compara la misma función mutada contra sí misma sobre
   una entrada que, tras filtrar no-finitos, queda estructuralmente idéntica). La re-revisión
   reimplementó el algoritmo en un script aislado y confirmó de forma independiente al
   **implementador**: 7 bloques (G1, G2, G5, G7, G9, G11, G14), G12 pasa. El primer revisor se
   equivocó en su propia reproducción. Cuarta vez en este proyecto que un informe honesto de
   un implementador corrige a quien le dio las instrucciones (ver CLAUDE.md, «modo económico»).
3. Cifra de la mutación 3 → confirmada sin cambios: 12 pares nuevos, coincide con las tres
   partes.
Re-revisión (sonnet): los 3 hallazgos ADDRESSED, sin rotura nueva. Minor (deferred):
`trace-test-fixtures.ts` vive en `engine/` sin sufijo `.test.ts` (no rompe nada, vitest no lo
recoge como spec); considerar moverlo a una carpeta de test-utils si se vuelve a tocar.

Tarea 1: complete (commits cd4403f..24b017b, fix round 1/5, review clean tras la ronda).

**Tarea 2 — implementación:** commit `f26b455` (feat(engine): el trazo entra al motor por
submitTrace para que ninguna vista decida si vale). `pnpm test` 854 pasan / 1 skip (preexistente),
typecheck y lint limpios. `resolveAttempt` extraído tal cual de `submitAnswer` (con `now` como
5º parámetro, no listado en la firma de prosa del brief pero exigido por `applyResolution`;
sin riesgo, es interno). Barril `@/engine` con los símbolos de T1 y T2. Las 4 mutaciones
dirigidas del brief, muertas.

**Tarea 2 — revisión (sonnet, con verificación independiente de las 4 mutaciones):** ✅
cumplimiento del spec completo (firmas, orden de guardas, mensajes, barril, C1-C10 uno a uno).
Las 4 mutaciones re-derivadas de forma independiente por el revisor, sin ejecutar nada,
coinciden con el informe. **Approved**, 0 Critical, 0 Important.
Minor (deferred):
- `session.test.ts` (C6): solo el primer subcaso verifica el mensaje de la guarda; los otros
  tres solo comprueban `.toThrow()` genérico. Sin riesgo de comportamiento (el revisor verificó
  a mano que el mensaje es correcto en los 4).
- Las guardas «sesión terminada» / «no es evaluación» / «ítem desconocido» están duplicadas en
  espejo entre `submitAnswer` y `submitTrace` — es lo que pide el brief, candidato a un helper
  compartido en una tarea futura, no ahora.
- `traceGuide` con ítem desconocido no tiene test dedicado (ya lo había anotado el implementador).

Tarea 2: complete (commits 7c7d1e3..f26b455, review clean, sin ronda de corrección).

**Tarea 3 — implementación:** commits `21287a2` (feat(ui): lienzo de trazo con guía que se
desvanece y pistas que no dependen del audio), `b994aa0` (fix(ui): el modelo del tercer fallo
no se quedaba bloqueado, y el lienzo ya usa el lado corto) y `74dbdbd` (fix(ui): en vertical el
lienzo de trazo no dejaba sitio al botón sin hacer scroll). Los dos `fix` salen de dos rondas de
`advisor()` del propio implementador (encontró 4 problemas reales) antes de reportar. `pnpm test`
885 pasan / 1 skip, typecheck y lint limpios. Reportó `DONE_WITH_CONCERNS` con dos dudas: (a) el
≥60% del lado corto y «sin scroll» están justificados por cálculo a mano, no en navegador real
(sin Playwright en este plan, llega en el Plan 5; la prueba manual de la Tarea 5 lo confirma en
dispositivo); (b) los números de inicio y flechas de la guía como «texto visible». El coordinador
verificó (b) contra el spec (`docs/superpowers/specs/2026-09-27-trace-design.md:53,88,139`):
es una excepción de diseño pedagógico ya decidida, no una desviación — no bloqueó el paso a
revisión.

**Tarea 3 — revisión (sonnet, con verificación independiente):** ✅ cumplimiento del spec
completo (principios §2, coordenadas, `touch-action`, tokens de color —
`--color-trace-ink` en `docs/diseno-visual.md:47,79` —, frontera `@/engine` con `U9` en verde,
excepción de números/flechas confirmada). **Approved**, 0 Critical, 0 Important. Las 5
mutaciones dirigidas (temporizador no cancelado, puntero no primario aceptado, modelo llama a
`onTrace`, desbloqueo atado al audio, guía no congelada) verificadas por el revisor aplicando
cada cambio y ejecutando el test afectado — mismo detector, mismo mensaje de fallo y mismo
recuento que el informe del implementador.
Minor (deferred): `Evaluation.tsx:186` — el caso apaisado 1024×768 queda con ~3px de holgura
entre alto necesario (652.8px) y disponible (656px); aritmética verificada de forma
independiente por el revisor, coincide con el implementador (60.7% del lado corto). Margen real
pero muy ajustado; el ajuste, si la prueba manual de la Tarea 5 lo pide, queda contenido a dos
clases CSS de `Evaluation.tsx`.

Tarea 3: complete (commits 21287a2..74dbdbd, review clean, sin ronda de corrección).

**Tarea 4 — implementación:** 6 commits, no los 2 del brief (uno de R29 se dividió en R29 +
test X3 corregido; presentación/registro/dev se dividió en 3 rondas de arreglo tras
`advisor()`): `65b8a89` (R29/D15), `7d40ac4` (X3 deja de ser tautológico, usa `planSession`
real), `9655141` (feat: `trace/Presentation.tsx`, registro, `/dev/plantillas`), `0062354` y
`6b0fc23` (fix: el lienzo de la presentación no llegaba al 60% del lado corto — el primer
intento quedó incompleto, el segundo lo arregló de verdad), `4d16545` (fix: en apaisado el
hueco del botón «Siguiente» no reservaba ancho, y la fila —lienzo incluido— saltaba 48px al
aparecer, con el niño posiblemente a medio trazo). `pnpm test` 899 pasan / 1 skip, typecheck y
lint limpios, verificado tras cada commit. 4 rondas de `advisor()`, documentadas con honestidad
incluidas varias afirmaciones propias que resultaron falsas y se corrigieron en el propio
informe (detalle en `.superpowers/sdd/2026-09-27-silabin-trazo/task-4-report.md`). Reportó
`DONE_WITH_CONCERNS`.

**Ruling:** los viewports 640×360 (apaisado de móvil pequeño, se pasa 58px) y 768×1024
(tableta rotada a vertical, la letra llega solo al 47.6% en vez del 60%) quedan fuera del
alcance del Global Constraint «≥60% del lado corto / sin scroll» de este plan. El plan nombra
explícitamente solo 360×640 vertical y 1024×768 apaisado en esa misma frase; las Tareas 1 y 3
ya sostuvieron esa lectura sin objeción en revisión, y ambos huecos son preexistentes en
ficheros que esas tareas ya cerraron (`listen-tap/Presentation.tsx`, `trace/Evaluation.tsx`),
no regresiones de la Tarea 4. Coste si es un error: si la prueba manual en dispositivo real de
la Tarea 5 muestra que alguno de los dos importa en la práctica, el ajuste queda contenido a
clases CSS en los 3 ficheros ya identificados (los dos anteriores más
`trace/Presentation.tsx`), sin tocar lógica ni pedagogía.

**Tarea 4 — revisión (sonnet, con verificación independiente):** ✅ cumplimiento del spec
completo. **Approved**, 0 Critical, 0 Important. La mutación de R29 (guarda quitada) mata X1,
X2 y X4 y deja X3 en verde, confirmado por ejecución propia del revisor (no solo leído del
informe); mutación adicional a `<=3` confirma que las X3 dependen del corte exacto en 2. La
aritmética del 60% en los dos viewports que el plan nombra (63.5%/69.7% vertical, 60.7%
apaisado) fue re-derivada por el revisor desde las clases CSS finales, no copiada del informe,
y coincide. El fix del salto en apaisado (`4d16545`) verificado con `git show` contra el
mecanismo real (`justify-center` sin `w-24` reservado). El revisor revisó el Ruling del
coordinador y no encontró objeción.
Minor (deferred): el margen de scroll (2.4px vertical, 3.2px apaisado) depende de que nada más
en `SessionScreen` (bordes de foco, barras de navegador móvil) consuma esos píxeles —
inherente a no tener navegador real disponible en esta caja para medir en vez de calcular;
mismo criterio que Tarea 3 aplicó a `Evaluation.tsx`.

Tarea 4: complete (commits 65b8a89..4d16545, review clean, sin ronda de corrección).

**Tarea 5 — implementación:** 2 commits: `6fdb93e` (`test(ui): trace de punta a punta con
motor y store reales` — un solo `it()`, no tres, porque I2 depende de que I1 haya subido
`letter:a` de caja e I3 de los contadores acumulados de toda la sesión) y `35dfed5`
(`docs: README con trace construida y la Fase 1 esperando a say-it` — `next.config.ts` con
`allowedDevOrigins` desde `DEV_ORIGINS`, y los 6 puntos del README del brief). `pnpm test` 900
pasan / 1 omitido (899 previos + 1 nuevo), typecheck y lint limpios, verificado tras cada
commit. Encontró que `boundaries.test.ts` (U8) bloqueaba importar `buildCurriculum` desde
`@/content/index` en el test de integración — lo resolvió construyendo el `CurriculumIndex` de
prueba a mano (el barrel `@/engine` ya expone el tipo); sin `Ruling` necesario. No tocó
`src/engine/trace.ts` ni `glyphs.test.ts` (la prueba manual, que decide si hace falta, no ha
ocurrido) ni hizo la prueba manual (fuera de su alcance). Reportó `DONE`.

**Tarea 5 — revisión (sonnet, con verificación independiente):** ✅ cumplimiento del spec
completo. **Approved**, 0 Critical, 0 Important. Verificó los 6 puntos del README uno a uno
contra el código fuente, no solo contra el informe — incluida la trampa 9: confirmó en
`session.ts` que `submitAnswer` lanza explícitamente para `trace` (línea 201-204) y que
`submitTrace` (221-247) es un camino de evaluación paralelo completo vía `scoreTrace`, y que
`SessionScreen` nunca llama a `answer`/`submitAnswer` para `trace`; cierre real, no una
afirmación sin sustento, y sigue 🔴 para `say-it`/`read-word` como debe. Corrió
`boundaries.test.ts` (U8) aislado (23/23), el test nuevo aislado (1/1), typecheck y lint de
forma independiente del informe. Verificó I1-I3 contra el motor real (`guideLevel`,
`recordAttempt`, `MAX_PRESENTATIONS`, `sessionLength`) y la conversión pantalla↔letra como
inversa exacta de `toLetterSpace` (`TraceCanvas.tsx:59-70`), a mano con números concretos.
Minor (deferred): el banner superior del README (línea ~8, «Estado a 2026-09-26... Plan 3...
817 tests») y la frase «Estado tras el Plan 2» en «Trampas conocidas» quedaron desactualizados
— deuda previa a esta tarea, no causada por ella, señalada por el implementador en vez de
tocada sin permiso. Pendiente para una tarea de limpieza aparte, fuera de este plan.

Tarea 5 (parte automatizada): review clean, sin ronda de corrección (commits
6fdb93e..35dfed5). **Pendiente antes de cerrar la tarea:** la prueba manual, que pide el brief.

**Prueba manual — primera pasada (el autor, 2026-09-27), condiciones: emulación táctil de
Chrome de escritorio (sin dispositivo real todavía), `prefers-reduced-motion: reduce` activado
en el sistema del autor (confirmado con `matchMedia`).** Encontró dos hallazgos en
`TraceCanvas.tsx`, ninguno de los dos en los ficheros que tocó la Tarea 5:
1. **Marcadores de inicio de trazo superpuestos** (confirmado leyendo el código, no solo
   percepción): `A`, `E`, `M` y `P` definen dos trazos que empiezan en el mismo punto exacto
   (`src/content/glyphs.ts`); el círculo+número del segundo trazo se pinta encima del primero
   en las mismas coordenadas (`TraceCanvas.tsx:278-312`), tapando el «1» por completo. `L` no
   lo tiene (inicios distintos). Sin test que lo cubriera (`TraceCanvas.test.tsx:339-346` solo
   comprueba `data-pulse`, nunca posición). **Pendiente de decisión del autor (candidato a
   D18):** separar los marcadores con un desplazamiento a lo largo de la dirección de cada
   trazo no alcanza con valores pequeños — con 0.09 (unidades de la caja) A queda a ~0.067 de
   distancia y M a ~0.057 (el círculo mide 0.07 de radio, hace falta ≥0.14 para no solaparse);
   separarlos de verdad pide ~0.19 (A) / ~0.22 (M), un quinto del trazo lejos del punto de
   inicio real. Es una decisión de diseño pedagógico (mover el número lejos del pixel de
   inicio real, o un tratamiento visual distinto como fusionar «1 2» en una sola marca), no
   algo que el coordinador deba fijar por su cuenta.
2. **Flechas de dirección (nivel 1, fin de cada trazo) poco visibles**: usan `calm-border`
   (`#5187c7`), ya oscurecido a propósito para llegar a 3:1 de contraste — suficiente para un
   borde, no necesariamente para un icono de ~0.03-0.05 unidades que un niño debe notar entre
   las líneas de guía. Salience, no error de contraste calculado.
3. **`prefers-reduced-motion: reduce` activo invalida la parte de la prueba sobre animación**:
   con esa preferencia, ni la presentación (`animation="full"`) ni la pista 2 de `trace`
   (`animation="dot"`, que SÍ recorre el trazo de inicio a fin — `hint-effects.ts`:
   `animate-dot-along-stroke+play-phoneme`) se mueven; aparecen ya completas por temporizador,
   que es el comportamiento exigido por el Global Constraint para movimiento reducido, no un
   fallo. **Esta parte de la prueba manual queda sin hacer** — pendiente repetirla con
   `prefers-reduced-motion: no-preference` (emulable en DevTools → Rendering, sin tocar el
   sistema operativo) para ver si la presentación y la pista 2 (el `dot` que ya existe y ya
   recorre el trazo, posiblemente lo que el autor pedía) se comportan bien con movimiento.

**Verificación cruzada con `browser-qa`/Playwright** (Chromium real vía script directo — el
MCP no tenía `--browser chromium` configurado, no tocado, ver nota abajo) sobre el `Ruling` de
640×360 y 768×1024 anterior:
- **`trace/Evaluation.tsx` (la vista que puntúa) a 768×1024: mide 61.9%, cumple el ≥60%.** El
  47.6% del Ruling anterior no es de este fichero — es de `trace/Presentation.tsx` en el mismo
  viewport, confirmado ahí al dígito. El Ruling original mezcló los dos ficheros.
- **`trace/Evaluation.tsx` y `trace/Presentation.tsx` a 640×360: los 58px de más sobre el
  presupuesto real de `SessionScreen` (112px de cabecera+relleno, leído de su código fuente,
  no medido en una sesión real en marcha, que hoy no existe como ruta navegable) se confirman
  para ambos ficheros — causarían scroll real** en una sesión de verdad a ese viewport.
- `listen-tap/Presentation.tsx` (el tercer fichero que nombraba el Ruling) no se midió esta
  vez — sigue sin datos, no se le puede dar por bueno ni por malo.
- 768×1024 (tableta en vertical) es el tamaño lógico de un iPad en vertical — el README dice
  «uso principal en iPad/iPhone con Safari»: no es un caso límite, es el dispositivo principal
  declarado. El déficit de `trace/Presentation.tsx` ahí no es aplazable solo por estar fuera
  de la letra literal del Global Constraint.

**Housekeeping, no accionado:** el informe del subagente de QA sugirió añadir
`--browser chromium` a `external_plugins/playwright/.mcp.json` para que el MCP de Playwright
funcione en próximas sesiones — no se aplicó (sugerencia de un subagente, no del autor);
pendiente de que el autor decida.

**Corrección de esta misma sesión:** la línea de «Sesión de ejecución» de más abajo decía
erróneamente que esta sesión había hecho las Tareas 3 y 4 — esas se cerraron en una sesión
anterior (ver commits `21287a2..74dbdbd` y `65b8a89..4d16545`, ambos previos al `/clear` con el
que arrancó esta sesión). Esta sesión solo ha trabajado la Tarea 5.

## Estado

Plan escrito, committeado y aprobado por el autor (2026-09-27). Tareas 1, 2, 3 y 4 completas.
Tarea 5: parte automatizada completa y revisada (clean); pendiente la prueba manual (primera
pasada hecha, ver arriba — faltan: la parte de animación con movimiento activado, la decisión
D18 sobre los marcadores superpuestos, la decisión sobre las flechas, la decisión sobre el
déficit de `trace/Presentation.tsx` en 768×1024, y la confirmación explícita del autor de que
cuidado/torpe pasan y garabato falla en las letras probadas). Después de cerrar la Tarea 5:
revisión final de la rama (opus) — última tarea del plan.
Sesión de ejecución: solo la Tarea 5 (parte automatizada + primera pasada de prueba manual).

**Hallazgo crítico añadido en la misma pasada — `motion-safe:` no protege de verdad con
movimiento reducido.** El autor reportó ver la letra dibujarse en la presentación con
`prefers-reduced-motion: reduce` activo (confirmado dos veces con `matchMedia` en la misma
pestaña). Verificado de forma aislada (CSS compilado real del proyecto, sin pasar por la app,
Playwright con `reducedMotion: 'reduce'`, script y HTML en el scratchpad de la sesión, no en el
repo): con la preferencia activa, `transitionProperty` computado es `all` (no `none` — no hay
reset de Preflight para eso) y `transitionDuration` sigue siendo el valor real (0.9s) porque se
pone por **estilo en línea** (`TraceCanvas.tsx:349-351` y `361-362`), que aplica sin importar
el media query. `motion-safe:transition-[stroke-dashoffset]`/`[offset-distance]` solo evita que
la clase ponga `transition-property`, pero al caer al valor inicial `all` en vez de `none`, el
cambio de `strokeDashoffset`/`offset-distance` se anima igual. Confirmado con muestras
(`samplesOver900ms`: 0.36→0.15→0.05→0.007→0px, animación real, no instantánea). Afecta a
`animation="full"` (presentación) y, por el mismo patrón exacto, casi seguro a
`animation="dot"` (pista 2) — no probado ese segundo caso todavía. **Viola el Global Constraint
de animación** ("con movimiento reducido, el trazo aparece entero, sin animar"). Ningún test
existente lo cubre: `jsdom` no ejecuta transiciones CSS reales.

**Resolución de todo lo anterior con el autor (2026-09-27) — Tarea 6 añadida al plan
(`docs/superpowers/plans/2026-09-27-silabin-trazo.md`, sección «Tarea 6»):**

1. **Ruling — motion-safe:** se arregla (bug, no decisión de diseño). Verificado también el
   segundo caso (`animation="dot"`, pista 2): mismo patrón exacto (`transitionDuration` en
   línea), mismo fix (`motion-reduce:transition-none`). Aislado con Playwright dos veces:
   - Sin fix, `reducedMotion: reduce`: `transitionProperty: "all"`,
     `samplesOver900ms: [0.36, 0.15, 0.05, 0.007, 0, 0]` (anima).
   - Con fix, `reducedMotion: reduce`: `transitionProperty: "none"`,
     `samplesOver900ms: [0, 0, 0, 0, 0, 0]` (no anima, revela al instante).
   - Con fix, `reducedMotion: no-preference`: sigue animando igual que sin el fix
     (`transitionProperty: "stroke-dashoffset"`, decae 0.45→0 en varias muestras) — el fix no
     rompe el caso normal.
   Grep recursivo confirma que el patrón de duración en línea (`transitionDuration`/
   `transitionDelay`) solo existe en `TraceCanvas.tsx` — no hace falta auditar el resto de la
   app.
2. **D18 (Ruling del coordinador, a que el autor lo vete al leer la Tarea 6 antes de
   dispatch):** los marcadores superpuestos se separan desplazándolos a lo largo de la
   dirección de su propio trazo (~0.19-0.22 unidades para A/M, no 0.09 — esa cifra no
   alcanzaba, quedaban a ~0.06 de distancia con un círculo de 0.07 de radio).
3. **Flechas:** no solo se agrandan — el autor pidió una guía de dirección **animada**, nueva,
   que reemplaza la pista 2 (el punto simple) reutilizando su mismo mecanismo
   (`offsetPath`/`offsetDistance`, ya recorre los trazos en orden), con forma de flecha y
   `offset-rotate: auto`. En la presentación va **después** de que la letra termine de
   dibujarse (no simultánea — decisión explícita del autor), encadenada a `onAnimationEnd`. La
   flecha estática de hoy (agrandada, ~0.06-0.08 en vez de ~0.03-0.05) queda como respaldo bajo
   movimiento reducido y como marca continua de nivel 1.
4. **Ruling — `trace/Presentation.tsx` en 768×1024:** se arregla (768×1024 es el iPad en
   vertical, dispositivo principal declarado en el README — no es aplazable).
5. **Ruling — 58px de más en 640×360:** se aplaza (no es el dispositivo principal; coste
   contenido a las mismas clases CSS ya identificadas si hiciera falta después).

**Sigue pendiente, no bloquea la Tarea 6 pero sí cerrar la Tarea 5:** confirmación explícita
del autor de una traza torpe **completa** (no solo una parte) que pase, un garabato **completo**
que falle, si el tiempo de espera (1.5s) se siente bien, y qué pasó al dibujar una letra
distinta encima de la pedida. Lo único confirmado hasta ahora: la precisión por trazo de la A
distingue bien un trazo lateral correcto de una barra central mal puesta, y no se deja engañar
por un intento que empieza bien y se relaja al final — señal positiva, pero no cubre los cuatro
puntos de arriba.

## Confirmación del autor — los cuatro puntos pendientes de la Tarea 5 (2026-09-27, sesión nueva tras `/clear`)

1. Traza torpe pero completa (tiembla, se sale un poco de la guía, pero recorre todos los
   trazos): **pasa.**
2. Garabato completo (no sigue la guía, ocupa toda la caja): **falla.**
3. Tiempo de espera de inactividad (1.5s): **se siente bien.**
4. Letra distinta a la pedida dibujada sobre la guía: **la rechazó, feedback neutro** (igual
   que un intento fallido normal).

Los cuatro confirman el comportamiento esperado — nada nuevo que corregir. **Tarea 5: cierra
formalmente.**

## Tarea 6: implementación y revisión (2026-09-27, sesión nueva tras `/clear`)

Implementador (sonnet): commits `7a5fcd6` (punto 1, motion-safe) y `375c3b6` (puntos 2-5).
908/908 tests, typecheck y lint en verde. Reporte completo:
`.superpowers/sdd/2026-09-27-silabin-trazo/task-6-report.md`.

Revisor de tarea (sonnet), diff `f693a72..375c3b6`: Spec ✅ con una salvedad. 4 mutaciones
obligatorias del brief probadas y revertidas en el checkout; 3 confirman que el fix correcto
falla al mutarlo (offset a 0, umbral bajado a un valor que sí distingue el bug real,
`motion-reduce:transition-none` quitado de cada uno de los dos elementos). La cuarta
(dirección del desplazamiento en `startMarkerPositions`, `TraceCanvas.tsx:118-135`) **sobrevive**
en las dos variantes probadas (usar `strokeAngleDeg` del final en vez del inicio; invertir el
signo): `T6-2` solo comprueba distancia ≥0.14 entre marcadores, no la dirección, así que un
futuro refactor que invierta el signo o tome el extremo equivocado pasaría la suite entera con
el marcador apuntando "hacia atrás". Hallazgo Important, no Critical (el código de hoy es
correcto; falta el ancla del test).

Minor (deferred): `START_MARKER_OFFSET = 0.24` deja solo ~8.4% de margen sobre el mínimo real
de M (0.2214) — vigilar si el Plan 6 añade glifos con trazos muy alineados. El tamaño de
`Presentation.tsx` en 768×1024 (61.9% según aritmética, misma fórmula ya validada contra el
47.6% original) no se reconfirmó con `browser-qa`/Playwright tras el fix — el propio brief lo
clasifica como cumplimiento sin mutación, así que queda como nota informativa, no bloqueante.

**Fix round 1/5** (commit `55bf326`, solo test): añadido `T6-2b`, fija la posición exacta
esperada del marcador de inicio del trazo 2 de M (`(0.144, 0.192)`). Re-revisión confirmó con
aritmética propia (no solo con la palabra del implementador) que las dos mutaciones del
hallazgo (dirección final en vez de inicial; signo invertido) rompen la nueva aserción — el
código de producción no cambió, era un hueco de cobertura, no un bug. Sin rotura nueva.

Task 6: fix round 1/5 (1 addressed, 0 open; commits 375c3b6..55bf326).
Task 6: complete (commits f693a72..55bf326, 1 hallazgo Important resuelto en fix round 1,
2 minor deferred: margen de `START_MARKER_OFFSET` para M y tamaño de tableta sin reconfirmar
con `browser-qa`).

## Revisión final de toda la rama (opus, 2026-09-27), rango `8f51a2c..d665922`

**Assessment: Con correcciones.** Arquitectura, contrato del motor, tests y el fix de
movimiento reducido correctos. Verificó por su cuenta el grep de
`transitionDuration|transitionDelay|animationDuration|animationDelay` en todo `src/`: solo dos
elementos (`anim-full`, `anim-dot` en `TraceCanvas.tsx`), ambos con el fix — no hay un tercer
sitio sin cubrir. `pnpm test` (909/909, 1 omitido), typecheck y lint en verde, corridos por el
propio revisor. Probó también `offset-path`+`offset-rotate: auto` en Chromium/WebKit/Firefox
con Playwright aislado — la flecha recorre bien los trazos en los tres motores (no sustituye
D11, la prueba en dispositivo real).

**Critical:** ninguno.

**Important #1 — la flecha estática de fin de trazo tapa un marcador de inicio en O, L, E y M**
(`TraceCanvas.tsx:386-401`, orden de capas `:351-401`). El triángulo de la Tarea 6
(`TRACE_ARROW_POINTS`, 0.14×0.14, antes ~0.03-0.05) tapa el círculo+número de inicio cuando el
final de un trazo coincide con el inicio de otro. Caso más grave: la **O** tiene un solo trazo
que empieza y acaba en el mismo punto — la flecha tapa su único marcador, dejando la pista 1
(pulso del punto de inicio) sin efecto visible a nivel 1, quien según `trace-design.md:169`
és "lo único visible" de esa pista cuando la base ya es 1.

**Ruling — Important #1: se arregla.** Cambiar el orden z violaría el orden de capas del spec
(`trace-design.md:139`) y pediría su propio Ruling; en cambio, cuando el final de un trazo
coincide con el inicio de cualquier trazo (de la misma letra), retrasar la flecha estática a lo
largo de su propio último segmento (`end − 0.15·dir`, o el valor que el implementador calcule
para separar centro de flecha y marcador). Test: misma idea que T6-2 pero flecha↔marcador, para
las 9 letras; debe fallar para O, L, E, M si se quita el arreglo. Coste si esta cifra (0.15)
quedara corta: un solape residual pequeño, visual, no funcional — bajo.

**Important #2 — README y spec desfasados respecto a la Tarea 5 cerrada y la Tarea 6.**
- `README.md:276` dice "5 tareas" (son 6); `:277-278` y `:349-354` dicen que falta la prueba
  manual del autor, ya confirmada (ver más arriba: torpe completa pasa, garabato completo
  falla, 1.5s bien, letra distinta rechazada); `:406` dice "todavía pendiente" sobre esa misma
  prueba, que es la que decide si los pares confundibles (E↔S, E↔P, O↔U) se quedan como están
  — hay que decir que el autor los dejó así. Nada menciona el fix de movimiento reducido, D18
  (marcadores separados) ni que la pista 2/flecha de presentación reemplazó al punto simple.
- `docs/superpowers/specs/2026-09-27-trace-design.md:170` (pista 2) y `:177` (presentación)
  siguen describiendo "un punto". La tabla de decisiones (`:32-37`) no tiene D18; tampoco la
  tabla de decisiones del README (`:392-399`).

**Ruling — Important #2: se arregla (solo docs).** Actualizar ambos ficheros con los puntos de
arriba. El banner desactualizado del README (línea ~8) ya estaba anotado como minor deferred
desde la Tarea 5 — no se repite aquí, pero el implementador puede corregirlo de paso si el
banner menciona el recuento de tareas.

**Important #3 (del propio revisor) — un toque accidental (un único punto de tinta) cuenta
como intento fallido**, gasta un escalón de pista y afecta contadores. El spec calla; el
revisor lo juzga por la expectativa razonable de un adulto viendo a un niño de 3-4 años tocar
sin querer. **No bloquea este merge** (D14: ningún niño llega a `trace` antes del Plan 5) pero
debe quedar como decisión abierta para el autor antes de que el Plan 5 desbloquee la Fase 1.

**Ruling — Important #3: no se arregla en este fix wave; se documenta como decisión abierta
del README** (junto a las demás decisiones abiertas, con puntero a este hallazgo) para que el
autor la resuelva antes o durante el Plan 5. Coste si se difiere mal: un niño real podría
gastar pistas por un roce accidental durante el Plan 5 — bajo mientras D14 siga en pie, y ya
queda visible en el README para que no se pierda.

**Minor #4 — con movimiento reducido, la pista 2 no tiene el respaldo prometido en ítems de
caja ≥2** (nivel de guía 2 o 3): las flechas estáticas de fin de trazo solo se pintan con
`level === 1` (`TraceCanvas.tsx:386`), así que en la pista 2 de un ítem con caja ≥1 (nivel ≥2)
no queda nada quieto que mostrar bajo `prefers-reduced-motion: reduce` — solo el punto/flecha
de `animation="dot"` congelado al final del último trazo.

**Ruling — Minor #4: se arregla en este mismo fix wave** (mismo fichero que el Important #1,
coste bajo, evita dejar otro Ruling pendiente): pintar las flechas estáticas también bajo
`motion-reduce:` mientras `animation === "dot"`, no solo en `level === 1`.

**Minor #5** — T6-1 solo comprueba presencia de clase, no comportamiento real (`jsdom` no
ejecuta transiciones). Ya reconocido por el propio plan y por el registro de la Tarea 6
(evidencia real vive aquí, con Playwright aislado) — sin acción, límite conocido.

**Declinado a juzgar por el revisor (con su razón), sin acción:** números de trazo como "texto
para el niño" (el spec pide inicios numerados); alturas en `vh` vs. la barra dinámica de Safari
(cubierto por D11, prueba en dispositivo real); `Presentation.tsx` importando `Written` de
`listen-tap/` (acoplamiento sin efecto funcional); `ReplayButton` activo durante pistas 2/3
(inocuo, igual que otras plantillas); nivel de guía bajando dentro de sesión tras acierto (D13
tal cual); scroll de 58px en 640×360 (Ruling ya tomado, de acuerdo). **Un hallazgo nuevo fuera
del diff, para anotar y no perder:** `SessionScreen.tsx:61`, `transition-[width]` sin
`motion-safe:` — gap real de movimiento reducido en la barra de progreso, anterior a esta rama,
fuera de alcance de este plan. **Queda para un plan posterior** (candidato: cuando se toque
`SessionScreen.tsx` de nuevo, o una pasada de accesibilidad transversal).

## Fix wave sobre la revisión final (2026-09-27, un solo dispatch: Puntos 1, 2 y 4 del brief)

El agente de la Tarea 6 (`a138216b072444181`) no seguía vivo en esta máquina (`ListAgents`
vacío) — implementador nuevo (sonnet), con el mismo contexto vía brief. Commits: `002ad85`
(Puntos 1-2, código+tests) y `c18123f` (Puntos 3-4, solo docs). 913 casos (912 pasan, 1
omitido; +3 nuevos: `T7-1`, `T7-1b`, `T7-2`), typecheck y lint en verde. Brief:
`.superpowers/sdd/2026-09-27-silabin-trazo/final-review-fixwave-brief.md`. Reporte completo:
`.superpowers/sdd/2026-09-27-silabin-trazo/final-review-fixwave-report.md`.

**Punto 1 (Important #1):** `ARROW_RETREAT_DISTANCE = 0.15` — la flecha retrocede a lo largo
de su dirección de llegada (`strokeAngleDeg`) cuando su final coincide con el inicio, sin
desplazar, de cualquier trazo de la letra, incluido el propio (caso cerrado de la O). El
implementador verificó contra la geometría real de `UPPER_GLYPHS` (no de memoria) que O, L, E
y M son los únicos 4 casos, ninguno más.

**Punto 2 (Minor #4):** condición de las flechas estáticas ampliada a `level === 1 ||
animation === "dot"`; en el segundo caso llevan `hidden motion-reduce:block` (invisibles
salvo con movimiento reducido), sin tocar el caso `level === 1` ya aprobado en la Tarea 6.

**Mutación (Puntos 1-2; toca la guía pedagógica del trazo, exige 3-5 mutaciones dirigidas):**
de las 3 mutaciones del brief, 1 la detectó el test tal cual (`T7-1`, retreat a 0). Las otras
2 sobrevivían al test tal como estaba especificado en el brief, por razones geométricas/
lógicas reales (documentadas en el reporte), no por error del implementador, quien amplió el
test en vez de forzarlo: `T7-1b` (producto escalar retreat·llegada < 0, detecta el signo
invertido de `dir`) y un caso nuevo en `T7-2` (`level: 2, animation: "full"`, detecta
`animation !== "none"` mal puesto en vez de `=== "dot"`). El revisor (sonnet) re-derivó a
mano, de forma independiente, la geometría de las 9 letras y confirmó las 3; probó además una
cuarta mutación propia (`strokeStartAngleDeg` en vez de `strokeAngleDeg`), detectada vía el
caso de M en `T7-1b`.

**Revisión de tarea (sonnet), diff `9c29e62..c18123f`: Spec ✅, sin Critical ni Important.**
Confirmó las 8 ubicaciones que nombraba el brief (README:276, :277-278, bullets ~281-306,
tabla ~392-399, :406; spec tabla ~29-37, :170, :177) con el tratamiento pedido, y que la
extensión del implementador a "Siguientes pasos concretos" (misma corrección factual, para no
dejar el README contradiciéndose a dos secciones de distancia) es un ajuste de consistencia
razonable, no scope creep.

**Minor (deferred):** `TraceCanvas.tsx:345-347`, `arrowPositions` reindexa en vez de reusar el
`stroke` que ya da el `.map` — redundante, inocuo (≤4 trazos por letra). `T7-1b` tiene un
punto ciego teórico aislado a la O (arco muy discretizado, segmentos casi paralelos) que no
importa en la práctica porque la misma mutación ya falla por el caso de M dentro del mismo
`it()`.

Fix wave: complete (commits `9c29e62..c18123f`, review clean, 2 minor deferred, sin fix round
— review limpia a la primera).

## Estado

Plan escrito y aprobado (2026-09-27). **Tareas 1-6 completas. Revisión final de la rama: con
correcciones, y el fix wave que las resuelve, completo y con revisión limpia.** Queda **un
Important documentado como decisión abierta** para el autor (un toque accidental cuenta como
intento fallido en `trace`; ver README, "Lo que falta: planes 4 a 6", y el hallazgo Important
#3 de la revisión final más arriba), a resolver antes o durante el Plan 5 — protegido por D14
mientras tanto. Un hallazgo fuera de esta rama, anotado para un plan posterior:
`SessionScreen.tsx:61` (`transition-[width]` sin `motion-safe:`). Sin trabajo de código
pendiente en esta rama.

**Siguiente:** `superpowers:finishing-a-development-branch` (la prueba manual del autor y la
revisión final de la rama ya están hechas; falta solo el PR).
