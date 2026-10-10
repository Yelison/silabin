Integrado en el Plan 8 (ledger `docs/superpowers/2026-10-09-plan-8-registro.md`).

# Refactor visual de Silabín: entrega para Claude

Esta carpeta conserva el diseño acordado y los recursos reutilizables antes de aplicarlos a la aplicación. No cambia `src/`, el motor, el progreso ni las dependencias. El componente en `icons/` es código de referencia para adaptar y verificar durante la integración.

## Referencias

- `map-preview.html`: último mapa funcional de referencia, con camino conectado, color por estado, aro centrado y símbolos visibles en desafíos bloqueados. Sus interacciones, ejercicios, estrellas y recompensas son simulaciones; no usar sus datos o lógica como motor real.
- `map-preview.fragment.html`: fuente editable del mapa. Usa Lucide del entorno original.
- `icons/demo.html`: catálogo final de 30 iconos con selector de estado; esta es la autoridad para las letras y los botones, porque sus ajustes son posteriores al mapa.
- `icons/ChallengeNode.tsx` y `icons/challenge-node.css`: componente y estilos de referencia.
- `icons/manifest.json` y `icons/svg/`: correspondencia de 9 plantillas y 21 unidades, incluidas 8 futuras.
- `CLAUDE-HANDOFF.md`: instrucciones y criterios de aceptación para aplicar el diseño.

Abre los HTML en el navegador. El mapa completo carga Lucide desde CDN y necesita conexión; el catálogo de iconos es autónomo. Si se sirven por HTTP, `python3 -m http.server 8080` desde esta carpeta basta. Los HTML están fuera de `public/`: son documentación, no rutas de producción.

## Decisiones visuales aprobadas

- Apariencia sencilla y lúdica, inspirada en rutas de aprendizaje como Duolingo, manteniendo identidad propia.
- Conservar las líneas que conectan los ejercicios y el recorrido serpenteante.
- No obligar a la mascota a ocupar un lugar fijo en el mapa.
- Disponible: amarillo cálido y aro exterior centrado con el botón.
- Completado: azul y una insignia de completado.
- Bloqueado: superficie discreta con el símbolo del desafío visible y candado pequeño separado.
- Un único SVG neutro por símbolo; los estados se obtienen con `currentColor` y CSS.
- Vocales y consonantes en minúscula con contornos de Andika Bold; centrado por límites visibles, sin depender de cargar la fuente.
- Ajuste óptico individual de tamaño, especialmente para la m y las letras estrechas.

## Validación de esta entrega

Se comprobaron el XML de los 30 SVG, la correspondencia del manifiesto con los archivos y la sintaxis de los scripts de ambos previews. No se ejecutaron `pnpm test`, `pnpm typecheck`, `pnpm lint`, build ni e2e de la aplicación: no hay integración con `src/`. La revisión visual final del último ajuste y las pruebas en Safari/iPad quedan para la integración.
