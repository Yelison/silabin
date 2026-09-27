# Prompts para generar las ilustraciones de Silabín

Documento para pedir a ChatGPT (generador de imágenes) las **65 ilustraciones de palabras** del
currículo v1, más los iconos de la interfaz. Hoy cada palabra se muestra con un emoji provisional
(`src/images/index.ts`); estas ilustraciones lo sustituirán.

## Cómo usarlo

1. Abre **un solo chat** para todo el lote, para que el estilo no cambie de una imagen a otra.
2. Pega primero el **bloque de estilo** (abajo) tal cual. Espera a que lo confirme.
3. Pide las imágenes **de una en una** con la línea de cada ficha:
   `Genera «<palabra>»: <descripción>`.
4. Si una sale con otro estilo, pídele: «Rehazla respetando el bloque de estilo del principio».
5. Guarda cada una como `img-<palabra>.png` (sin tildes ni ñ en el nombre: `img-raton.png`,
   `img-una.png`), en 1024 × 1024 y con fondo transparente.
6. Cuando tengas unas 5, compáralas juntas: misma luz, mismo acabado de juguete, misma paleta,
   mismo tamaño del objeto dentro del cuadro. Si alguna desentona, rehazla antes de seguir.
   Para palabras nuevas, adjunta al chat 2 o 3 imágenes de la colección como referencia de
   estilo.

> **Estilo de la colección (decidido el 2026-09-26):** 3D suave tipo juguete. El primer
> bloque de estilo pedía ilustración plana; las 65 salieron en 3D, coherentes entre sí y
> reconocibles a 160 px, y se decidió quedarse con el 3D. Los iconos de la interfaz, en
> cambio, van planos (ver su sección) para que no compitan con la ilustración.

---

## Bloque de estilo (pégalo primero)

```text
Vas a generar una serie de ilustraciones para una app que enseña a leer en español a niños de
3 a 6 años (República Dominicana y México). Todas deben parecer de la misma colección. Reglas
para TODAS las imágenes que te pida en este chat:

- Formato: cuadrado 1024x1024, fondo transparente (si no puedes, fondo liso crema #FFF8EC).
- Un solo objeto o personaje protagonista, centrado, que ocupe el 70-80 % del cuadro, con
  margen alrededor. Nada más en la escena salvo que yo lo pida.
- Estilo: 3D suave tipo juguete (como una figura de vinilo o de plastilina), formas
  redondeadas y simples, superficies lisas con brillo suave, luz cálida desde arriba a la
  izquierda y una sombra de contacto muy leve bajo el objeto. Personajes con ojos grandes y
  expresión amable. Nada de fotorrealismo, texturas complicadas ni detalles pequeños.
- Paleta cálida: cremas, ocres, azules suaves, amarillos cálidos, naranjas suaves. Colores
  limpios pero no neón.
- Reconocible de un vistazo por un niño de 3 años, también en pequeño (128 px).
- SIN TEXTO: ni letras, ni números escritos, ni palabras, ni firmas, ni marcas de agua.
- Nada que dé miedo, violento ni inapropiado para niños pequeños. Nada de alcohol ni armas.
- Personas: rasgos diversos y latinoamericanos, expresión amable, estilo igual al resto.
- No uses rojo ni verde intensos como color dominante (la app los evita porque suenan a
  «bien/mal»).

Confirma que lo has entendido y espera a que te pida la primera imagen.
```

---

## Fases 0 y 1: 35 palabras (`src/content/pictures.ts`)

Son objetos concretos que el niño nombra en voz alta (sílabas, rimas, sonido inicial). Lo que
importa es que **se reconozca la palabra exacta** y no un sinónimo.

