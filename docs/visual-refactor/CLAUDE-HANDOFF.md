# Instrucciones para Claude

## Objetivo

Aplicar a la aplicación real el refactor visual documentado en esta carpeta. Leer primero `CLAUDE.md`, `AGENTS.md`, el estado actual de `README.md`, el spec pedagógico y los ledgers vigentes. Cumplir el flujo de modelos, planificación y revisiones del repositorio. Esta entrega es una referencia de diseño, no un plan de implementación ejecutado.

## Orden de trabajo

1. Revisar `map-preview.html` y `icons/demo.html`. El catálogo de iconos contiene la versión más reciente de letras, centrado y escalas ópticas; sustituye los símbolos anteriores del mapa.
2. Inspeccionar `src/features/map/MapScreen.tsx`, sus tests, los tokens existentes, `src/components/Icon.tsx`, el currículo y la registry de sesiones. Comprobar primero los cambios del Plan 7 y sus ramas: esta entrega parte de main y no resuelve su integración.
3. Escribir un plan breve según las reglas del repositorio, con ledger y revisión. Priorizar mapa y botones; no trasladar minijuegos ni pantallas de recompensa simuladas de los previews a producción.
4. Adaptar `ChallengeNode` a los componentes y convenciones reales. Leer las guías locales de Next antes de tocar código. Importar CSS desde una ubicación permitida y mantener los límites de cliente apropiados. No es necesario añadir Lucide: los contornos ya están incluidos.
5. Integrar recorrido y líneas: conectores detrás de los nodos, sin interceptar pulsaciones; recalcular posiciones al cambiar tamaño. Comprobar aro simétrico, sin desplazamiento por sombras ni recorte en bordes.
6. Ejecutar las puertas y revisar el diff con el flujo del repositorio antes de integrar.

## Contrato funcional que debe conservarse

- El motor sigue decidiendo progreso, dominio, estrellas, unidad activa y desbloqueos. Usar `unitProgress`, `activeUnitId`, `totalStars` e `isSessionPlayable` existentes; no duplicar la lógica del preview.
- Estados del motor: `done` → `completed`, `locked` → `locked`, `active` y jugable → `available`. Una unidad activa sin plantilla implementada debe conservar el aviso «Llega en una próxima versión» y no iniciar sesión.
- Los ocho iconos de fase 3 son recursos futuros; no hacen esas unidades jugables.
- Conservar los callbacks de MapScreen, el panel de padres, SavedMark, los avisos de guardado y la colección real. No convertir botones completados en iniciadores de sesión si el contrato actual no lo permite.
- El componente de referencia usa `disabled` para locked; el mapa actual usa `aria-disabled`. Elegir conscientemente la semántica integrada para conservar accesibilidad, foco y los tests relevantes.
- Mantener `data-unit`, `data-status`, etiquetas accesibles y `aria-current` donde corresponda. Estados distinguibles también por forma/insignia; no solo color.
- Conservar pedagogía: sin castigos, sonido en vez de nombre, pistas escalonadas y dominio antes de avanzar. Los puntos actuales muestran lo ganado; no agregar indicadores de fracaso o déficit.

## Criterios visuales

- Camino conectado y legible en móvil, iPad y escritorio; sin solapamientos ni desplazamiento horizontal a 320 px.
- Letras del catálogo final, sin fallback tipográfico. Un solo símbolo base por ID; estados mediante CSS.
- Mantener la corrección óptica de m, i, l, p, t, f, n, u y r incluida en los SVG y el componente.
- Aro exterior concéntrico al círculo del nodo en todos los anchos.
- Símbolo principal visible en bloqueados; candado pequeño en una insignia separada.
- Superficies opacas compatibles con los fondos equipados existentes; contraste suficiente en ambos temas. Adaptar los colores de referencia a los tokens existentes.
- Mascota opcional en composición; no eliminar la funcionalidad de compañeros ni recompensas.
- Respetar reduced-motion, foco visible y objetivos táctiles de al menos 44 px.

## Validación al implementar

`pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit conforme a CLAUDE.md. Para la integración final: build y e2e correspondientes, regresiones del mapa y revisión manual en Safari/iPad. Verificar bloqueo, unidad activa no implementada, inicio de sesión jugable, progreso tras completar, panel de padres y guardado.

## Prompt para retomar

> Integra el refactor visual de docs/visual-refactor. Lee README.md y CLAUDE-HANDOFF.md de esa carpeta y cumple CLAUDE.md/AGENTS.md del repositorio. Usa el mapa como referencia de composición y icons/demo.html como autoridad de iconos y letras finales. Escribe primero el plan y ledger; conserva el motor y las reglas de progreso. Aplica camino conectado, aro centrado, símbolos visibles en bloqueados y estados por CSS; verifica las puertas y la revisión final.
