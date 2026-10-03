# Lista de verificación en dispositivos reales

Es la única pasada manual del autor (spec §10, D35). Se hace **una vez**, sobre la **versión final
desplegada en Vercel** (D29: despliega el autor, nadie lo hace por él; ver
`docs/despliegue-vercel.md`). Reúne cuatro cosas que estaban repartidas:

- los cuatro puntos del spec §10 (permiso de micrófono, audio tras el primer toque, instalación
  en pantalla de inicio y comportamiento sin red);
- los **11 puntos de la prueba manual del Plan 6** y sus dos añadidos (que no se hicieron);
- la **deuda 1** del README (iPhone, iPad, Firefox, 360 × 640 y 640 × 360, adaptadores reales);
- **el arte del Plan 7**, que solo se puede juzgar en pantalla y con un niño delante.

Del Plan 5 no queda nada por hacer: sus 8 puntos se confirmaron el 2026-09-28 (con `mkcert`, en
desarrollo). Aquí solo se repite lo que cambia con el despliegue real (I1, I3, P8).

## Cómo se usa

- Cada punto tiene **Pasos**, **Esperado** y una línea para anotar el fallo. Marca `[x]` en «Bien» o
  en «Falla» y escribe qué pasó (captura de pantalla si puedes).
- Los puntos van agrupados por dispositivo: **iPad con Safari** (I), **iPhone con Safari** (H),
  **la PWA instalada** (P) y **PC con Chrome y Firefox** (C). Al final, la tabla de resultados.
- Un fallo no bloquea el resto: anótalo y sigue.
- **Un niño delante** en los puntos marcados con 👶 (el adulto juzga si algo estorba, pero solo el
  niño dice si una boca se entiende).

### Antes de empezar

1. Despliega la rama final (`docs/despliegue-vercel.md`) y apunta la URL. **La URL es pública**: no
   la compartas.
2. Ten a mano un iPad y un iPhone con Safari reciente y, si puedes, un segundo dispositivo con
   progreso (para exportar de él, punto I5).
3. **Cómo ver todo el arte sin jugar veinte sesiones.** Los premios se desbloquean jugando (10
   sesiones para la gorra, 10 trazos para Espacio, 100 estrellas para la última pegatina...). Para
   verlos ya, usa la propia función de importar:
   1. En el panel de padres, «Datos» → **Exportar**: te da un `.json`.
   2. Ábrelo en un editor y, dentro de `rewards`, deja `unlockedAt` así (una fecha ISO cualquiera
      por cada premio):

      ```json
      "unlockedAt": {
        "first-session": "2026-09-30T10:00:00.000Z",
        "vowel-a": "2026-09-30T10:00:00.000Z",
        "five-vowels": "2026-09-30T10:00:00.000Z",
        "first-syllable-voice": "2026-09-30T10:00:00.000Z",
        "steady-hand": "2026-09-30T10:00:00.000Z",
        "ten-sessions": "2026-09-30T10:00:00.000Z",
        "word-reader": "2026-09-30T10:00:00.000Z",
        "phase2-done": "2026-09-30T10:00:00.000Z",
        "stars:10": "2026-09-30T10:00:00.000Z",
        "stars:25": "2026-09-30T10:00:00.000Z",
        "stars:50": "2026-09-30T10:00:00.000Z",
        "stars:100": "2026-09-30T10:00:00.000Z"
      }
      ```

   3. **Importar** ese fichero (resumen y confirmación). Ahora «Mis premios» ofrece los 4 fondos,
      los 2 compañeros, los 3 rastros (estrellitas, burbujas y ninguno), la gorra y todas las
      pegatinas. Antes de tocar nada, **exporta el progreso real del niño** si lo hay: importar
      sustituye el documento entero (D27).
   4. Si el niño ya tiene progreso, haz esta prueba en otro navegador o en una ventana privada.

---

## 1. iPad con Safari (pestaña normal)

### I1. Permiso de micrófono (spec §10; deuda 1)