| # | Palabra | Fichero | Descripción para el prompt |
|---|---|---|---|
| 1 | sol | `img-sol.png` | Un sol sonriente con rayos redondeados, amarillo cálido. |
| 2 | pan | `img-pan.png` | Una barra de pan o un pan redondo dorado, con corteza visible. |
| 3 | mesa | `img-mesa.png` | Una mesa de madera sencilla de cuatro patas, vista de frente y un poco desde arriba, vacía. |
| 4 | casa | `img-casa.png` | Una casita de una planta con tejado a dos aguas, puerta y dos ventanas, colores cálidos. |
| 5 | gato | `img-gato.png` | Un gato entero sentado, de frente, pelaje atigrado naranja suave, cara amable. |
| 6 | mano | `img-mano.png` | Una mano abierta mostrando la palma con los cinco dedos separados, tono de piel cálido. |
| 7 | pelota | `img-pelota.png` | Una pelota de juguete redonda con franjas de colores suaves (no balón de fútbol reglamentario). |
| 8 | banana | `img-banana.png` | Un plátano amarillo entero, ligeramente curvado. |
| 9 | tomate | `img-tomate.png` | Un tomate entero con su tallito verde apagado arriba; rojo suave, no intenso. |
| 10 | pato | `img-pato.png` | Un patito amarillo entero de perfil, pico naranja. |
| 11 | masa | `img-masa.png` | Una bola de masa de pan sobre una tabla de madera con un poco de harina alrededor. |
| 12 | luna | `img-luna.png` | Una luna creciente amable, amarilla pálida, con un par de estrellitas pequeñas. |
| 13 | cuna | `img-cuna.png` | Una cuna de bebé de madera con barrotes y una mantita, sin bebé dentro. |
| 14 | ratón | `img-raton.png` | Un ratoncito gris entero, orejas redondas grandes y cola larga (el animal, no el del ordenador). |
| 15 | limón | `img-limon.png` | Un limón amarillo entero con una hojita, más una rodaja al lado. |
| 16 | sopa | `img-sopa.png` | Un plato hondo de sopa humeante con una cuchara, visto un poco desde arriba. |
| 17 | copa | `img-copa.png` | Una copa de helado (copa de cristal con bolas de helado y una cereza). Nada de vino. |
| 18 | pelo | `img-pelo.png` | La cabeza de una niña vista de espaldas con una melena larga y ondulada que destaque. El pelo es el protagonista. |
| 19 | velo | `img-velo.png` | Un velo blanco de tul con una diadema de flores, suelto y extendido, sin persona. |
| 20 | avión | `img-avion.png` | Un avión de pasajeros de perfil, redondeado, azul y blanco, volando con una nubecita. |
| 21 | árbol | `img-arbol.png` | Un árbol frondoso con tronco marrón y copa redonda verde apagado. |
| 22 | ala | `img-ala.png` | Un ala de pájaro sola, extendida, con plumas bien marcadas. |
| 23 | elefante | `img-elefante.png` | Un elefante entero de perfil, gris azulado, trompa levantada, orejas grandes. |
| 24 | estrella | `img-estrella.png` | Una estrella de cinco puntas redondeadas, amarilla cálida. |
| 25 | escoba | `img-escoba.png` | Una escoba de palo largo con cerdas de paja, de pie. |
| 26 | isla | `img-isla.png` | Una isla pequeña de arena con una palmera, rodeada de un poco de mar azul. |
| 27 | iglú | `img-iglu.png` | Un iglú de bloques de hielo con su entrada en arco, sobre un poco de nieve. |
| 28 | imán | `img-iman.png` | Un imán en forma de herradura (U), con las puntas de otro color y unas líneas cortas de atracción. |
| 29 | oso | `img-oso.png` | Un oso pardo entero, sentado, amable, de frente. |
| 30 | ojo | `img-ojo.png` | Un ojo abierto, grande, con pestañas y pupila marrón, solo el ojo. |
| 31 | oreja | `img-oreja.png` | Una oreja humana sola, de perfil, tono de piel cálido. |
| 32 | uva | `img-uva.png` | Un racimo de uvas moradas con una hojita. |
| 33 | uno | `img-uno.png` | Una mano de niño mostrando un solo dedo índice levantado (el concepto «uno» sin escribir el número). |
| 34 | uña | `img-una.png` | Una mano con las uñas bien visibles y pintadas de un color suave; el primer plano en las uñas. |
| 35 | pipa | `img-pipa.png` | Un biberón de bebé (en República Dominicana «pipa»), con tetina y leche dentro. |

## Fase 2: 30 palabras de lectura (`read-word`)

El niño lee la palabra y **después** se revela la imagen como premio y comprobación. Varias son
abstractas; la descripción propone una escena que las represente. Aquí sí se permite una escena
pequeña (dos elementos) cuando hace falta para que se entienda.

