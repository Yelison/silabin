# Silabín — lenguaje visual de nodos

## Principio

Los niveles no deben ser trece edificios completamente independientes. La identidad visual se organiza en familias para que el niño reconozca el tipo de actividad antes de leer el nombre.

Prioridad:

1. reconocer la actividad;
2. mantener una familia visual coherente;
3. conservar los estados `current / completed / locked`;
4. evitar que el mapa se convierta en una colección caótica de ilustraciones.

## Familias

### Oído de explorador — cuatro landmarks únicos

| Unidad | Visual | Señal visual |
| --- | --- | --- |
| Palabras con palmas | `rhythm-stage` | pequeño escenario de ritmo, manos/palmas y detalles musicales |
| Rimas saltarinas | `rhyme-bounce` | pabellón juguetón con arcos/resortes y sensación de rebote |
| Detectives de sonidos | `sound-detective` | casita/puesto de exploración con lupa, huellas y pistas |
| ¿Lo oyes? | `listening-station` | estación de escucha con oreja/ondas suaves y pequeños altavoces |

Estos cuatro pueden tener siluetas diferentes porque son actividades conceptualmente distintas.

### Las vocales — una familia con cinco variantes

Familia: `vowel-garden`.

La estructura se mantiene igual para las cinco vocales. Cambia:

- letra protagonista;
- pequeño acento de color;
- flor/planta secundaria;
- detalle decorativo.

No crear cinco estilos arquitectónicos distintos.

| Unidad | Variante |
| --- | --- |
| La vocal a | `a` |
| La vocal e | `e` |
| La vocal o | `o` |
| La vocal i | `i` |
| La vocal u | `u` |

### Las sílabas — una familia con cuatro variantes

Familia: `syllable-workshop`.

La estructura visual debe sugerir construir palabras y combinar piezas: bloques, fichas, letras o un pequeño taller.

| Unidad | Variante |
| --- | --- |
| La m y sus sílabas | `m` |
| La l y sus sílabas | `l` |
| La s y sus sílabas | `s` |
| La p y sus sílabas | `p` |

La consonante puede aparecer como emblema grande y las sílabas como detalles secundarios.

## Estados

El tipo de landmark y el estado son dos dimensiones diferentes.

- `current`: amarillo Silabín + glow cálido + mayor escala.
- `completed`: color normal + estrellas.
- `locked`: versión desaturada/neutra + candado.

No generar una ilustración completamente diferente para cada estado si puede resolverse con una variante visual consistente.

## Assets recomendados

### Fase 0

- `node-rhythm.webp`
- `node-rhyme.webp`
- `node-detective.webp`
- `node-listen.webp`

### Fase 1

- `node-vowel-base.webp`
- badges/letras A, E, O, I, U como SVG o elementos de UI.

### Fase 2

- `node-syllable-base.webp`
- badges M, L, S, P y pequeñas fichas `ma/me/mi/mo/mu`, etc.

## Regla de producción

Primero generar seis assets base de alta calidad y comprobarlos juntos en `/dev/arte`:

1. rhythm
2. rhyme
3. detective
4. listen
5. vowel base
6. syllable base

Después crear las variantes pequeñas. No producir trece edificios únicos.
