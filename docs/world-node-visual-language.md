# Silabín — lenguaje visual escalable de nodos

## Estado actual del currículo

El mapa ya no debe diseñarse pensando en 10 o 13 unidades. En el currículo actual hay 21 posiciones visibles:

- Fase 0: 4 unidades de conciencia fonológica.
- Fase 1: 5 vocales.
- Fase 2: 4 consonantes con sílabas iniciales.
- Fase 3: 8 unidades futuras actuales: t, n, d, r suave, f, ñ, c con a/o/u y b.

Y la aplicación seguirá creciendo.

Por eso queda descartado el enfoque de “un asset totalmente distinto por nivel”.

## Regla principal

El sistema visual se basa en:

```text
familia pedagógica
+ variante de contenido
+ estado del nivel
+ territorio/mundo
```

No en:

```text
unit-001.webp
unit-002.webp
unit-003.webp
...
```

## Familias visuales

### 1. Oído de explorador

Estas cuatro unidades sí merecen landmarks únicos porque enseñan habilidades diferentes.

| Unidad | Familia | Metáfora |
| --- | --- | --- |
| Palabras con palmas | `rhythm-stage` | escenario de ritmo / palmas |
| Rimas saltarinas | `rhyme-bounce` | pabellón elástico / rebote |
| Detectives de sonidos | `sound-detective` | puesto de detective / lupa |
| ¿Lo oyes? | `listening-station` | estación de escucha / ondas |

Assets base:

- `node-rhythm.webp`
- `node-rhyme.webp`
- `node-detective.webp`
- `node-listen.webp`

### 2. Vocales

Todas usan la familia `vowel-garden`.

Un solo landmark base:

- `node-vowel-base.webp`

La variante se construye con:

- A / E / O / I / U;
- accent color;
- una flor, bandera o emblema secundario;
- pequeños cambios decorativos.

No se generan cinco edificios independientes.

### 3. Consonantes y sílabas

Fases 2 y 3 usan la familia `syllable-workshop`.

Un solo landmark base:

- `node-syllable-base.webp`

La variante muestra la consonante:

- m, l, s, p;
- t, n, d, r, f, ñ, c, b;
- y cualquier consonante futura.

Cuando la unidad sea jugable, puede añadir fichas silábicas alrededor, por ejemplo:

```text
M
ma · me · mi · mo · mu
```

El mapa no necesita un asset nuevo cuando se añade una nueva consonante.

## Estados

Los estados se aplican sobre cualquier familia:

### Current

- amarillo Silabín;
- glow;
- 10–20 % más grande;
- mayor contraste;
- label visible.

### Completed

- color normal;
- estrellas;
- sin glow dominante.

### Locked

- saturación reducida;
- candado;
- label opcional según densidad del mapa.

## Escalabilidad del mapa

No mostrar todo el currículo en una sola pantalla.

Con 21 unidades actuales —y más en el futuro— un lienzo único terminaría pequeño y saturado.

La navegación recomendada es por territorios:

```text
Mundo 0 — Oído de explorador
4 niveles

Mundo 1 — Las vocales
5 niveles

Mundo 2 — Primeras sílabas
4 niveles

Mundo 3 — Más sonidos y letras
8 niveles

Mundos futuros
N niveles
```

Cada territorio puede ocupar una pantalla iPad landscape y el niño avanza al siguiente territorio mediante el camino.

Esto permite que el tamaño de los nodos permanezca grande y táctil aunque el currículo llegue a 40, 60 o más unidades.

## Regla de datos

La UI no debe mantener un objeto manual con todas las unidades.

El resolver visual debe reconocer patrones de ID:

- `phase0:*` → uno de cuatro landmarks especiales;
- `phase1:vowel-*` → `vowel-garden`;
- `phase2:*` → `syllable-workshop`;
- `phase3:*` → `syllable-workshop`;
- desconocido → landmark neutral temporal.

Más adelante, si aparecen familias pedagógicas realmente nuevas, añadimos una familia visual nueva; no un edificio por unidad.

## Pack HQ recomendado

Por ahora solo necesitamos producir bien:

1. `node-rhythm.webp`
2. `node-rhyme.webp`
3. `node-detective.webp`
4. `node-listen.webp`
5. `node-vowel-base.webp`
6. `node-syllable-base.webp`
7. `node-future-base.webp` como fallback neutral

Con siete assets base podemos representar las 21 unidades actuales y seguir creciendo.