- **Pasos:** en Safari, abre la URL y llega a un ejercicio de voz (`say-it`, Fase 1: juega la
  Fase 0 con el niño o importa una exportación que ya la tenga; en producción no existe
  `/dev/plantillas`). Cuando empiece el turno de voz, Safari pide el micrófono: **permítelo**.
  Juega dos turnos más. Recarga la página y vuelve a un turno de voz.
- **Esperado:** el permiso se pide una vez por carga (al recargar, Safari lo vuelve a pedir: es
  normal en pestaña); el indicador de grabación se apaga entre turnos; la instrucción y el modelo
  se siguen oyendo bien después de abrir el micrófono.
- **Denegar:** repite con el permiso denegado (Ajustes de Safari para el sitio). Salen los botones
  del adulto «Lo dijo bien» / «Otra vez» y nunca una pantalla muerta.
- [ ] Bien  [ ] Falla: ______________________________________________

### I2. Audio tras el primer toque (spec §10; spec §9)

- **Pasos:** abre la URL en una pestaña nueva y **no toques nada**. Escucha. Toca «Toca para
  empezar». Empieza una sesión de la Fase 0.
- **Esperado:** antes del primer toque no suena nada (y no hay error); después del toque la voz
  se oye desde el primer ejercicio, con instrucciones, sílabas y palabras completas. Repite con el
  interruptor de silencio del iPad puesto y quitado, y anota qué pasa en cada caso.
- [ ] Bien  [ ] Falla: ______________________________________________

### I3. `say-it` con el micrófono real de Safari (deuda 1)

- **Pasos:** en una unidad de Fase 1, deja que el niño diga la sílaba a la distancia normal, con
  ruido de fondo (televisión).
- **Esperado:** la voz del niño da «oído» tras la cuenta atrás de tres puntos y el ruido no
  bloquea el turno; con `resume` colgado (Safari iOS) salen los botones del adulto en 1,5 s como
  máximo tras la cuenta atrás; tras tres «Otra vez» llega el modelo, donde basta con hablar.
- [ ] Bien  [ ] Falla: ______________________________________________

### I4. PIN: alta, error y olvido (Plan 6, punto 1)

- **Pasos:** mantén pulsado el logo 3 s; crea un PIN de 4 números; sal; vuelve a entrar con uno
  equivocado y con el bueno; prueba «¿Olvidaste el PIN?» (responde bien la multiplicación).
- **Esperado:** el PIN equivocado da un mensaje neutro; con la pregunta de adulto se puede poner
  otro PIN y **el progreso sigue ahí**.
- [ ] Bien  [ ] Falla: ______________________________________________

### I5. Importar (Plan 6, punto 2, y su añadido)

- **Pasos:** importa una exportación **real de otro dispositivo**; después una **rota** (edítala a
  mano: quita una llave o cambia `version`). Fíjate en el `<input type="file">` (el selector de
  fichero): ¿se toca con comodidad con el dedo?
- **Esperado:** la buena muestra el resumen y, al confirmar, cambia el progreso; la rota da un
  mensaje de rechazo y **no cambia nada**. El selector de fichero se pulsa bien (lo controla el
  navegador: si es pequeño, anótalo, es la deuda 4).
- [ ] Bien  [ ] Falla: ______________________________________________

### I6. Borrar y listo en `trace` (Plan 6, punto 3) 👶

- **Pasos:** en un ejercicio `trace`, que el niño trace una letra y use «Borrar» y «Listo».
- **Esperado:** los iconos (goma y pulgar) se entienden sin texto. Decide con el niño delante si
  sobra el temporizador de la detección automática (D19) ahora que hay botones; un toque
  accidental debe seguir desapareciendo sin gastar pista.
- [ ] Bien  [ ] Falla: ______________________________________________
- Decisión sobre el temporizador (D19): ______________________________

### I7. Minúsculas en `trace` con el dedo (Plan 6, punto 4)

- **Pasos:** en el panel activa «Trazo de minúsculas» y traza las 9 (a e i o u m l s p).
- **Esperado:** cada letra se acepta trazada con naturalidad; apunta las que se confunden (a/o y
  a/u ya son conocidas).
- [ ] Bien  [ ] Falla: ______________________________________________

### I8. Rastro encima de `trace` y de `build` (Plan 6, punto 5; deuda 1)

