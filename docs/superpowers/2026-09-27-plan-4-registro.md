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

## Estado

Plan escrito y aprobado (2026-09-27). Tareas 1-5 completas (Tarea 5: automatizada clean +
prueba manual confirmada por el autor, ver arriba). Tarea 6 añadida al plan con todo lo que
decidió el autor durante la prueba manual — brief y dispatch en esta sesión. Después de la
Tarea 6: revisión final de la rama (opus).
