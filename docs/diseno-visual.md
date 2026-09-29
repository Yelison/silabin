# Diseño visual: base para niños de 3 a 6 años

Este documento recoge la investigación que respalda la decisión D8 del Plan 3 (plantillas de
toque), la tabla de tokens que se implementó en la Tarea 1 y las reglas que de ahí se derivan.
La paleta es la **final del Plan 7 (T5)**: sale de medir el arte real (ver «Paleta final»
más abajo) y la vigilan los tests de `src/app/tokens.test.ts` y `src/features/legibility.test.tsx`.
La primera propuesta (Plan 3) se conserva en los valores «antes».

## Investigación (resumen)

- **Objetivos táctiles:** [NN/g, desarrollo físico](https://www.nngroup.com/articles/children-ux-physical-development/)
  recomienda al menos 2 × 2 cm para niños de 3 a 5 años —cuatro veces el de un adulto— y
  espacio entre botones para no tocar el de al lado por error. El spec de Silabín pide
  ≥ 72 px como mínimo global; las opciones de este plan son mucho mayores (≥ 128 px,
  `--spacing-target`).
- **Arrastrar es difícil a esa edad.** El mismo informe de NN/g señala que «precise dragging …
  to a specific spot was hard for kids» y recomienda ofrecer tocar **o** arrastrar como
  alternativas equivalentes (Ruling previsto R15 del Plan 3, fuera del alcance de esta tarea).
- **Color:** [Lyu 2022](https://onlinelibrary.wiley.com/doi/abs/10.1002/col.22726) y el resto de
  la literatura sobre [color en interfaces infantiles](https://www.mcmillanpazdansmith.com/ideas/a-palette-for-learning-the-role-of-color-in-early-childhood-education-design/)
  coinciden en que los tonos cálidos y poco saturados sostienen la atención mejor que los
  primarios saturados a pantalla completa, que sobreestimulan. Los colores vivos se reservan
  para lo interactivo y las celebraciones. Los estados nunca se marcan solo con color
  (spec §9): cada estado lleva además forma, borde o movimiento.
- **Tipografía:** para quien empieza a leer, conviene una fuente con `a` y `g` de un solo
  piso, como las que se enseñan a escribir a mano
  ([tipografía infantil](https://type.today/en/journal/childrens_book_typography),
  [fuentes de Google para primeros lectores](https://www.colourmylearning.com/2025/08/best-child-friendly-print-fonts-from-google-fonts-for-early-readers/)).
  Andika (SIL) cumple esto, está pensada específicamente para alfabetización, la recomienda
  USAID para materiales de lectura inicial, está en Google Fonts y cubre tildes y ñ.
- Más fuentes: [NN/g, UX para niños](https://www.nngroup.com/reports/children-on-the-web/).

## Tokens (Tailwind 4, `@theme` en `src/app/globals.css`)

| Token | Uso | Valor |
|---|---|---|
| `--color-surface` | fondo de pantalla | `#FFF8EC` |
| `--color-card` | fondo de tarjetas y opciones | `#FFFFFF` |
| `--color-ink` | letras, sílabas, iconos | `#2B2A33` |
| `--color-ink-soft` | texto de adulto y controles secundarios | `#6B6772` |
| `--color-action` | lo que se toca: tambor, botón siguiente | `#F9BE23` |
| `--color-action-ink` | contenido sobre `action` | `#3A2A00` |
| `--color-calm` | fondo de opciones en reposo | `#DCEBFA` |
| `--color-calm-border` | borde de opciones en reposo | `#5187C7` |
| `--color-mark` | fondo de la opción marcada por el modelo | `#FFE27A` |
| `--color-mark-border` | borde de la opción marcada por el modelo | `#AC7600` |
| `--color-celebrate` | solo celebraciones y estrellas | `#E99810` |
| `--color-trace-ink` | tinta del dedo en el lienzo de `trace` (Plan 4) | `#6A4CFF` |
| `--radius-card` | tarjetas y botones | `1.5rem` |
| `--spacing-target` | lado mínimo de una opción | `8rem` (128 px) |
| `--font-reading` | letras, sílabas y palabras que el niño lee | Andika (`next/font/google`, pesos 400 y 700) |
| `--font-sans` | interfaz del adulto | fuente del sistema |

`--color-mark` y `--color-calm` se dividieron en dos variables cada una (fondo y borde) porque
Tailwind 4 genera una utilidad por variable de color (`bg-<nombre>`, `border-<nombre>`…); un
solo token no puede dar dos valores distintos a la vez.

### Comprobación de contraste (AA)

Calculado con la fórmula de contraste relativo de WCAG 2.x sobre los valores de la tabla:

| Par | Ratio | ¿Cumple? |
|---|---|---|
| `ink` sobre `surface` | 13.42 : 1 | Sí (≥ 4.5 : 1) |
| `ink` sobre `card` | 14.17 : 1 | Sí |
| `ink` sobre `calm` | 11.68 : 1 | Sí |
| `ink` sobre `mark` | 11.08 : 1 | Sí |
| `ink` sobre `action` | 8.38 : 1 | Sí (unidad activa del mapa) |
| `ink-soft` sobre `surface` | 5.22 : 1 | Sí |
| `ink-soft` sobre `card` | 5.51 : 1 | Sí |
| `action-ink` sobre `action` | 8.22 : 1 | Sí |
| `calm-border` sobre `surface` | 3.53 : 1 | Sí (≥ 3 : 1) |
| `calm-border` sobre `card` | 3.72 : 1 | Sí |
| `calm-border` sobre `calm` | 3.07 : 1 | Sí |
| `mark-border` sobre `surface` | 3.72 : 1 | Sí |
| `mark-border` sobre `card` | 3.93 : 1 | Sí |
| `mark-border` sobre `mark` | 3.07 : 1 | Sí |

Todos estos pares los recalcula `src/app/tokens.test.ts` (CO1) leyendo `globals.css`; la página
de desarrollo `/dev/arte` los enseña con el color que pinta el navegador. Fuera de la tabla:
`celebrate` (las estrellas) da 2.34 : 1 sobre `card` y 2.22 : 1 sobre `surface` (antes, con
`#FF9F1C`: 2.05 y 1.94). No es texto —el número de estrellas va en `ink`— y el ★ del fin de
sesión es grande, pero **no llega a 3 : 1**: ver «Abierto para el autor».

El texto (`ink`, `ink-soft`, `action-ink`) cumple AA con holgura. Los bordes de estado
(`calm-border`, `mark-border`) se oscurecieron manteniendo su tono (azul suave y ámbar,
respectivamente; ningún rojo ni verde) hasta llegar a ≥ 3 : 1 contra `surface`, `card` y su
propio fondo (`calm` / `mark`), que son los tres sitios donde puede aparecer un borde de
estado. `trace-ink` no es texto (es el trazo grueso que deja el dedo sobre el lienzo de
`trace`, Plan 4): no entra en la tabla de contraste AA, pero se eligió un morado bien
saturado, distinto del azul de la guía (`calm-border`) y del ámbar de `action`, para que se
distinga a simple vista sobre `surface`/`card` sin depender de más que el color, ya que ahí
no hay forma ni movimiento que lo respalde. Además, ningún estado depende solo del color:
`pulsing` también anima y `marked` también engrosa el borde a 8 px y añade el icono de mano.

## Paleta final (Plan 7, T5)

Colores dominantes medidos con Pillow (`quantize` a 6) sobre el arte real de
`public/images/arte/` (el compañero, solo con los píxeles opacos):

| Pieza | Dominantes |
|---|---|
| `companion-1` (loro) | `#F9BE23` 44 %, `#574D4E` 27 %, `#FBD74D` 10 %, `#B29351` 10 %, `#F5D65D` 7 % |
| `companion-2` (elefantito) | grises y lilas: `#8B94AC` 21 %, `#B0ADC4` 20 %, `#BDBACF` 18 %, `#6D667A` 17 % |
| `bg-default` | `#FEF9EE` 22 %, `#B1DDFD` 21 %, `#F3F6F4` 16 %, `#DCEFFC` 15 % |
| `bg-pradera` | `#DAD04E` 26 %, `#848F32` 25 %, `#A3D8FC` 19 %, `#8ECBFD` 18 % |
| `bg-espacio` | `#0D409A`, `#0A388C`, `#062363`: azul noche, casi todo el fondo |
| `bg-bosque` | `#745F28`, `#E0C876`, `#EDDC8D`, `#D1A651`: ocres |
| pegatinas y trofeo | dorados `#F5B81C`, `#F1BC32`, `#F9CC2D` y ámbar de sombra `#E99810`, `#E58A0A` |

Decisión por token (los que ya casaban se quedan igual):

| Token | Antes | Ahora | Del arte |
|---|---|---|---|
| `surface` | `#FFF8EC` | igual | el crema de `bg-default` (`#FEF9EE`, a 2 niveles por canal) |
| `calm` | `#DCEBFA` | igual | el cielo claro de `bg-default` (`#DCEFFC`) |
| `mark` | `#FFE27A` | igual | el amarillo claro del pecho del loro (`#FBD74D`, `#F5D65D`), más pálido que `action` para que se distingan |
| `action` | `#F5B83D` | `#F9BE23` | el cuerpo del loro, `companion-1`; ink 7.97 → 8.38 y `action-ink` 7.81 → 8.22 |
| `celebrate` | `#FF9F1C` | `#E99810` | el ámbar de `sticker-10`, más cercano al trofeo que un naranja saturado que no aparece en ningún fondo; sobre `card` 2.05 → 2.34 |
| `ink`, `ink-soft`, `action-ink`, `card` | sin cambio | | texto: se decide por contraste, no por el arte |
| `calm-border`, `mark-border` | sin cambio | | bordes de estado: ya oscurecidos para 3 : 1 |
| `trace-ink` | `#6A4CFF` | igual | tinta del dedo; el lila del elefantito (`#A99AB6`) es demasiado suave para un trazo |

Ningún token es rojo ni verde intenso (CO2), y `THEME_COLORS` (`src/app/theme-colors.ts`, que
usan `manifest.ts` y `layout.tsx`) sigue siendo `surface` y `action` (CO3).

### Texto sobre el fondo cosmético

`bg-pradera` (verdes `#848F32`, `#DAD04E`) y `bg-espacio` (azul noche) son saturados y con
detalle, y `bg-bosque` mezcla luz y sombra: **ningún texto ni indicador depende de ellos**.
En el mapa, la galería y el fin de sesión todo lo que se pinta suelto va sobre una superficie
opaca de token (`bg-surface`, `bg-card`, `bg-calm`, `bg-action`, `bg-mark`), y un test lo
vigila (`legibility.test.tsx`, LE1-LE5: no vale `bg-card/80`, ni `bg-calm-border`, ni una
ficha con `opacity-*`; lo atenuado baja la opacidad del contenido, no de la ficha). Las
fichas bloqueadas del mapa dejaban ver el fondo a su través con `opacity-60`: ahora la ficha es
`bg-card` opaca y solo su contenido se atenúa.

Los fondos son 3:4 y se pintan con `object-cover` a pantalla completa: revisados en
`/dev/arte` (retrato 3:4 y apaisado 16:9) y en un navegador a 820×1180, 1180×820 y 390×844,
no dejan franjas y en apaisado recortan arriba y abajo (el planeta y la luna de Espacio quedan
en los bordes; nada importante se tapa porque el contenido va en las bandas).

## Reglas

- **Sin rojo ni verde de «bien o mal» en ninguna parte.** El fallo es neutro (spec §2); ningún
  token de esta tabla es rojo o verde con ese significado.
- **Los estados se ven sin depender del color** (spec §9): `dimmed` reduce opacidad y escala;
  `pulsing` anima y engrosa el borde; `marked` engrosa el borde y añade un icono de mano.
- **Los colores vivos (`action`, `celebrate`) se reservan para lo interactivo y las
  celebraciones.** El resto de la pantalla usa tonos poco saturados (`surface`, `card`,
  `calm`) para no sobreestimular.
- **Tema claro fijo:** no hay modo oscuro. Una pantalla infantil que cambia de colores según
  el sistema del adulto confunde, y la paleta está pensada para fondo claro.

## Decisiones del autor

- **Los ★ de `celebrate` se aceptan por debajo de 3 : 1** (decisión del autor, 2026-09-29):
  2,34 : 1 sobre `card`, 2,22 : 1 sobre `surface` y 1,93 : 1 sobre `calm`. Llegar a 3 : 1
  obligaría a un ocre oscuro (~`#C47A00`, 3,4 : 1 sobre `card`) que ya no se lee como
  celebración. Los ★ van siempre con un número, la pegatina o la forma (★ llenas y vacías), y
  la unidad lleva `aria-label` con las estrellas: el color no es lo único que las dice.
- El ★ también se pinta sobre `calm` en las unidades hechas del mapa (`Estrellas`, en
  `MapScreen.tsx`); entra en la misma decisión (1,93 : 1; antes, con `#FF9F1C`, 1,69).

## Abierto para el autor

- `--color-*` no incluye un lila que case con el elefantito: nada lo pinta hoy sobre el fondo.

## Pendiente (Plan 7, identidad visual)

- **Bocas: el arte está aplazado.** No hay ningún `mouth-*.webp` (el autor rechazó dos veces el
  arte fotorrealista; D21 pide una boca esquemática, no realista). `Mouth` pinta su dibujo
  esquemático de respaldo por el `onError` y `/dev/arte` lo dice en una nota visible. Cuando haya
  arte aprobado se rehace la sección 5 de `docs/arte-plan-7-prompts.md` y se publican los seis
  (FI2 exige los seis o ninguno).
- **Glifos que quedan sin arte (V10):** 🔁 de «Repasar» (solo sale con el currículo agotado), ✓ del
  equipado y de «guardado», ✕ de salir (del adulto) y ★/☆ (glifos tipográficos con colores de
  token). Aceptados como `minor (deferred)`.
- **Prueba en dispositivo real:** `docs/checklist-ipad.md` (escrita; la pasa el autor sobre el
  despliegue de Vercel). Ahí se juzga lo que no se ve en el navegador de escritorio: la boca a
  128 px con un niño, el icono con máscara, el `theme_color` y el cursor con trackpad.