- **Pasos:** equipa «Estrellitas» y traza en `trace`; en `build`, arrastra sílabas con el rastro
  puesto.
- **Esperado:** el rastro no estorba al trazar ni al arrastrar, y el arrastre de `build` funciona
  bien con el dedo en Safari.
- [ ] Bien  [ ] Falla: ______________________________________________

### I9. Acento cambiado en vivo (Plan 6, punto 9)

- **Pasos:** cambia el acento en el panel de padres y vuelve a una sesión.
- **Esperado:** la voz cambia **sin recargar**.
- [ ] Bien  [ ] Falla: ______________________________________________

### I10. El compañero, en el mapa y en el fin de sesión, con y sin gorra (arte)

- **Pasos:** aplica la receta de «Antes de empezar». Equipa el **loro** («Compañero inicial») y luego el
  **elefantito** («Compañero nuevo»). Mira el mapa y termina una sesión corta. Repite quitando la gorra: importa una
  exportación sin `ten-sessions`.
- **Esperado:** en el mapa se ve grande (112 px) y en el fin de sesión más (160 px), sin cortes
  ni bordes de caja; con `ten-sessions` lleva **la gorra** (naranja el loro, amarilla el
  elefantito) y sin ella no; no tapa el botón de «Mis premios» ni ninguna unidad.
- [ ] Bien  [ ] Falla: ______________________________________________

### I11. Los cuatro fondos, legibles (arte)

- **Pasos:** equipa uno a uno **Fondo clásico, Pradera, Espacio y «Bosque y trofeo»**. Recorre el mapa, «Mis
  premios» y el fin de sesión, en **vertical y apaisado**.
- **Esperado:** con cada fondo se leen el título, el contador de estrellas, la marca de
  «guardado», las fichas de unidad (también las bloqueadas, con su candado) y el álbum; el fondo
  llena la pantalla sin franjas; **nunca** aparece detrás de una sesión.
- [ ] Bien  [ ] Falla: ______________________________________________

### I12. Serie de pegatinas y trofeo (arte)

- **Pasos:** abre «Mis premios» con todo desbloqueado; mira las pegatinas de 10, 25, 50 y 100
  estrellas, la de avión (A de avión) y el trofeo (Bosque y trofeo).
- **Esperado:** la serie se reconoce por crecer en tamaño y en adornos, **sin ningún número
  pintado**; cada logro enseña la pieza que desbloquea; lo que sigue bloqueado sale como
  silueta gris de su propia imagen; el trofeo se ve entero.
- [ ] Bien  [ ] Falla: ______________________________________________

### I13. Partículas al trazar y al arrastrar (arte)

- **Pasos:** equipa «Estrellitas» y luego «Burbujas»; traza en `trace` y arrastra en `build`.
  Repite con «Celebraciones reducidas» activo en el panel de padres, y con «Reducir movimiento» del
  sistema.
- **Esperado:** salen estrellitas o burbujas del arte (no emoji), sin más de unas pocas a la vez y
  sin frenar el dedo; con las celebraciones reducidas o el movimiento reducido no sale ninguna
  partícula (no se monta la capa), pero el cursor del puntero sí cambia (I14).
- [ ] Bien  [ ] Falla: ______________________________________________

### I14. Cursor del rastro con trackpad o ratón (arte; spec §9)

- **Pasos:** solo si el iPad tiene trackpad o ratón (Magic Keyboard, ratón Bluetooth). Equipa
  «Estrellitas» y mueve el puntero; luego «Burbujas»; luego «Sin rastro».
- **Esperado:** el puntero cambia a la estrellita o a la burbuja y vuelve al normal con «Sin
  rastro». Con el dedo (sin puntero) no cambia nada. Si no hay trackpad, marca «n/a».
- [ ] Bien  [ ] Falla  [ ] n/a: __________________________________

### I15. La boca de `say-it` 👶 (arte; D21; deuda 1)

- **Estado del arte:** las bocas fotorrealistas se **aplazaron** (el autor las rechazó dos veces;
  D21 pide esquemática). Hoy `Mouth` pinta su **SVG esquemático** de respaldo, no un `mouth-*.webp`.
  Se prueba ese dibujo.