| # | Palabra | Fichero | Descripción para el prompt |
|---|---|---|---|
| 36 | mamá (mama) | `img-mama.png` | Una madre sonriente abrazando a su hijo pequeño, plano medio. |
| 37 | mimo | `img-mimo.png` | Un adulto haciendo una caricia cariñosa en la mejilla a un niño (mimo = caricia, no el artista de circo). |
| 38 | mima | `img-mima.png` | Una niña que acuna y acaricia a su muñeca con cariño. |
| 39 | ama | `img-ama.png` | Una niña abrazando a su perro con un corazón pequeño encima. |
| 40 | amo | `img-amo.png` | Un niño con los brazos en forma de corazón sobre el pecho, sonriendo, con dos corazoncitos flotando. |
| 41 | lima | `img-lima.png` | Una lima (fruta verde) entera con una hojita y una rodaja al lado; distinta del limón amarillo. |
| 42 | loma | `img-loma.png` | Una colina suave de hierba con un caminito y un arbolito en la cima. |
| 43 | mula | `img-mula.png` | Una mula entera de perfil, orejas largas, color marrón. |
| 44 | mala | `img-mala.png` | Una manzana con un gusanito asomando y cara de «puaj» (una fruta «mala», sin nada que dé asco de verdad). |
| 45 | malo | `img-malo.png` | Un lobo de cuento con cara de travieso, cruzado de brazos; gracioso, nada aterrador. |
| 46 | lelo | `img-lelo.png` | Un niño con cara de despistado y estrellitas girando sobre la cabeza, tierno y gracioso, sin burla. |
| 47 | ola | `img-ola.png` | Una ola de mar grande y redondeada, azul, con espuma blanca. |
| 48 | misa | `img-misa.png` | Una iglesia pequeña con campanario y la puerta abierta, sin personas. |
| 49 | suma | `img-suma.png` | Dos manzanas más una manzana juntándose en un grupo de tres, con flechas curvas. Sin signos ni números escritos. |
| 50 | sumo | `img-sumo.png` | Un luchador de sumo simpático y redondeado, en postura de saludo, vestido con su mawashi. |
| 51 | sola | `img-sola.png` | Una niña sentada sola en un banco del parque, tranquila (no triste), con espacio vacío a su lado. |
| 52 | sala | `img-sala.png` | Una sala de estar sencilla: un sofá, una lámpara y una alfombra. |
| 53 | uso | `img-uso.png` | Una niña usando una cuchara para comer de un tazón (la acción de usar un objeto). |
| 54 | eso | `img-eso.png` | Un niño señalando con el dedo una pelota que está a su lado («¡eso!»). |
| 55 | asa | `img-asa.png` | Una taza vista de lado con el asa muy destacada (resaltada con un contorno más grueso). |
| 56 | papa | `img-papa.png` | Una papa (patata) entera, marrón, con un par de ojitos de la piel. |
| 57 | mapa | `img-mapa.png` | Un mapa del tesoro de papel desplegado con un camino punteado y una X. |
| 58 | sapo | `img-sapo.png` | Un sapo entero sentado, verde apagado con manchas marrones, cara amable. |
| 59 | pesa | `img-pesa.png` | Una mancuerna (pesa de gimnasio) de color, sola, en el suelo. |
| 60 | puma | `img-puma.png` | Un puma entero de perfil, color canela, expresión tranquila. |
| 61 | pala | `img-pala.png` | Una pala de jardín o de playa, de pie, con mango de madera. |
| 62 | polo | `img-polo.png` | Una camiseta tipo polo con cuello y botones, de un color suave. |
| 63 | lupa | `img-lupa.png` | Una lupa con mango de madera, con un reflejo en el cristal. |
| 64 | paso | `img-paso.png` | Un niño dando un paso grande, con huellas detrás. |
| 65 | piso | `img-piso.png` | Un suelo de baldosas visto en perspectiva con un juguete encima (piso = suelo en DO/MX), no un edificio. |

> **Revisa con el autor antes de generar:** `mala`, `malo`, `lelo` y `sola` tienen connotación
> negativa y la app evita los mensajes negativos (spec §2). Las escenas propuestas las suavizan,
> pero conviene decidir si esas palabras se quedan en el currículo.

---

## Iconos de la interfaz (opcional, mismo chat)

**Estilo plano, no 3D**: icono sencillo de formas redondeadas, contorno suave y oscuro
(#2B2A33) de grosor uniforme, relleno de color liso sin brillo, sin fondo y legible a 72 px.
Pídelos en un chat aparte, porque el bloque de estilo de arriba es para las ilustraciones 3D.

| Fichero | Descripción para el prompt |
|---|---|
| `ui-replay.png` | Un altavoz con ondas de sonido (botón «volver a oír»). |
| `ui-yes.png` | Una cara sonriente asintiendo, con un pulgar arriba suave. Sin verde. |
| `ui-no.png` | La misma carita redonda amarilla de `ui-yes`, tranquila, con la palma abierta y marcas de movimiento a ambos lados. Neutra y amable, nada de tristeza ni enfado. Sin rojo. (Si al probarlo con un niño se lee como «hola», quitar la mano.) |
| `ui-hand.png` | Una mano con el índice señalando hacia abajo (marca la opción que el niño debe tocar). |
| `ui-star.png` | Una estrella brillante de celebración con destellos. |
| `ui-next.png` | Una flecha gruesa y redondeada hacia la derecha. |
| `ui-drum.png` | Un tambor pequeño con dos baquetas (para contar sílabas dando golpes). |

El **compañero** (personaje que acompañará al niño) está pendiente de decidir (D8, identidad
visual). No lo generes todavía: cuando se decida, se añadirá aquí con su propia ficha.

---

## Después de generarlas

- Pásalas a WebP o PNG optimizado (menos de 60 KB cada una; a 384 px en WebP rondan los 30 KB)
  antes de meterlas en el proyecto. Los PNG originales de 1024 px no se versionan.
- El cambio en el código (que `src/images/` sirva el fichero en vez del emoji) es una tarea
  aparte. El test I1 de `src/images/index.test.ts` sigue garantizando que no falte ninguna.
