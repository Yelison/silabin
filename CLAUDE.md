@AGENTS.md

# Silabín: reglas de trabajo

Empieza por `README.md`: estado actual, lo que falta, decisiones abiertas y trampas conocidas.
El spec `docs/superpowers/specs/2026-09-18-silabin-design.md` es la autoridad sobre qué se construye.
Responde en español, con ortografía completa (tildes y ñ).

## Cómo se ejecutan los planes

- Los planes se escriben con `superpowers:writing-plans` y se ejecutan con
  `superpowers:subagent-driven-development`. Invoca la skill **antes** de tocar código.
- Un subagente implementador por tarea, una revisión sobre su diff, rondas de corrección y
  re-revisión acotada. Al final, revisión de toda la rama con el modelo más capaz.
- **El coordinador nunca implementa ni commitea código.** Una vez se retomó un plan
  implementando tres tareas sin implementador ni revisión; el usuario lo paró, y las tres
  revisiones hechas después devolvieron `Needs fixes` con defectos reales. Las revisiones no
  son ceremonia.
- **El ledger de cada plan se versiona desde el primer día** en
  `docs/superpowers/<fecha>-plan-N-registro.md`, dentro de la rama del plan (el del Plan 1 es
  el modelo). `.superpowers/` está ignorado por git, y una sesión en otra máquina o en
  claude.ai/code no lo tendría; ahí solo van briefs, reportes y diffs desechables.
- Al retomar un plan, lee primero su ledger para saber por dónde se quedó.
- **Exige prueba por mutación** en los despachos que tocan lógica (ver «Modo económico»). Es la
  técnica que mejores hallazgos ha dado aquí. Un agente que reporta con honestidad que una
  mutación sobrevive vale más que uno que ajusta el test hasta que pase; tres veces el
  informe honesto de un agente corrigió a quien le había dado las instrucciones.
- Registra en el ledger cada decisión tomada sin consultar como `Ruling:`, con su porqué y
  lo que costaría si fuera equivocada, y lo que se deja sin arreglar como
  `minor (deferred)`.
- Cada plan va en una rama nueva desde `main` y se integra por PR.

## Modo económico: lento pero seguro

El usuario prefiere gastar menos tokens aunque el trabajo vaya más lento, **sin bajar la
calidad**. No hay medición de tokens del Plan 1, pero lo que más probablemente costó fue el
contexto acumulado del coordinador durante 22 tareas, un plan de 6000 líneas con el código
completo dentro, y rondas de corrección de hasta 5 vueltas. Reglas:

**Modelos, según lo que pide cada trabajo**
- La sesión principal (el coordinador) corre en el modelo que elige el usuario con `/model`,
  no en el que diga este fichero. Lo recomendado es `/model opus` para escribir el plan y
  `/model sonnet` para ejecutarlo.
- **Puerta de modelo (obligatoria).** Antes de despachar el primer subagente de una sesión
  de ejecución, o de cualquier trabajo de implementación, comprueba en qué modelo corres. Si
  no es Sonnet, **para sin despachar nada** y di: «Esta sesión está en <modelo>. Para
  ejecutar, cambia con `/model sonnet` y dime cuando esté». Lo mismo al revés: si el usuario
  pide escribir un plan y la sesión no está en Opus, sugiere `/model opus` antes de empezar.
  El usuario teme olvidarlo y gastar tokens de más: esta puerta no se salta.
- Subagentes implementadores y revisores de tarea: `model: "sonnet"` en el Agent tool.
- Revisión final de la rama: `model: "opus"`. Encontró el único defecto crítico del Plan 1;
  no se recorta.
- Haiku solo para búsquedas amplias que, si no, volcarían muchos ficheros en el contexto del
  coordinador. Las puertas (`pnpm test`, etc.) las corre el coordinador con la salida
  recortada: un subagente para eso cuesta más de lo que ahorra.