- **Pasos:** en `say-it`, abre la pista 1 (la boca) con el niño delante, en las seis posiciones:
  `a` (abierta), `e`/`i` (estirada), `o`/`u` (redonda), `m`/`p` (cerrada), `s` (dientes), `l`
  (lengua).
- **Esperado:** la boca se ve y cambia **de forma fluida** la primera vez que suena en el iPad, sin
  parpadeos ni huecos en blanco; y **cada forma se distingue de las demás a 128 px, probado con
  un niño** (D21). Anota cuáles se confunden.
- [ ] Bien  [ ] Falla: ______________________________________________
- Formas que el niño confunde: ______________________________________

---

## 2. iPhone con Safari

Mismos pasos y esperados que el iPad; aquí solo lo que **cambia** con la pantalla pequeña.

### H1. Permiso de micrófono y audio tras el primer toque (spec §10)

- **Pasos:** repite I1 e I2 (permiso una vez por carga, denegar → botones del adulto; silencio
  hasta el primer toque).
- **Esperado:** igual que en el iPad.
- [ ] Bien  [ ] Falla: ______________________________________________

### H2. Apaisado con la franja de 3 botones de `trace` (Plan 6, añadido; deuda 1)

- **Pasos:** en un `trace`, gira el iPhone a **apaisado** (unos 667 × 375 o 852 × 393; el peor
  caso previsto es 640 × 360, que se prueba con precisión en C3).
- **Esperado:** la franja de 3 botones («Oír otra vez», «Borrar» y «Listo») cabe entera, los botones miden
  72 px o más y no tapan el lienzo ni se salen por los bordes; el trazo se puede hacer.
- [ ] Bien  [ ] Falla: ______________________________________________

### H3. Pantalla estrecha, vertical (deuda 1)

- **Pasos:** en vertical, recorre inicio, mapa, sesión (una plantilla de toque, `build` y
  `trace`), fin de sesión y «Mis premios».
- **Esperado:** sin scroll dentro de un ejercicio, sin texto cortado, objetivos táctiles cómodos
  y el compañero de 112 px sin apretar el mapa. En el mapa, el compañero y el botón de premios
  no se pisan.
- [ ] Bien  [ ] Falla: ______________________________________________

### H4. Arte legible en pantalla pequeña (arte)

- **Pasos:** con los 4 fondos (receta de «Antes de empezar»), mira mapa y fin de sesión; en
  «Mis premios», las pegatinas.
- **Esperado:** el texto y los indicadores se leen con cualquier fondo; la serie de pegatinas se
  distingue por tamaño; la boca (I15) se distingue a 128 px también aquí.
- [ ] Bien  [ ] Falla: ______________________________________________

### H5. Rastro y arrastre de `build` con el dedo (deuda 1)

- **Pasos:** arrastra sílabas en `build` con y sin rastro equipado.
- **Esperado:** las piezas siguen al dedo y encajan; el rastro no estorba.
- [ ] Bien  [ ] Falla: ______________________________________________

---

## 3. La PWA instalada (iPad y iPhone)

Instálala en el iPad y, si puedes, también en el iPhone (los puntos con dos dispositivos se
marcan aparte en la tabla).

### P1. Instalación en pantalla de inicio (spec §10; Plan 6, punto 6)

- **Pasos:** en Safari, Compartir → «Añadir a pantalla de inicio». Ábrela desde el icono.
- **Esperado:** se instala con el nombre «Silabín»; abre a **pantalla completa** (sin barra de
  Safari) y llega a «Toca para empezar».
- [ ] Bien  [ ] Falla: ______________________________________________

### P2. El icono de la pantalla de inicio, sin recortes (arte)

- **Pasos:** mira el icono en la pantalla de inicio, en una carpeta y en el cambiador de
  aplicaciones. Si tienes Android o un Chrome de escritorio, instala también allí y mira el
  icono con máscara (redonda o cuadrada con esquinas).
- **Esperado:** se ve **el loro** sobre fondo crema, nítido, con la cara entera. **Sin recortes
  con máscara:** en iOS y en una máscara redonda de Android no se pierde la cara; el plumaje del
  contorno puede rozar el borde (el icono ocupa cerca del 81 %; ver el ledger del Plan 7). Si una
  máscara circular recorta plumas de forma fea, anótalo: se regenera con más margen.
