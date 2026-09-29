# Prompts del arte del Plan 7 (D25)

Prompts para que el autor genere, mientras se ejecuta el Plan 6, el arte que hoy son marcadores
provisionales (S21). El Plan 7 los integra con `scripts/optimizar-ilustraciones.py` y cambia solo
`src/features/rewards/visuals.ts` y los assets; ninguna vista decide qué se pinta.

Sigue el método de [`docs/ilustraciones-prompts.md`](ilustraciones-prompts.md): **un chat para
las piezas 3D** (pega primero su «Bloque de estilo», tal cual, y confirma que lo entiende), **un
chat aparte para los iconos planos**. Genera de una en una; si una desentona, pide «Rehazla
respetando el bloque de estilo del principio». Guarda cada una con el fichero de la tabla
(sin tildes ni ñ). Los PNG originales no se versionan; se optimizan a WebP (menos de 60 KB).

> **Las dos reglas del bloque de estilo que más importan aquí:** sin texto, letras ni números
> en la imagen (las pegatinas de 10, 25, 50 y 100 estrellas **no llevan el número escrito**: el
> número lo pinta la interfaz), y sin rojo ni verde intensos como color dominante.

**Antes de generar, decide con el autor:** el compañero es un personaje nuevo (D8 lo dejó
abierto). Los marcadores actuales son un pollito (`companion:first`) y un zorro
(`companion:second`); son solo una sugerencia, no un requisito.

---

## Plantilla de cada ficha

Cada línea de la tabla se pide así, en el chat 3D ya configurado:

```text
Genera «<nombre>»: <descripción>. Formato <tamaño>, <fondo>. Sin texto ni números.
```

## Chat 3D: bloque de estilo

Pega el «Bloque de estilo» de `docs/ilustraciones-prompts.md` (sección «Bloque de estilo (pégalo
primero)»). No lo copies aquí: si cambia allí, debe cambiar para todo el lote.

---

## 1. Compañero y gorra

Personaje protagonista, ojos grandes, expresión amable, de cuerpo entero y de frente, cabe en
un cuadrado. Cada compañero se pide **dos veces**: sin gorra y con la gorra puesta, con el mismo
personaje, pose y colores (adjunta la primera como referencia al pedir la segunda). La gorra es
el logro `ten-sessions` («Gorra del compañero», 10 sesiones).

| Fichero | Tamaño | Sustituye a | Descripción para el prompt |
|---|---|---|---|
| `companion-1.png` | 1024 × 1024, transparente | `companion:first` (emoji 🐣) | Un personaje pequeño, redondeado y tierno (por ejemplo un pollito), de cuerpo entero, de frente, sonriendo, sin nada en la cabeza. Colores cálidos, amarillo y naranja suave. |
| `companion-1-gorra.png` | 1024 × 1024, transparente | `companion:first` + logro `ten-sessions` | El mismo personaje, idéntico, con una gorra de béisbol azul suave puesta, sin ningún texto ni logotipo en la gorra. |
| `companion-2.png` | 1024 × 1024, transparente | `companion:second` (emoji 🦊) | Un segundo personaje distinto del primero (por ejemplo un zorrito), redondeado y tierno, de cuerpo entero, de frente, sonriendo, sin nada en la cabeza. Naranja suave y crema, sin rojo intenso. |
| `companion-2-gorra.png` | 1024 × 1024, transparente | `companion:second` + logro `ten-sessions` | El mismo zorrito, idéntico, con una gorra de béisbol azul suave puesta, sin ningún texto ni logotipo. |

## 2. Fondos

Escena suave para detrás del mapa, la galería y el fin de sesión; **nunca** detrás de la
sesión (regla de `CosmeticBackground`). Sin personajes ni objetos protagonistas: mucho espacio
libre en el centro, para que los botones se lean. Sin texto.

| Fichero | Tamaño | Sustituye a | Descripción para el prompt |
|---|---|---|---|
| `bg-default.png` | 1536 × 2048, opaco | `bg:default` (`from-surface to-calm`) | Un fondo casi liso, crema cálido con un degradado muy suave a azul claro, sin detalles. Es el fondo neutro de partida. |
| `bg-pradera.png` | 1536 × 2048, opaco | `bg:pradera` (logro `first-session`) | Una pradera con colinas suaves y redondeadas, cielo azul claro con una nube pequeña; verdes apagados y ocres, sin verde intenso. Centro despejado. |
| `bg-espacio.png` | 1536 × 2048, opaco | `bg:espacio` (logro `steady-hand`) | Un cielo nocturno azul profundo suave (no negro) con estrellitas amarillas y un par de planetas pequeños y redondeados en las esquinas. Centro despejado. Nada de miedo. |
| `bg-bosque.png` | 1536 × 2048, opaco | `bg:bosque` (logro `phase2-done`) | Un bosque amable de troncos redondeados y copas suaves en tonos verdes apagados y ocres, con luz cálida entre los árboles. Centro despejado. |

## 3. Pegatinas y trofeo

Objeto único y centrado, con un borde blanco grueso de pegatina y una sombra leve. Sin texto ni
números.

