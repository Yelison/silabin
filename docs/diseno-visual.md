# Diseño visual: base para niños de 3 a 6 años

Este documento recoge la investigación que respalda la decisión D8 del Plan 3 (plantillas de
toque), la tabla de tokens que se implementó en la Tarea 1 y las reglas que de ahí se derivan.
**La identidad final queda pendiente**: esta es una propuesta inicial, no la paleta ni la
tipografía definitivas, y no hay ilustraciones ni compañero (mascota) todavía.

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
| `--color-action` | lo que se toca: tambor, botón siguiente | `#F5B83D` |
| `--color-action-ink` | contenido sobre `action` | `#3A2A00` |
| `--color-calm` | fondo de opciones en reposo | `#DCEBFA` |
| `--color-calm-border` | borde de opciones en reposo | `#7FA7D6` |
| `--color-mark` | fondo de la opción marcada por el modelo | `#FFE27A` |
| `--color-mark-border` | borde de la opción marcada por el modelo | `#C98A00` |
| `--color-celebrate` | solo celebraciones y estrellas | `#FF9F1C` |
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
| `ink-soft` sobre `surface` | 5.22 : 1 | Sí |
| `ink-soft` sobre `card` | 5.51 : 1 | Sí |
| `action-ink` sobre `action` | 7.81 : 1 | Sí |
| `calm-border` sobre `surface` | 2.37 : 1 | **No** (objetivo ≥ 3 : 1) |
| `calm-border` sobre `calm` | 2.06 : 1 | **No** |
| `mark-border` sobre `surface` | 2.79 : 1 | **No** |
| `mark-border` sobre `mark` | 2.31 : 1 | **No** |

El texto (`ink`, `ink-soft`, `action-ink`) cumple AA con holgura. **Los bordes de estado
(`calm-border`, `mark-border`) no llegan al 3 : 1** que pide esta misma tarea para bordes.
Como los valores de la tabla son la propuesta inicial explícita del plan y hay que usarlos tal
cual, este documento dejа constancia del hallazgo en vez de cambiarlos por su cuenta: es un
`minor (deferred)` a resolver cuando llegue la paleta definitiva. Mientras tanto, los estados
no dependen solo del borde: `pulsing` y `marked` también cambian el grosor del borde y añaden
movimiento o un icono, así que la distinción no depende únicamente de un contraste de color
insuficiente.

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

## Pendiente (fuera de esta tarea)

- Paleta definitiva: la de esta tabla es una propuesta inicial; en particular, los bordes de
  estado no llegan al contraste AA de 3 : 1 (ver arriba).
- Ilustraciones en lugar de emoji para las 35 palabras de `pictures.ts` (y las de fase 2):
  sigue sin haber arte propio.
- Compañero (mascota): el spec lo prevé; no existe todavía ni como concepto visual.