- [ ] Bien  [ ] Falla: ______________________________________________

### P3. El color de la barra (`theme_color`) (arte)

- **Pasos:** abre la PWA instalada y también la pestaña de Safari; mira la barra de estado y, en
  Chrome de Android o de escritorio, la barra de título o de direcciones.
- **Esperado:** el color de la barra es el **amarillo del loro** (el token `action`, `#F9BE23`) y
  el fondo de arranque, el crema (`surface`, `#FFF8EC`); no hay destello blanco ni negro al abrir.
- [ ] Bien  [ ] Falla: ______________________________________________

### P4. Comportamiento sin red (spec §10; Plan 6, punto 7; arte)

- **Pasos:** con la app ya abierta una vez **con red**, activa el modo avión y ciérrala del todo.
  Ábrela de nuevo.
- **Esperado:** arranca (no pantalla en blanco ni el error del navegador), se ve el mapa con el
  **fondo, el compañero, las pegatinas, los iconos y las ilustraciones de las palabras**
  (precaché), y se puede jugar una sesión de toque. No hace falta que todo funcione sin red: sí
  que las imágenes se vean.
- [ ] Bien  [ ] Falla: ______________________________________________

### P5. Volver la red a mitad de una sesión no recarga la app (Plan 6, punto 10)

- **Pasos:** empieza una sesión, corta la red, devuélvela.
- **Esperado:** la sesión sigue donde estaba, sin recarga.
- [ ] Bien  [ ] Falla: ______________________________________________

### P6. Actualización tras un segundo despliegue (Plan 6, punto 8)

- **Pasos:** despliega un cambio mínimo (`docs/despliegue-vercel.md`). Abre la app instalada y
  toca «Toca para empezar».
- **Esperado:** se recarga **una vez** con la versión nueva y sin romper nada; nunca a mitad de
  una sesión.
- [ ] Bien  [ ] Falla: ______________________________________________

### P7. Service worker nuevo esperando y ▶ dos veces (Plan 6, punto 11)

- **Pasos:** tras un segundo despliegue, con la app abierta y el service worker nuevo esperando,
  toca ▶ **dos veces seguidas**.
- **Esperado:** no se rompe nada ni se queda el botón muerto. Anota si la app arranca sin recargar
  y si algo falla sin red después.
- [ ] Bien  [ ] Falla: ______________________________________________

### P8. La voz en la PWA instalada (spec §11.2; deuda 1)

- **Pasos:** en la PWA, llega a un ejercicio `say-it` (o `read-word`) y deja que empiece el turno
  de voz.
- **Esperado:** Web Speech no está disponible en las PWA de iOS: el adulto **nunca queda
  atrapado**: cae a los botones «Lo dijo bien» / «Otra vez». Si el micrófono sí se abre, anota que
  funciona (mejor de lo previsto).
- [ ] Bien  [ ] Falla: ______________________________________________

### P9. Audio tras el primer toque, ya instalada (spec §10)

- **Pasos:** cierra la PWA del todo, ábrela y escucha antes de tocar; toca «Toca para empezar».
- **Esperado:** silencio hasta el toque y voz desde el primer ejercicio, como en Safari.
- [ ] Bien  [ ] Falla: ______________________________________________

---

## 4. PC con Chrome y Firefox

Chrome y Firefox de escritorio, sobre la URL desplegada. Las medidas se simulan con las
herramientas de desarrollo (F12, «modo dispositivo»).

### C1. Cursor del rastro con ratón, en Chrome y en Firefox (arte)

- **Pasos:** equipa «Estrellitas», mueve el ratón sobre el mapa y sobre una sesión; luego
  «Burbujas»; luego «Sin rastro». Recarga con un rastro equipado.
- **Esperado:** con `(pointer: fine)` el puntero pasa a estrellita o burbuja (imagen nítida), cambia
  en caliente al equipar otro rastro, y con «Sin rastro» vuelve al puntero normal; sigue así tras
  recargar. Con las herramientas en modo táctil no cambia.