| Fichero | Tamaño | Sustituye a | Descripción para el prompt |
|---|---|---|---|
| `sticker-avion.png` | 1024 × 1024, transparente | logro `vowel-a` («A de avión», emoji 🅰️) | Un avión de pasajeros de juguete, redondeado, azul y blanco, en forma de pegatina con borde blanco. Sin letra escrita. |
| `sticker-10.png` | 1024 × 1024, transparente | logro `stars:10` (emoji 🌟) | Una estrella dorada pequeña y redonda, con un destello, en forma de pegatina. Sin número escrito. |
| `sticker-25.png` | 1024 × 1024, transparente | logro `stars:25` | Una estrella dorada con dos destellos y una cinta corta debajo, en forma de pegatina. Sin número escrito. |
| `sticker-50.png` | 1024 × 1024, transparente | logro `stars:50` | Una estrella dorada grande dentro de un círculo azul suave con un pequeño lazo, en forma de pegatina. Sin número escrito. |
| `sticker-100.png` | 1024 × 1024, transparente | logro `stars:100` | Una estrella dorada muy brillante dentro de una medalla redonda con listón, la más vistosa de las cuatro, en forma de pegatina. Sin número escrito. |
| `trophy.png` | 1024 × 1024, transparente | logro `phase2-done` (emoji 🏆) | Un trofeo de copa dorado, redondeado, con dos asas y una estrella en el centro, sobre una peana sencilla. Sin texto grabado. |

Las cuatro estrellas deben leerse como una serie que crece de 10 a 100.

## 4. Partículas del rastro

Elemento pequeño que sigue al dedo. Debe leerse a 24-32 px. Un solo elemento por imagen.

| Fichero | Tamaño | Sustituye a | Descripción para el prompt |
|---|---|---|---|
| `particle-estrellita.png` | 256 × 256, transparente | `trail:estrellitas` (emoji ✨, forma `star`) | Una estrellita amarilla cálida de cinco puntas redondeadas, brillante, sin destellos alrededor. |
| `particle-burbuja.png` | 256 × 256, transparente | `trail:burbujas` (emoji 🫧, forma `circle`) | Una burbuja de jabón translúcida azul claro, con un brillo blanco pequeño arriba a la izquierda. |

`trail:none` no lleva arte: es «sin rastro».

## 5. La boca (D21)

Una imagen por **posición** de `MouthShape` en `src/content/mouths.ts`; cada una sirve a los
fonemas que se indican. Boca **de frente, sola** (sin cara), grande, con labios redondeados de
tono rosado cálido (no rojo intenso). Debe enseñar la forma del sonido, no una expresión: nada
de sonrisa ni de gesto. Sustituye a `src/components/Mouth.tsx` (SVG esquemático); el id es la
forma. Los seis tienen el mismo tamaño de labios y el mismo encuadre para que, al pasar de una a
otra, la boca «se mueva» y no «salte».

| Fichero | Tamaño | Sustituye a | Fonemas | Descripción para el prompt |
|---|---|---|---|---|
| `mouth-open.png` | 512 × 512, transparente | `MouthShape` `open` | a | Boca de frente muy abierta en vertical, óvalo alto; se ve la lengua baja y plana, sin dientes marcados. |
| `mouth-spread.png` | 512 × 512, transparente | `spread` | e, i | Boca de frente con las comisuras estiradas hacia los lados, abertura estrecha y ancha; se ven los dientes de arriba y de abajo casi juntos. No es una sonrisa: labios tensos, sin curva. |
| `mouth-round.png` | 512 × 512, transparente | `round` | o, u | Boca de frente con los labios recogidos en un círculo pequeño y hacia delante, como para silbar; se ve un hueco oscuro redondo. |
| `mouth-closed.png` | 512 × 512, transparente | `closed` | m, p | Boca de frente con los labios cerrados y apretados uno contra otro, en línea recta; sin dientes ni lengua. |
| `mouth-teeth.png` | 512 × 512, transparente | `teeth` | s | Boca de frente entreabierta con los dientes de arriba y de abajo juntos y visibles; la lengua no se ve. |
| `mouth-tongue.png` | 512 × 512, transparente | `tongue` | l | Boca de frente abierta con la punta de la lengua levantada tocando detrás de los dientes de arriba, bien visible. |

Comprueba con un niño o un adulto que cada boca se distingue de las demás a 128 px (es la deuda
1: la prueba con niños de la boca, D21).

## 6. Iconos de la interfaz y de la aplicación

**Chat aparte y estilo plano**, como en la sección «Iconos de la interfaz» de
`docs/ilustraciones-prompts.md`: formas redondeadas, contorno suave y oscuro (#2B2A33) de grosor
uniforme, relleno liso sin brillo, sin fondo, legible a 72 px. Sin rojo ni verde intensos.

| Fichero | Tamaño | Sustituye a | Descripción para el prompt |
|---|---|---|---|
| `ui-erase.png` | 512 × 512, transparente | botón «Borrar» de `trace` (emoji 🧽) | Una goma de borrar rosa suave, de perfil, con una pequeña estela de migas. |
| `ui-done.png` | 512 × 512, transparente | botón «Listo» de `trace` (emoji 👍) | Un pulgar hacia arriba amable, redondeado, de color piel cálido. Sin verde. |
| `ui-gallery.png` | 512 × 512, transparente | botón «Mis premios» del mapa (emoji 🎁) | Un regalo pequeño con lazo, en amarillo y azul suave. |
| `app-192.png` | 192 × 192, opaco | `public/icons/app-192.png` («S» provisional) | Icono de la app: el compañero 1 (cabeza y cara, sin gorra) centrado sobre un fondo liso crema cálido con esquinas cuadradas (el sistema las redondea). Sin texto. Estilo 3D del chat de ilustraciones, no plano. |
| `app-512.png` | 512 × 512, opaco | `public/icons/app-512.png` | El mismo icono, a 512 px, con el personaje ocupando el 70 % central (zona segura de icono enmascarable). |

`apple-touch-icon.png` (180 × 180) se deriva de `app-512.png`; el Plan 7 lo regenera con
`scripts/iconos-pwa.py`.

---

## Después de generarlas

- Guarda los originales fuera del repositorio y pásalos por `scripts/optimizar-ilustraciones.py`.
- Que `visuals.ts` sirva estos ficheros en vez de los emoji es una tarea del Plan 7.
- Instala entonces `frontend-design@claude-plugins-official` (no antes).