**Una cosa a la vez**
- Subagentes en secuencia, nunca en paralelo. Sin workflows ni fan-out.
- **Sesión nueva cada 2-3 tareas.** El ledger es la memoria: al empezar se lee el ledger y
  no se reconstruye la historia. Antes de cortar, deja el ledger al día y haz commit de él.
- **Aviso de corte (obligatorio).** Al cerrar cada tarea, di cuántas lleva esta sesión. Al
  llegar a 2, o antes si la conversación ya es larga (muchas vueltas de corrección, diffs
  grandes o un resumen automático de contexto), no empieces la siguiente: deja el ledger al
  día, haz commit y di: «Buen momento para cortar: ejecuta `/clear` y empieza con
  "Retoma el Plan N desde el ledger"». Con `/clear` se sigue en el mismo modelo, así que
  recuerda también cuál debe ser. **Siempre que recomiendes `/clear`, incluye en el mismo
  mensaje, en un bloque de código copiable, el primer mensaje exacto que el usuario debe
  escribir después:** plan y ruta, rama, ledger (`grep -n` y tramo final), tareas
  completas, siguiente tarea con su brief y rango de líneas, y los Rulings que le afectan.

**Planes más cortos**
- Por tarea, el plan fija el contrato (tipos, firmas, qué ficheros toca), la lista de casos
  de test con entradas y salidas, y los criterios de aceptación. **No incluye la
  implementación completa**; solo el código donde un detalle sea delicado.
- Agrupa las tareas pequeñas y de bajo riesgo (datos, configuración, textos) en una sola.
  Cada tarea tiene un coste fijo de brief, implementación y revisión.

**Revisión proporcional al riesgo**
- Lógica del motor, `store/`, contratos entre motor e interfaz y cualquier cosa que decida
  pedagogía: revisión completa con **3-5 mutaciones dirigidas** a las reglas críticas.
- Datos, estilos o configuración: revisión de cumplimiento del plan, sin mutación.
- Máximo **2 rondas de corrección** por tarea. Si no converge, para y pregunta al usuario.
- La re-revisión mira solo el diff de la corrección, no la tarea entera.

**Contexto ligero**
- Briefs con rutas y rangos de líneas (`sed -n 120,180p plan.md`), no con el plan pegado.
- Nunca leas enteros los ficheros grandes (el plan y el registro): usa `grep -n` y lee el tramo.
- Salida de comandos recortada: `pnpm test 2>&1 | tail -15`. El detalle solo si algo falla.
- Los diffs de revisión van a un fichero en `.superpowers/sdd/<plan>/`; el revisor los lee de ahí.
- Los reportes de los subagentes, breves: veredicto, hallazgos con fichero:línea y
  mutaciones probadas. Sin repetir el brief.

## Puertas y convenciones

- `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit. `vitest` no
  comprueba tipos: el `typecheck` es obligatorio.
- TDD. TypeScript estricto; `any` solo en el borde de `JSON.parse`, validado con Zod al momento.
- Conventional Commits en español, con el porqué en el asunto
  (`fix(engine): los distractores solo salen de lo que el niño ya ha visto`).
- `engine/` y `content/` no importan React ni tocan el DOM. `features/` y `components/`
  nunca deciden pedagogía: pintan lo que ordena el motor y le devuelven eventos.
- Los principios pedagógicos del spec (§2) no se negocian en el código: sonido y no nombre,
  sin castigos ni mensajes negativos, pistas de menos a más, introducción sin error y
  dominio antes de avanzar.

## Contexto que no está en el código

- **El Plan 2 construye `count-syllables`, no `listen-tap`**, aunque la hoja de ruta del
  Plan 1 diga lo contrario. La primera unidad del currículo es `phase0:clap`, que solo
  declara `count-syllables`. Acordado el 2026-09-19.
- **El audio no bloquea:** `speechSynthesis` es el placeholder detrás de la interfaz
  `audio/` hasta que haya cuenta de Azure. Las imágenes (35 `img:<palabra>`) sí son un hueco
  sin resolver.
- Antes de escribir el Plan 2, pregunta al usuario las decisiones abiertas de `README.md`.