- [ ] Chrome bien  [ ] Firefox bien  [ ] Falla: ______________________

### C2. Arte y fondos en Chrome y Firefox (arte)

- **Pasos:** con la receta de «Antes de empezar», recorre los 4 fondos, el compañero con y sin
  gorra, las pegatinas y el trofeo, las partículas al trazar con ratón y al arrastrar.
- **Esperado:** las imágenes cargan (los fondos son WebP, los iconos de interfaz PNG); las
  partículas salen del arte; el texto se lee con cualquier fondo.
- [ ] Chrome bien  [ ] Firefox bien  [ ] Falla: ______________________

### C3. 360 × 640 y 640 × 360, con la franja de 3 botones de `trace` (deuda 1; Plan 6, añadido)

- **Pasos:** en Chrome, modo dispositivo, define **360 × 640** y **640 × 360**. En cada uno
  recorre mapa, una plantilla de toque, `build`, `trace` (con la franja de 3 botones en el apaisado),
  fin de sesión y «Mis premios».
- **Esperado:** sin scroll dentro de un ejercicio ni texto cortado; en **640 × 360** la franja de 3
  botones de `trace` cabe (hasta ahora solo se razonó por aritmética) y deja lienzo para trazar;
  el compañero y la banda del mapa no tapan las unidades.
- [ ] Bien  [ ] Falla: ______________________________________________

### C4. El arrastre de `build` en Firefox (deuda 1)

- **Pasos:** en Firefox, arrastra sílabas en `build` con el ratón (y con pantalla táctil si la
  hay), con y sin rastro equipado.
- **Esperado:** las piezas siguen al puntero y encajan (Firefox trata el arrastre nativo de
  forma distinta a Chrome; anota cualquier pieza que se quede pegada o suelte mal); el rastro no
  estorba.
- [ ] Bien  [ ] Falla: ______________________________________________

### C5. Voz y trazo en escritorio (deuda 1)

- **Pasos:** en Chrome y en Firefox, `trace` con ratón; y un turno de voz (`say-it`) permitiendo el
  micrófono y denegándolo.
- **Esperado:** el trazo con ratón funciona; el micrófono se pide una vez por carga y, denegado o
  ausente, salen los botones del adulto sin pantalla muerta; `speechSynthesis` dice las
  instrucciones en español (comprueba las voces del acento elegido).
- [ ] Chrome bien  [ ] Firefox bien  [ ] Falla: ______________________

### C6. Instalar la PWA desde Chrome (Plan 6, punto 6; arte)

- **Pasos:** en Chrome, instala la app desde la barra de direcciones. Ábrela.
- **Esperado:** el icono (el loro) y el nombre «Silabín» son los correctos; la ventana usa el
  color de la barra (`theme_color`); sin red arranca como en P4.
- [ ] Bien  [ ] Falla: ______________________________________________

---

## Tabla de resultados

Anota **OK**, **Falla** o **n/a** y, si falla, la nota o el número de captura. El «Origen» dice de
dónde viene cada punto para que, si falla, se sepa qué documento abrir.

| ID | Punto | Origen | Resultado | Nota |
|---|---|---|---|---|
| I1 | Permiso de micrófono (iPad) | spec §10; Plan 5 (1, 4); deuda 1 | | solo dispositivo real |
| I2 | Audio tras el primer toque (iPad) | spec §10 | | solo dispositivo real |
| I3 | `say-it` con micrófono real en Safari | deuda 1 (adaptadores); Plan 5 (2, 3, 7) | | solo dispositivo real |
| I4 | PIN: alta, error y olvido | Plan 6, punto 1 | OK (emulado) | WebKit iPad Pro 11, ratón. Alta de PIN (1234), PIN equivocado → «PIN incorrecto»; ¿Olvidaste? → respuesta mala «Otra vez», buena → PIN nuevo (5678) y el progreso queda intacto (el documento sin el hash es idéntico; el hash cambió); entra con el nuevo |
| I5 | Importar (real, rota y `<input type="file">`) | Plan 6, punto 2 y añadido | OK parcial (emulado) | WebKit iPad Pro 11. Exportación **del mismo navegador**, editada (no «de otro dispositivo») e importada: resumen «Sin nombre — 3 sesiones, 3 estrellas, 1 unidades completas, última sesión el 30/9/2026», sustituye y conserva el PIN. 5 rotas (versión 99, sin `items`, sin `rewards`, no es JSON, fecha de premio no texto): mensaje de rechazo correcto y documento **sin cambios** en las 5. Comodidad del `<input type="file">` con el dedo: sin probar (deuda 4) |
| I6 | Borrar y listo en `trace` | Plan 6, punto 3 | | 👶 dispositivo real |
| I7 | Minúsculas en `trace` | Plan 6, punto 4 |  | nota: J2 pasa en Chromium iPhone 13 (minúsculas, sesión completa con trazo); no se marca OK |
| I8 | Rastro sobre `trace` y `build` | Plan 6, punto 5; deuda 1 (`build`) | | |
| I9 | Acento en vivo | Plan 6, punto 9 | **Falla** | ⚠️ ver defecto A del registro del Plan 7. WebKit iPad Pro 11 con síntesis real y con síntesis simulada |
| I10 | Compañero en mapa y fin de sesión, con y sin gorra | arte (Plan 7) | OK (autor: con gorra) + (emulado: sin gorra) | Autor, iPad real: con gorra OK, importando con `ten-sessions`. Emulado: documento **sembrado en IndexedDB** (no importado) sin `ten-sessions`: mapa en WebKit iPad Pro 11 `data-wears-cap=false` y `companion-1.webp`/`companion-2.webp` a 112×112; fin de sesión en Chromium con viewport iPad Pro 11 a 160×160, `companion-2.webp` sin gorra y `companion-2-gorra.webp` con gorra |
| I11 | Los cuatro fondos, legibles | arte (Plan 7); V13 | OK (autor) | Emulado además: los 4 fondos cargan (`naturalWidth` 960) en WebKit iPad Pro 11; capturas de Espacio y Bosque (mapa y «Mis premios», vertical) legibles; apaisado capturado pero no leído |
| I12 | Serie de pegatinas y trofeo | arte (Plan 7); V6, V8 |  | el autor no lo reportó |
| I13 | Partículas al trazar y al arrastrar | arte (Plan 7) |  | el autor no lo reportó |
| I14 | Cursor con trackpad (si hay) | arte (Plan 7); V11 | OK (autor) |  |
| I15 | Boca: fluida y cada forma distinguible a 128 px, con niño | arte (Plan 7); D21; deuda 1; bocas aplazadas | OK con nota (autor) | la boca esquemática no se anima (deuda 5, `minor (deferred)`); falta la prueba con niño 👶 |
| H1 | Micrófono y audio tras el primer toque (iPhone) | spec §10; deuda 1 | | dispositivo real |
| H2 | Franja de 3 botones de `trace` en apaisado | Plan 6, añadido; deuda 1 | **Falla** | ⚠️ ver defecto B del registro del Plan 7. Chromium 640×360, 667×375 y 852×393 |
| H3 | Pantalla estrecha en vertical | deuda 1 (iPhone) | OK (emulado) | Chromium 360×640 vertical (no es Safari real): sin scroll dentro de `initial-sound`, `trace`, `say-it`, `build`, `listen-tap` ni en el fin; ningún botón fuera de la pantalla; en el mapa el compañero y el 🎁 no se pisan (captura). Falta iPhone real |
| H4 | Arte legible en pantalla pequeña | arte (Plan 7) |  | el mapa a 360×640 se lee en captura, pero falta iPhone real |
| H5 | Rastro y arrastre de `build` con el dedo | deuda 1 | | falta dispositivo real |
| P1 | Instalación en pantalla de inicio | spec §10; Plan 6, punto 6 | | dispositivo real |
| P2 | Icono sin recortes con máscara | arte (Plan 7); Ruling del icono (81 %) | | dispositivo real |
| P3 | Color de la barra (`theme_color`) | arte (Plan 7); CO3 | | dispositivo real |
| P4 | Comportamiento sin red (y arte precacheado) | spec §10; Plan 6, punto 7 |  | nota: J4 (sesión completa sin red) pasa en Chromium iPhone 13; no se marca OK |
| P5 | Volver la red no recarga la sesión | Plan 6, punto 10 | | |
| P6 | Actualización tras un segundo despliegue | Plan 6, punto 8 |  | pide un segundo despliegue |
| P7 | Service worker esperando y ▶ dos veces | Plan 6, punto 11 |  | pide un segundo despliegue |
| P8 | Voz en la PWA cae a botones del adulto | spec §11.2; deuda 1 | | dispositivo real |
| P9 | Audio tras el primer toque, ya instalada | spec §10 | | dispositivo real |
| C1 | Cursor del rastro con ratón (Chrome y Firefox) | arte (Plan 7); V11 | OK parcial (emulado) | Chromium y Firefox de escritorio: `html[data-trail-cursor]` y `cursor: url(…cursor-estrellita.png) 16 16, auto` con `(pointer: fine)` verdadero; cambia en caliente a burbujas, «Sin rastro» vuelve a `auto`, persiste tras recargar; el PNG responde 200 y mide 32×32. El cursor no se ve en las capturas y el modo táctil no se probó |
| C2 | Arte y fondos en Chrome y Firefox | arte (Plan 7); deuda 1 (Firefox) | OK parcial (emulado) | Chromium y Firefox: con los 4 fondos, 17/17 imágenes cargadas, 0 respuestas ≥ 400, consola sin errores ni avisos. Partículas con ratón no verificadas a la vista |
| C3 | 360 × 640 y 640 × 360, franja de `trace` | deuda 1; Plan 6, añadido | **Falla** (640×360); OK (360×640) | ⚠️ ver defecto B del registro del Plan 7. 360×640 (Chromium): `trace` con la franja en fila (Oír 80×80, Borrar y Listo 72×72, y=104-184), lienzo 317×416 sin scroll |
| C4 | Arrastre de `build` en Firefox | deuda 1 | OK (emulado, Firefox) | Firefox de Playwright, ratón, sin rastro y con estrellitas: las piezas siguen al puntero y encajan (casillas `[1,0]` y luego `[1,1]`). En Chromium la segunda soltada dio `[0,0]`: ambas casillas se llenaron y la respuesta errónea las vació (es el comportamiento esperado). Táctil sin probar |
| C5 | Voz y trazo en escritorio | deuda 1 (adaptadores) | OK parcial (emulado) | Trazo con ratón: sesión completa en Chromium y Firefox con el mismo resultado. Micrófono denegado: «Lo dijo bien»/«Otra vez» en ≤ 1 s (Firefox con `permissions.default.microphone=2`, Chromium sin permiso). Firefox con micrófono falso (`media.navigator.streams.fake`): botones de adulto en ≤ 3 s. **Sin probar:** voz en español y acento (`speechSynthesis.getVoices()` sale vacío en headless en ambos), «se pide una vez por carga» |
| C6 | Instalar la PWA desde Chrome | Plan 6, punto 6; arte | | |

> **Pasada automatizada sobre el preview del commit `10d8b40` (2026-10-02).** Rellenada con un
> arnés de Playwright y con lo que el autor probó a mano en el iPad. Cada nota dice el método:
> «(emulado)» es WebKit, Chromium o Firefox de Playwright con ratón y **no cierra la deuda 1**
> (hardware real); «(autor)» es el iPad real. Los dos fallos (I9 y C3/H2) y el método completo
> están en `docs/superpowers/2026-09-29-plan-7-registro.md`, «Pasada de verificación sobre el
> preview». Los puntos en blanco siguen sin probar.

### Al terminar

- Los fallos que sean de arte (una boca que se confunde, un icono recortado, un fondo ilegible)
  se apuntan en el registro del Plan 7 como `Ruling:` o `minor (deferred)`.
- Cuando todo esté en OK o anotado, la **deuda 1 del README** se cierra y esta lista pasa al
  archivo (`docs/archivo-trampas-y-deuda.md`). Los ★ de `celebrate` ya están decididos: el autor
  los aceptó a 2,34 : 1 (2026-09-29; `docs/diseno-visual.md`, «Decisiones del autor»).
