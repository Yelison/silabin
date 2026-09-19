# Silabín — Plan 1: núcleo de contenido, motor y persistencia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el núcleo tesable de Silabín: el currículo de las fases 0 a 2 como datos validados, el motor de sesión completo (planificador, Leitner, dominio, pistas, estrellas, logros) y la persistencia local, todo con TDD y sin una sola línea de interfaz.

**Architecture:** Tres capas de TypeScript puro sin React ni DOM. `content/` contiene el currículo como datos validados con Zod al importar. `engine/` son funciones puras que reciben currículo más estado y devuelven decisiones (qué ejercicio toca, qué pista mostrar, cuántas estrellas, qué logro se desbloqueó); no conoce la interfaz. `store/` valida, migra y persiste el estado en un adaptador de almacenamiento inyectable, lo que permite testear sin IndexedDB. La interfaz de usuario llega en el Plan 2 y solo consume estas tres capas.

**Tech Stack:** Next.js (App Router), TypeScript estricto, Zod, Vitest, Biome, pnpm, idb-keyval. Sin dependencias de UI en este plan.

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md`

## Global Constraints

Valores copiados literalmente del spec. Aplican a todas las tareas.

- **Sonido, no nombre.** La letra `m` se representa como el sonido "mmm", nunca "eme". Los `audioKey` de letras apuntan al sonido.
- **Orden de vocales:** a, e, o, i, u. **Orden de consonantes en v1:** m, l, s, p.
- **Nunca b/d/p/q juntos** como opciones de un mismo ejercicio (invariancia en espejo, normal hasta los 7 años).
- **Par mayúscula/minúscula:** todo ítem `letter` define `display: { upper, lower }`.
- **Dominio de ítem:** `firstTryCorrect >= 3` en **sesiones distintas**.
- **Unidad completada:** `>= 80 %` de los ítems que introduce, dominados. Constante `UNIT_COMPLETION_THRESHOLD = 0.8`.
- **Cajas Leitner:** 1, 2, 3 con intervalos de **1, 3 y 7 sesiones**. Acierto sin ayuda sube una caja (máx. 3); cualquier otro resultado baja a caja 1.
- **Mezcla de sesión:** ~70 % unidad activa, ~30 % repaso. Máximo **2 presentaciones** por sesión.
- **Longitud de sesión:** 5 o 6 ejercicios, presentaciones incluidas.
- **Tres rungs de pista** por plantilla, en este orden: `reduce`, `sound`, `model`. El rung 3 garantiza el acierto y cuenta como `assisted`.
- **Estrellas:** 3 si todas las evaluaciones fueron correctas al primer intento; 2 si `>= 80 %`; 1 por completar. Se guarda la **mejor** marca por unidad.
- **Sin castigos:** nada resta estrellas, dominio ni progreso. El progreso nunca retrocede de `done`.
- **Palabras de Fase 2, cuatro invariantes:** letras ya introducidas; sílabas solo CV o V; sin dos letras vocales adyacentes; tilde solo en la vocal de la última sílaba y solo con `accented: true`.
- **Determinismo:** el planificador y la elección de distractores son deterministas dada una semilla.
- **Audio:** tres acentos, `do` (dominicano), `mx` (mexicano) y `neutro`. El test de existencia de ficheros en disco solo corre con `SILABIN_CHECK_AUDIO_FILES=1`.
- **TypeScript estricto.** Prohibido `any` salvo en los límites de `JSON.parse`, y allí se valida con Zod de inmediato.

## Refinamientos del spec introducidos por este plan

El spec describe el diseño; al planificar aparecieron cuatro detalles que necesita el motor y que el spec no fijaba. Se documentan aquí y no requieren cambiar el spec:

1. `ItemProgress.presented: boolean`. El planificador necesita distinguir "no visto" de "presentado pero aún sin acierto"; `box: 0` no basta para las dos cosas.
2. `ItemProgress.lastCreditSession?: number`. Necesario para exigir que los 3 aciertos de dominio ocurran en sesiones distintas.
3. `ProgressState.counters`. Los logros cuentan trazos, sesiones, aciertos de voz y palabras leídas; sin contadores habría que recorrer todo el historial.
4. Se añade el `ItemKind` **`picture`**: imagen más palabra hablada, que el niño nunca lee. Separarlo de `word` evita que los invariantes de estructura silábica de Fase 2 se apliquen a palabras que solo son dibujos (gato, elefante).

## Estructura de archivos

Cada archivo tiene una responsabilidad. Los de `content/` son datos y esquema; los de `engine/` son funciones puras, un archivo por regla; `store/` aísla la persistencia.

| Archivo | Responsabilidad |
|---|---|
| `src/content/types.ts` | Esquemas Zod y tipos de `Item`, `Unit`, `Curriculum`. Única fuente de verdad de la forma de los datos. |
| `src/content/templates.ts` | Las 8 plantillas de ejercicio con sus 3 rungs de pista y su dificultad. |
| `src/content/pictures.ts` | Las 35 imágenes con su palabra hablada, compartidas por las fases 0 y 1. El niño nunca las lee. |
| `src/content/phase0.ts` | Datos de la Fase 0: las 4 unidades orales. |
| `src/content/phase1.ts` | Datos de la Fase 1: 5 vocales con fonema, letra y pictures. |
| `src/content/phase2.ts` | Datos de la Fase 2: m, l, s, p con fonema, letra, 5 sílabas y palabras. |
| `src/content/phases-future.ts` | Unidades vacías de Fase 3 para que el mapa muestre el camino bloqueado. |
| `src/content/audio-manifest.ts` | Lista de todos los `audioKey` y su texto de origen. |
| `src/content/index.ts` | Ensambla, valida con Zod al importar y expone `curriculum` indexado. |
| `src/content/invariants.ts` | Funciones de comprobación reutilizables: silabificación CV/V, vocales adyacentes, tildes, espejo. |
| `src/engine/types.ts` | `ProgressState`, `ItemProgress`, `ExerciseResolution`, `PlannedExercise`. |
| `src/engine/random.ts` | Generador pseudoaleatorio con semilla. |
| `src/engine/leitner.ts` | Cajas, intervalos, `promote`, `demote`, `isDue`. |
| `src/engine/mastery.ts` | Dominio de ítem y de unidad. |
| `src/engine/unlock.ts` | Estados de unidad y cuál es la unidad activa. |
| `src/engine/attempts.ts` | Máquina de estados de intentos y pistas. |
| `src/engine/apply.ts` | Aplicar el resultado de un ejercicio al estado. |
| `src/engine/distractors.ts` | Elección de opciones incorrectas con las reglas de confusión. |
| `src/engine/planner.ts` | Armar la sesión. |
| `src/engine/stars.ts` | Estrellas de la sesión. |
| `src/engine/rewards.ts` | Catálogo de logros y su evaluación. |
| `src/engine/index.ts` | Reexporta la API pública del motor. |
| `src/store/schema.ts` | `PersistedState`, esquema Zod, estado vacío y migraciones. |
| `src/store/persist.ts` | `StorageAdapter`, carga con recuperación y guardado. |

---

## Task 1: Andamiaje del proyecto y primer test verde

Deja el repo con Next.js, TypeScript estricto, Vitest y Biome funcionando. Sin esta tarea ninguna otra puede correr un test.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `biome.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/smoke.ts`
- Test: `src/lib/smoke.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: scripts `pnpm test`, `pnpm test:watch`, `pnpm lint`, `pnpm typecheck`, `pnpm dev`. Alias de importación `@/*` → `src/*`.

- [ ] **Step 1: Generar el proyecto Next.js sobre el repo existente**

`create-next-app` respeta `.git`, `README.md` y `docs/`, así que no borra nada de lo que ya hay.

```bash
cd /home/yelisson/silabin
pnpm dlx create-next-app@latest . --ts --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-pnpm --yes
```

Si pregunta algo (por ejemplo por Turbopack), acepta los valores por omisión.

- [ ] **Step 2: Añadir dependencias del núcleo y de pruebas**

```bash
pnpm add zod idb-keyval
pnpm add -D vitest @vitest/coverage-v8 @biomejs/biome
```

- [ ] **Step 3: Configurar Vitest**

Crea `vitest.config.ts`. El entorno por omisión es `node` porque todo este plan es TypeScript puro; los componentes del Plan 2 declararán `jsdom` por archivo con un comentario `@vitest-environment`.

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: { provider: 'v8', include: ['src/content/**', 'src/engine/**', 'src/store/**'] },
  },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
});
```

- [ ] **Step 4: Endurecer TypeScript y declarar los scripts**

En `tsconfig.json`, dentro de `compilerOptions`, añade estas cuatro opciones a las que ya puso Next.js:

```json
{
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true
}
```

En `package.json`, deja el bloque `scripts` así:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit",
  "lint": "biome check src"
}
```

- [ ] **Step 5: Inicializar Biome**

```bash
pnpm biome init
```

- [ ] **Step 6: Escribir el test de humo (debe fallar)**

Crea `src/lib/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { projectName } from '@/lib/smoke';

describe('andamiaje', () => {
  it('resuelve el alias @ y ejecuta TypeScript', () => {
    expect(projectName()).toBe('Silabín');
  });
});
```

- [ ] **Step 7: Correr el test y verificar que falla**

Run: `pnpm test`
Expected: FAIL, no se puede resolver `@/lib/smoke`.

- [ ] **Step 8: Implementación mínima**

Crea `src/lib/smoke.ts`:

```ts
export function projectName(): string {
  return 'Silabín';
}
```

- [ ] **Step 9: Verificar que pasa todo**

```bash
pnpm test && pnpm typecheck && pnpm lint
```
Expected: test PASS, `tsc` sin errores, Biome sin errores. Si Biome se queja del formato de los archivos generados por Next.js, corre `pnpm biome check --write src` y vuelve a comprobar.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: andamiaje Next.js con TypeScript estricto, Vitest y Biome

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Esquema y tipos del contenido

Define la forma de todo el currículo y las reglas que un ítem debe cumplir según su clase. Todo lo demás en `content/` depende de esta tarea.

**Files:**
- Create: `src/content/types.ts`
- Test: `src/content/types.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type ItemKind = 'phoneme' | 'letter' | 'syllable' | 'word' | 'picture' | 'oral-skill'`
  - `type Item = { id: string; kind: ItemKind; text: string; phonemes: string[]; audioKey: string; display?: { upper: string; lower: string }; imageKey?: string; syllables?: string[]; accented?: boolean; task?: ItemTask }`
  - `type ItemTask = { answer: string; optionIds?: string[] }`
  - `type Unit = { id: string; phase: 0 | 1 | 2 | 3; title: string; audioKey: string; requires: string[]; introduces: string[]; exercises: UnitExercise[] }`
  - `type UnitExercise = { templateId: TemplateId; weight: number }`
  - `type Curriculum = { items: Item[]; units: Unit[] }`
  - `itemSchema`, `unitSchema`, `curriculumSchema`

- [ ] **Step 1: Escribir los tests del esquema**

Crea `src/content/types.test.ts`. Cada caso codifica una regla del spec.

```ts
import { describe, expect, it } from 'vitest';
import { itemSchema, unitSchema } from '@/content/types';

const letra = {
  id: 'letter:a', kind: 'letter', text: 'a', phonemes: ['a'],
  audioKey: 'letter:a', display: { upper: 'A', lower: 'a' },
};

describe('itemSchema', () => {
  it('acepta una letra con su par mayúscula y minúscula', () => {
    expect(itemSchema.parse(letra).id).toBe('letter:a');
  });

  it('rechaza una letra sin display', () => {
    const { display, ...sinDisplay } = letra;
    expect(itemSchema.safeParse(sinDisplay).success).toBe(false);
  });

  it('rechaza una palabra sin sílabas', () => {
    const palabra = { id: 'word:mapa', kind: 'word', text: 'mapa', phonemes: ['m','a','p','a'], audioKey: 'word:mapa' };
    expect(itemSchema.safeParse(palabra).success).toBe(false);
  });

  it('acepta una palabra con sílabas', () => {
    const palabra = { id: 'word:mapa', kind: 'word', text: 'mapa', phonemes: ['m','a','p','a'], audioKey: 'word:mapa', syllables: ['ma','pa'] };
    expect(itemSchema.parse(palabra).syllables).toEqual(['ma','pa']);
  });

  it('exige phonemes salvo en oral-skill', () => {
    const silaba = { id: 'syllable:ma', kind: 'syllable', text: 'ma', phonemes: [], audioKey: 'syllable:ma' };
    expect(itemSchema.safeParse(silaba).success).toBe(false);
  });

  it('acepta una habilidad oral sin phonemes pero con task', () => {
    const oral = { id: 'oral:clap:mesa', kind: 'oral-skill', text: 'mesa', phonemes: [], audioKey: 'word:mesa', task: { answer: '2' } };
    expect(itemSchema.parse(oral).task?.answer).toBe('2');
  });

  it('rechaza una habilidad oral sin task', () => {
    const oral = { id: 'oral:clap:mesa', kind: 'oral-skill', text: 'mesa', phonemes: [], audioKey: 'word:mesa' };
    expect(itemSchema.safeParse(oral).success).toBe(false);
  });
});

describe('unitSchema', () => {
  it('acepta una unidad con prerrequisitos y ejercicios', () => {
    const unidad = {
      id: 'phase1:vowel-a', phase: 1, title: 'La vocal a', audioKey: 'unit:phase1:vowel-a',
      requires: ['phase0:hear-it'], introduces: ['phoneme:a', 'letter:a'],
      exercises: [{ templateId: 'listen-tap', weight: 2 }],
    };
    expect(unitSchema.parse(unidad).introduces).toHaveLength(2);
  });

  it('rechaza una unidad sin ítems que introducir cuando es de fase 0 a 2', () => {
    const unidad = {
      id: 'phase1:vacia', phase: 1, title: 'Vacía', audioKey: 'unit:x',
      requires: [], introduces: [], exercises: [{ templateId: 'listen-tap', weight: 1 }],
    };
    expect(unitSchema.safeParse(unidad).success).toBe(false);
  });

  it('acepta una unidad de fase 3 vacía, que solo marca el camino futuro', () => {
    const unidad = { id: 'phase3:t', phase: 3, title: 'La t', audioKey: 'unit:phase3:t', requires: [], introduces: [], exercises: [] };
    expect(unitSchema.parse(unidad).phase).toBe(3);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/types.test.ts`
Expected: FAIL, no se puede resolver `@/content/types`.

- [ ] **Step 3: Implementar el esquema**

Crea `src/content/types.ts`:

```ts
import { z } from 'zod';
import { templateIdSchema, type TemplateId } from '@/content/templates';

export const itemKindSchema = z.enum(['phoneme', 'letter', 'syllable', 'word', 'picture', 'oral-skill']);
export type ItemKind = z.infer<typeof itemKindSchema>;

export const itemTaskSchema = z.object({
  answer: z.string().min(1),
  optionIds: z.array(z.string().min(1)).optional(),
});
export type ItemTask = z.infer<typeof itemTaskSchema>;

const itemBase = z.object({
  id: z.string().min(1),
  kind: itemKindSchema,
  text: z.string().min(1),
  phonemes: z.array(z.string().min(1)),
  audioKey: z.string().min(1),
  display: z.object({ upper: z.string().min(1), lower: z.string().min(1) }).optional(),
  imageKey: z.string().min(1).optional(),
  syllables: z.array(z.string().min(1)).optional(),
  accented: z.boolean().optional(),
  task: itemTaskSchema.optional(),
});

export const itemSchema = itemBase
  .refine((i) => i.kind === 'oral-skill' || i.phonemes.length > 0, {
    message: 'phonemes es obligatorio salvo en oral-skill',
    path: ['phonemes'],
  })
  .refine((i) => i.kind !== 'letter' || i.display !== undefined, {
    message: 'una letra necesita display con su par mayúscula y minúscula',
    path: ['display'],
  })
  .refine((i) => i.kind !== 'word' || (i.syllables?.length ?? 0) > 0, {
    message: 'una palabra necesita sus sílabas',
    path: ['syllables'],
  })
  .refine((i) => i.kind !== 'oral-skill' || i.task !== undefined, {
    message: 'una habilidad oral necesita task con la respuesta esperada',
    path: ['task'],
  });
export type Item = z.infer<typeof itemBase>;

export const unitExerciseSchema = z.object({
  templateId: templateIdSchema,
  weight: z.number().int().min(1).max(5),
});
export type UnitExercise = { templateId: TemplateId; weight: number };

export const unitSchema = z
  .object({
    id: z.string().min(1),
    phase: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    title: z.string().min(1),
    audioKey: z.string().min(1),
    requires: z.array(z.string().min(1)),
    introduces: z.array(z.string().min(1)),
    exercises: z.array(unitExerciseSchema),
  })
  .refine((u) => u.phase === 3 || u.introduces.length > 0, {
    message: 'una unidad jugable debe introducir al menos un ítem',
    path: ['introduces'],
  })
  .refine((u) => u.phase === 3 || u.exercises.length > 0, {
    message: 'una unidad jugable debe declarar al menos una plantilla',
    path: ['exercises'],
  });
export type Unit = z.infer<typeof unitSchema>;

export const curriculumSchema = z.object({
  items: z.array(itemSchema),
  units: z.array(unitSchema),
});
export type Curriculum = { items: Item[]; units: Unit[] };
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/content/types.test.ts`
Expected: los 10 tests PASS. Fallará la importación de `@/content/templates`, que se crea en la Task 3; si el orden de ejecución lo impide, crea primero un `src/content/templates.ts` con solo `export const templateIdSchema = z.enum(['listen-tap']);` y complétalo en la Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/content/types.ts src/content/types.test.ts
git commit -m "feat(content): esquema Zod de ítems y unidades del currículo

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Las 8 plantillas de ejercicio con sus pistas

Codifica la tabla de pistas del spec §5. Es la tarea que desbloquea el motor de pistas y evita que la interfaz invente ayudas.

**Files:**
- Create: `src/content/templates.ts`
- Test: `src/content/templates.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type TemplateId = 'listen-tap' | 'count-syllables' | 'rhyme' | 'initial-sound' | 'trace' | 'say-it' | 'build' | 'read-word'`
  - `type HintRung = 'reduce' | 'sound' | 'model'`
  - `type HintStep = { rung: HintRung; action: string; note: string }`
  - `type ExerciseTemplate = { id: TemplateId; itemKinds: ItemKind[]; evaluation: 'tap' | 'taps' | 'trace' | 'voice' | 'drag'; options?: { min: number; max: number }; difficulty: number; hints: [HintStep, HintStep, HintStep] }`
  - `templates: Record<TemplateId, ExerciseTemplate>`, `templateIds`, `templateIdSchema`

- [ ] **Step 1: Escribir los tests**

Crea `src/content/templates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { templateIds, templates } from '@/content/templates';

describe('plantillas de ejercicio', () => {
  it('define las 8 plantillas de la v1', () => {
    expect(templateIds).toHaveLength(8);
  });

  it('cada plantilla tiene exactamente 3 rungs en el orden reduce, sound, model', () => {
    for (const id of templateIds) {
      expect(templates[id].hints.map((h) => h.rung)).toEqual(['reduce', 'sound', 'model']);
    }
  });

  it('ningún rung queda sin acción ni nota', () => {
    for (const id of templateIds) {
      for (const hint of templates[id].hints) {
        expect(hint.action.length).toBeGreaterThan(0);
        expect(hint.note.length).toBeGreaterThan(0);
      }
    }
  });

  it('las plantillas de opciones declaran cuántas opciones admiten', () => {
    for (const id of ['listen-tap', 'rhyme', 'initial-sound'] as const) {
      expect(templates[id].options).toBeDefined();
      expect(templates[id].options!.min).toBeGreaterThanOrEqual(2);
    }
  });

  it('say-it y read-word se evalúan por voz', () => {
    expect(templates['say-it'].evaluation).toBe('voice');
    expect(templates['read-word'].evaluation).toBe('voice');
  });

  it('listen-tap es la plantilla más fácil y read-word la más difícil', () => {
    const ordenadas = [...templateIds].sort((a, b) => templates[a].difficulty - templates[b].difficulty);
    expect(ordenadas[0]).toBe('listen-tap');
    expect(ordenadas.at(-1)).toBe('read-word');
  });

  it('cada id de plantilla coincide con su clave en el registro', () => {
    for (const id of templateIds) expect(templates[id].id).toBe(id);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/templates.test.ts`
Expected: FAIL, no se puede resolver `@/content/templates`.

- [ ] **Step 3: Implementar las plantillas**

Crea `src/content/templates.ts`. Los textos de `action` son las claves que interpretará la interfaz en el Plan 2; los de `note` son para quien lea el código, nunca se muestran al niño.

```ts
import { z } from 'zod';
import type { ItemKind } from '@/content/types';

export const templateIds = [
  'listen-tap', 'count-syllables', 'rhyme', 'initial-sound',
  'build', 'trace', 'say-it', 'read-word',
] as const;
export type TemplateId = (typeof templateIds)[number];
export const templateIdSchema = z.enum(templateIds);

export type HintRung = 'reduce' | 'sound' | 'model';
export type HintStep = { rung: HintRung; action: string; note: string };

export type ExerciseTemplate = {
  id: TemplateId;
  itemKinds: ItemKind[];
  evaluation: 'tap' | 'taps' | 'trace' | 'voice' | 'drag';
  options?: { min: number; max: number };
  difficulty: number;
  hints: [HintStep, HintStep, HintStep];
};

export const templates: Record<TemplateId, ExerciseTemplate> = {
  'listen-tap': {
    id: 'listen-tap',
    itemKinds: ['letter', 'syllable', 'word'],
    evaluation: 'tap',
    options: { min: 2, max: 3 },
    difficulty: 1,
    hints: [
      { rung: 'reduce', action: 'dim-one-distractor+replay', note: 'Se atenúa un distractor, quedan 2, y se repite el audio.' },
      { rung: 'sound', action: 'pulse-correct+lengthen-first-phoneme', note: 'La opción correcta pulsa y se alarga su primer sonido.' },
      { rung: 'model', action: 'mark-correct+await-tap', note: 'Se marca la correcta; el niño la toca para continuar.' },
    ],
  },
  'count-syllables': {
    id: 'count-syllables',
    itemKinds: ['oral-skill'],
    evaluation: 'taps',
    difficulty: 2,
    hints: [
      { rung: 'reduce', action: 'replay-by-syllable+light-per-syllable', note: 'Se repite la palabra sílaba a sílaba con una luz por sílaba.' },
      { rung: 'sound', action: 'replay-with-audible-beats', note: 'Se oye la palabra con un golpe audible por sílaba.' },
      { rung: 'model', action: 'prefill-circles+await-taps', note: 'Aparecen los círculos ya contados; el niño los toca.' },
    ],
  },
  rhyme: {
    id: 'rhyme',
    itemKinds: ['oral-skill'],
    evaluation: 'tap',
    options: { min: 2, max: 2 },
    difficulty: 3,
    hints: [
      { rung: 'reduce', action: 'replay-target-ending', note: 'Se repite el final de la palabra objetivo, por ejemplo "-ato".' },
      { rung: 'sound', action: 'replay-each-option-ending', note: 'Se oye el final de cada opción, una tras otra.' },
      { rung: 'model', action: 'mark-correct+await-tap', note: 'Se marca la que rima; el niño la toca.' },
    ],
  },
  'initial-sound': {
    id: 'initial-sound',
    itemKinds: ['phoneme'],
    evaluation: 'tap',
    options: { min: 2, max: 3 },
    difficulty: 3,
    hints: [
      { rung: 'reduce', action: 'dim-one-distractor+replay-phoneme', note: 'Se atenúa un distractor y se repite el fonema aislado.' },
      { rung: 'sound', action: 'replay-each-option-onset', note: 'Se oye el inicio de cada imagen, por ejemplo "a… vión".' },
      { rung: 'model', action: 'mark-correct+await-tap', note: 'Se marca la correcta; el niño la toca.' },
    ],
  },
  build: {
    id: 'build',
    itemKinds: ['syllable'],
    evaluation: 'drag',
    difficulty: 4,
    hints: [
      { rung: 'reduce', action: 'dim-nonmatching-pieces', note: 'Se atenúan las piezas que no entran; quedan la consonante y las 5 vocales.' },
      { rung: 'sound', action: 'pulse-vowel-piece+play-vowel', note: 'La pieza de la vocal pulsa y se oye su sonido.' },
      { rung: 'model', action: 'highlight-both-pieces-in-order', note: 'Las dos piezas correctas quedan resaltadas en orden; el niño las arrastra.' },
    ],
  },
  trace: {
    id: 'trace',
    itemKinds: ['letter'],
    evaluation: 'trace',
    difficulty: 5,
    hints: [
      { rung: 'reduce', action: 'restore-previous-guide-level', note: 'Reaparece la guía completa del nivel anterior, desvanecimiento inverso.' },
      { rung: 'sound', action: 'animate-dot-along-stroke+play-phoneme', note: 'Un punto recorre el trazo mientras se oye el sonido de la letra.' },
      { rung: 'model', action: 'animate-full-stroke+await-retrace', note: 'El trazo se anima entero; el niño lo repite encima con la guía visible.' },
    ],
  },
  'say-it': {
    id: 'say-it',
    itemKinds: ['letter', 'syllable'],
    evaluation: 'voice',
    difficulty: 6,
    hints: [
      { rung: 'reduce', action: 'show-mouth+replay-instruction', note: 'Se muestra la boca articulando y se repite la instrucción, sin dar el sonido.' },
      { rung: 'sound', action: 'lengthen-first-phoneme', note: 'Se oye el primer sonido alargado, "mmm…", y el niño completa.' },
      { rung: 'model', action: 'play-full+accept-any-speech', note: 'Se oye la sílaba entera; el niño la repite y basta que hable.' },
    ],
  },
  'read-word': {
    id: 'read-word',
    itemKinds: ['word'],
    evaluation: 'voice',
    difficulty: 7,
    hints: [
      { rung: 'reduce', action: 'split-syllables+replay-instruction', note: 'Se separan visualmente las sílabas, ma·pa, y se repite la instrucción.' },
      { rung: 'sound', action: 'play-first-syllable', note: 'Se oye la primera sílaba; el niño completa.' },
      { rung: 'model', action: 'play-full+accept-any-speech', note: 'Se oye la palabra entera; el niño la repite y basta que hable.' },
    ],
  },
};
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/content/templates.test.ts`
Expected: los 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/templates.ts src/content/templates.test.ts
git commit -m "feat(content): 8 plantillas de ejercicio con sus 3 rungs de pista

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Invariantes de estructura de palabras

Las cuatro reglas que debe cumplir toda palabra de Fase 2. Se implementan antes de los datos para que los datos se escriban ya validados.

**Files:**
- Create: `src/content/invariants.ts`
- Test: `src/content/invariants.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `VOWELS`, `MIRROR_GROUPS`
  - `stripDiacritics(text: string): string`
  - `syllabify(word: string): string[]` — solo para palabras CV/V; devuelve `[]` si no lo es
  - `hasOnlyOpenSyllables(word: string): boolean`
  - `hasAdjacentVowels(word: string): boolean`
  - `accentIsFinalOnly(word: string): boolean`
  - `areMirrorConfusable(a: string, b: string): boolean`

- [ ] **Step 1: Escribir los tests**

Crea `src/content/invariants.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  accentIsFinalOnly, areMirrorConfusable, hasAdjacentVowels,
  hasOnlyOpenSyllables, stripDiacritics, syllabify,
} from '@/content/invariants';

describe('stripDiacritics', () => {
  it('quita la tilde sin tocar la ñ', () => {
    expect(stripDiacritics('mamá')).toBe('mama');
    expect(stripDiacritics('uña')).toBe('uña');
  });
});

describe('syllabify', () => {
  it('parte palabras CV-CV', () => {
    expect(syllabify('mapa')).toEqual(['ma', 'pa']);
    expect(syllabify('mamá')).toEqual(['ma', 'má']);
  });

  it('reconoce una vocal suelta como sílaba', () => {
    expect(syllabify('ala')).toEqual(['a', 'la']);
    expect(syllabify('oso')).toEqual(['o', 'so']);
  });

  it('devuelve vacío si la palabra no es solo CV o V', () => {
    expect(syllabify('pan')).toEqual([]);
    expect(syllabify('plato')).toEqual([]);
  });
});

describe('hasOnlyOpenSyllables', () => {
  it('acepta CV y V, rechaza CVC y CCV', () => {
    expect(hasOnlyOpenSyllables('mapa')).toBe(true);
    expect(hasOnlyOpenSyllables('ala')).toBe(true);
    expect(hasOnlyOpenSyllables('pan')).toBe(false);
    expect(hasOnlyOpenSyllables('plato')).toBe(false);
  });
});

describe('hasAdjacentVowels', () => {
  it('detecta hiatos y diptongos', () => {
    expect(hasAdjacentVowels('mío')).toBe(true);
    expect(hasAdjacentVowels('tiene')).toBe(true);
    expect(hasAdjacentVowels('mapa')).toBe(false);
  });
});

describe('accentIsFinalOnly', () => {
  it('acepta la tilde en la última sílaba', () => {
    expect(accentIsFinalOnly('mamá')).toBe(true);
    expect(accentIsFinalOnly('papá')).toBe(true);
  });

  it('rechaza la tilde en cualquier otra posición', () => {
    expect(accentIsFinalOnly('árbol')).toBe(false);
    expect(accentIsFinalOnly('página')).toBe(false);
  });

  it('acepta una palabra sin tilde', () => {
    expect(accentIsFinalOnly('mapa')).toBe(true);
  });
});

describe('areMirrorConfusable', () => {
  it('agrupa b, d, p y q', () => {
    expect(areMirrorConfusable('b', 'd')).toBe(true);
    expect(areMirrorConfusable('p', 'q')).toBe(true);
    expect(areMirrorConfusable('b', 'q')).toBe(true);
  });

  it('no agrupa letras de formas distintas', () => {
    expect(areMirrorConfusable('m', 'a')).toBe(false);
    expect(areMirrorConfusable('b', 'b')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/invariants.test.ts`
Expected: FAIL, no se puede resolver `@/content/invariants`.

- [ ] **Step 3: Implementar los invariantes**

Crea `src/content/invariants.ts`:

```ts
export const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
export const MIRROR_GROUPS: readonly (readonly string[])[] = [['b', 'd', 'p', 'q']];

const ACCENTED: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };

export function stripDiacritics(text: string): string {
  return [...text].map((c) => ACCENTED[c] ?? c).join('');
}

function isVowelLetter(c: string): boolean {
  return VOWELS.has(stripDiacritics(c));
}

/** Parte una palabra en sílabas suponiendo que solo tiene CV y V. Devuelve [] si no lo es. */
export function syllabify(word: string): string[] {
  const letters = [...word];
  const out: string[] = [];
  let i = 0;
  while (i < letters.length) {
    const current = letters[i];
    if (current === undefined) break;
    if (isVowelLetter(current)) {
      out.push(current);
      i += 1;
      continue;
    }
    const next = letters[i + 1];
    if (next === undefined || !isVowelLetter(next)) return [];
    out.push(current + next);
    i += 2;
  }
  return out;
}

export function hasOnlyOpenSyllables(word: string): boolean {
  const syllables = syllabify(word);
  if (syllables.length === 0) return false;
  return syllables.join('') === word;
}

export function hasAdjacentVowels(word: string): boolean {
  const letters = [...word];
  return letters.some((c, index) => {
    const next = letters[index + 1];
    return next !== undefined && isVowelLetter(c) && isVowelLetter(next);
  });
}

export function accentIsFinalOnly(word: string): boolean {
  const letters = [...word];
  const accentPositions = letters.flatMap((c, index) => (ACCENTED[c] ? [index] : []));
  if (accentPositions.length === 0) return true;
  if (accentPositions.length > 1) return false;
  const syllables = syllabify(word);
  if (syllables.length === 0) return false;
  const lastSyllable = syllables.at(-1);
  if (lastSyllable === undefined) return false;
  const firstIndexOfLast = word.length - lastSyllable.length;
  const position = accentPositions[0];
  return position !== undefined && position >= firstIndexOfLast;
}

export function areMirrorConfusable(a: string, b: string): boolean {
  if (a === b) return false;
  return MIRROR_GROUPS.some((group) => group.includes(a) && group.includes(b));
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/content/invariants.test.ts`
Expected: los 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/invariants.ts src/content/invariants.test.ts
git commit -m "feat(content): invariantes de sílabas abiertas, vocales adyacentes y tildes

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Catálogo de imágenes

Las 35 imágenes con su palabra hablada que usan las fases 0 y 1. Son de clase `picture`: el niño ve el dibujo y oye la palabra, nunca la lee. Existir como ítems les da `audioKey` e `imageKey` y permite usarlas como opciones.

**Files:**
- Create: `src/content/pictures.ts`
- Test: `src/content/pictures.test.ts`

**Interfaces:**
- Consumes: `Item` de `@/content/types`.
- Produces: `pictures: Item[]`, `pictureId(word: string): string`.

Convención: los `phonemes` usan un inventario simplificado de sonidos-letra en minúscula, donde el primer elemento es siempre el sonido inicial. Es suficiente para el ejercicio de sonido inicial y para la comparación fonética del Plan 4.

- [ ] **Step 1: Escribir los tests**

Crea `src/content/pictures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { itemSchema } from '@/content/types';
import { pictureId, pictures } from '@/content/pictures';

describe('catálogo de imágenes', () => {
  it('tiene las 35 imágenes de las fases 0 y 1', () => {
    expect(pictures).toHaveLength(35);
  });

  it('todas validan contra el esquema de ítem', () => {
    for (const picture of pictures) expect(itemSchema.safeParse(picture).success).toBe(true);
  });

  it('todas son de clase picture y llevan imageKey', () => {
    for (const picture of pictures) {
      expect(picture.kind).toBe('picture');
      expect(picture.imageKey).toBeDefined();
    }
  });

  it('no hay ids repetidos', () => {
    expect(new Set(pictures.map((p) => p.id)).size).toBe(pictures.length);
  });

  it('el primer fonema coincide con la primera letra del texto salvo en dígrafos', () => {
    const gato = pictures.find((p) => p.id === pictureId('gato'));
    expect(gato?.phonemes[0]).toBe('g');
  });

  it('pictureId construye el id esperado', () => {
    expect(pictureId('oso')).toBe('picture:oso');
  });

  it('incluye las imágenes que comparten las fases 0 y 1', () => {
    for (const word of ['oso', 'avión', 'uva', 'pato', 'luna']) {
      expect(pictures.some((p) => p.id === pictureId(word))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/pictures.test.ts`
Expected: FAIL, no se puede resolver `@/content/pictures`.

- [ ] **Step 3: Implementar el catálogo**

Crea `src/content/pictures.ts`:

```ts
import type { Item } from '@/content/types';

export function pictureId(word: string): string {
  return `picture:${word}`;
}

type Raw = [word: string, phonemes: string, syllables: string];

/** [palabra, fonemas separados por espacio, sílabas separadas por guion] */
const RAW: Raw[] = [
  ['sol', 's o l', 'sol'],
  ['pan', 'p a n', 'pan'],
  ['mesa', 'm e s a', 'me-sa'],
  ['casa', 'k a s a', 'ca-sa'],
  ['gato', 'g a t o', 'ga-to'],
  ['mano', 'm a n o', 'ma-no'],
  ['pelota', 'p e l o t a', 'pe-lo-ta'],
  ['banana', 'b a n a n a', 'ba-na-na'],
  ['tomate', 't o m a t e', 'to-ma-te'],
  ['pato', 'p a t o', 'pa-to'],
  ['masa', 'm a s a', 'ma-sa'],
  ['luna', 'l u n a', 'lu-na'],
  ['cuna', 'k u n a', 'cu-na'],
  ['ratón', 'r a t o n', 'ra-tón'],
  ['limón', 'l i m o n', 'li-món'],
  ['sopa', 's o p a', 'so-pa'],
  ['copa', 'k o p a', 'co-pa'],
  ['pelo', 'p e l o', 'pe-lo'],
  ['velo', 'b e l o', 've-lo'],
  ['avión', 'a b i o n', 'a-vión'],
  ['árbol', 'a r b o l', 'ár-bol'],
  ['ala', 'a l a', 'a-la'],
  ['elefante', 'e l e f a n t e', 'e-le-fan-te'],
  ['estrella', 'e s t r e ll a', 'es-tre-lla'],
  ['escoba', 'e s k o b a', 'es-co-ba'],
  ['isla', 'i s l a', 'is-la'],
  ['iglú', 'i g l u', 'i-glú'],
  ['imán', 'i m a n', 'i-mán'],
  ['oso', 'o s o', 'o-so'],
  ['ojo', 'o j o', 'o-jo'],
  ['oreja', 'o r e j a', 'o-re-ja'],
  ['uva', 'u b a', 'u-va'],
  ['uno', 'u n o', 'u-no'],
  ['uña', 'u ñ a', 'u-ña'],
  ['pipa', 'p i p a', 'pi-pa'],
];

export const pictures: Item[] = RAW.map(([word, phonemes, syllables]) => ({
  id: pictureId(word),
  kind: 'picture',
  text: word,
  phonemes: phonemes.split(' '),
  audioKey: `word:${word}`,
  imageKey: `img:${word}`,
  syllables: syllables.split('-'),
}));
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/content/pictures.test.ts`
Expected: los 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/pictures.ts src/content/pictures.test.ts
git commit -m "feat(content): catálogo de 35 imágenes con palabra hablada

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Datos de la Fase 0, oído de explorador

Las 4 unidades orales. No aparece ni una letra en pantalla: todo es audio e imágenes. Es la fase que la evidencia recomienda para 3-4 años antes de tocar el alfabeto.

**Files:**
- Create: `src/content/phase0.ts`
- Test: `src/content/phase0.test.ts`

**Interfaces:**
- Consumes: `Item`, `Unit` de `@/content/types`; `pictureId` de `@/content/pictures`.
- Produces: `phase0Items: Item[]`, `phase0Units: Unit[]`.

- [ ] **Step 1: Escribir los tests**

Crea `src/content/phase0.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pictureId, pictures } from '@/content/pictures';
import { phase0Items, phase0Units } from '@/content/phase0';
import { itemSchema, unitSchema } from '@/content/types';

describe('Fase 0', () => {
  it('tiene 4 unidades', () => {
    expect(phase0Units.map((u) => u.id)).toEqual([
      'phase0:clap', 'phase0:rhyme', 'phase0:initial', 'phase0:hear-it',
    ]);
  });

  it('todas las unidades y los ítems validan', () => {
    for (const unit of phase0Units) expect(unitSchema.safeParse(unit).success).toBe(true);
    for (const item of phase0Items) expect(itemSchema.safeParse(item).success).toBe(true);
  });

  it('no introduce ningún ítem de letra, sílaba ni palabra legible', () => {
    for (const item of phase0Items) expect(item.kind).toBe('oral-skill');
  });

  it('la primera unidad no tiene prerrequisitos y las demás encadenan', () => {
    expect(phase0Units[0]?.requires).toEqual([]);
    expect(phase0Units[1]?.requires).toEqual(['phase0:clap']);
    expect(phase0Units[3]?.requires).toEqual(['phase0:initial']);
  });

  it('cada unidad introduce exactamente los ítems que existen', () => {
    const ids = new Set(phase0Items.map((i) => i.id));
    for (const unit of phase0Units) {
      for (const id of unit.introduces) expect(ids.has(id)).toBe(true);
    }
  });

  it('las respuestas de contar sílabas coinciden con las sílabas de la imagen', () => {
    for (const item of phase0Items.filter((i) => i.id.startsWith('oral:clap:'))) {
      const word = item.text;
      const picture = pictures.find((p) => p.id === pictureId(word));
      expect(item.task?.answer).toBe(String(picture?.syllables?.length));
    }
  });

  it('cada tarea de rima y de sonido inicial ofrece opciones que existen', () => {
    const ids = new Set(pictures.map((p) => p.id));
    const conOpciones = phase0Items.filter((i) => i.task?.optionIds !== undefined);
    expect(conOpciones.length).toBeGreaterThan(0);
    for (const item of conOpciones) {
      for (const optionId of item.task?.optionIds ?? []) expect(ids.has(optionId)).toBe(true);
      expect(item.task?.optionIds).toContain(item.task?.answer);
    }
  });

  it('las tareas de sí o no responden solo si o no', () => {
    for (const item of phase0Items.filter((i) => i.id.startsWith('oral:hear:'))) {
      expect(['si', 'no']).toContain(item.task?.answer);
    }
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/phase0.test.ts`
Expected: FAIL, no se puede resolver `@/content/phase0`.

- [ ] **Step 3: Implementar los datos**

Crea `src/content/phase0.ts`:

```ts
import { pictureId, pictures } from '@/content/pictures';
import type { Item, Unit } from '@/content/types';

function syllableCount(word: string): string {
  const picture = pictures.find((p) => p.id === pictureId(word));
  return String(picture?.syllables?.length ?? 0);
}

const CLAP_WORDS = ['sol', 'pan', 'mesa', 'casa', 'gato', 'mano', 'pelota', 'banana', 'tomate'];

const clapItems: Item[] = CLAP_WORDS.map((word) => ({
  id: `oral:clap:${word}`,
  kind: 'oral-skill',
  text: word,
  phonemes: [],
  audioKey: `word:${word}`,
  imageKey: `img:${word}`,
  task: { answer: syllableCount(word) },
}));

/** [objetivo, palabra que rima, distractor que no rima] */
const RHYME_TRIOS: [string, string, string][] = [
  ['gato', 'pato', 'mesa'],
  ['casa', 'masa', 'sol'],
  ['luna', 'cuna', 'gato'],
  ['ratón', 'limón', 'casa'],
  ['sopa', 'copa', 'luna'],
  ['pelo', 'velo', 'pan'],
];

const rhymeItems: Item[] = RHYME_TRIOS.map(([target, rhymes, distractor]) => ({
  id: `oral:rhyme:${target}`,
  kind: 'oral-skill',
  text: target,
  phonemes: [],
  audioKey: `word:${target}`,
  imageKey: `img:${target}`,
  task: { answer: pictureId(rhymes), optionIds: [pictureId(rhymes), pictureId(distractor)] },
}));

/** [imagen, fonema inicial, dos imágenes que empiezan por otro sonido] */
const INITIAL_TRIOS: [string, string, [string, string]][] = [
  ['avión', 'a', ['oso', 'uva']],
  ['árbol', 'a', ['imán', 'uno']],
  ['elefante', 'e', ['ala', 'ojo']],
  ['estrella', 'e', ['uva', 'isla']],
  ['isla', 'i', ['oso', 'ala']],
  ['iglú', 'i', ['uno', 'escoba']],
  ['oso', 'o', ['avión', 'uña']],
  ['ojo', 'o', ['iglú', 'elefante']],
  ['uva', 'u', ['ala', 'oreja']],
  ['uno', 'u', ['isla', 'árbol']],
];

const initialItems: Item[] = INITIAL_TRIOS.map(([word, phoneme, others]) => ({
  id: `oral:initial:${word}`,
  kind: 'oral-skill',
  text: word,
  phonemes: [],
  audioKey: `phoneme:${phoneme}`,
  task: {
    answer: pictureId(word),
    optionIds: [pictureId(word), pictureId(others[0]), pictureId(others[1])],
  },
}));

/** [fonema, palabra, lo contiene] */
const HEAR_TRIPLES: [string, string, boolean][] = [
  ['a', 'pato', true],
  ['a', 'sol', false],
  ['o', 'oso', true],
  ['i', 'mesa', false],
  ['e', 'mesa', true],
  ['u', 'luna', true],
  ['o', 'pan', false],
  ['i', 'pipa', true],
];

const hearItems: Item[] = HEAR_TRIPLES.map(([phoneme, word, present]) => ({
  id: `oral:hear:${phoneme}-${word}`,
  kind: 'oral-skill',
  text: word,
  phonemes: [],
  audioKey: `instruction:hear:${phoneme}-${word}`,
  imageKey: `img:${word}`,
  task: { answer: present ? 'si' : 'no' },
}));

export const phase0Items: Item[] = [...clapItems, ...rhymeItems, ...initialItems, ...hearItems];

export const phase0Units: Unit[] = [
  {
    id: 'phase0:clap',
    phase: 0,
    title: 'Palabras con palmas',
    audioKey: 'unit:phase0:clap',
    requires: [],
    introduces: clapItems.map((i) => i.id),
    exercises: [{ templateId: 'count-syllables', weight: 1 }],
  },
  {
    id: 'phase0:rhyme',
    phase: 0,
    title: 'Rimas saltarinas',
    audioKey: 'unit:phase0:rhyme',
    requires: ['phase0:clap'],
    introduces: rhymeItems.map((i) => i.id),
    exercises: [{ templateId: 'rhyme', weight: 1 }],
  },
  {
    id: 'phase0:initial',
    phase: 0,
    title: 'Detectives de sonidos',
    audioKey: 'unit:phase0:initial',
    requires: ['phase0:rhyme'],
    introduces: initialItems.map((i) => i.id),
    exercises: [{ templateId: 'initial-sound', weight: 1 }],
  },
  {
    id: 'phase0:hear-it',
    phase: 0,
    title: '¿Lo oyes?',
    audioKey: 'unit:phase0:hear-it',
    requires: ['phase0:initial'],
    introduces: hearItems.map((i) => i.id),
    exercises: [{ templateId: 'initial-sound', weight: 1 }],
  },
];
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/content/phase0.test.ts`
Expected: los 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/phase0.ts src/content/phase0.test.ts
git commit -m "feat(content): Fase 0 con las cuatro unidades de conciencia fonológica

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Datos de la Fase 1, las vocales

Las 5 vocales en el orden a, e, o, i, u. Cada unidad introduce el fonema y la letra con su par mayúscula y minúscula. Las imágenes de ejemplo no se guardan por unidad: se derivan del catálogo filtrando por sonido inicial, así no hay dos listas que mantener sincronizadas.

**Files:**
- Create: `src/content/phase1.ts`
- Modify: `src/content/pictures.ts` (añadir `picturesByInitialPhoneme`)
- Test: `src/content/phase1.test.ts`

**Interfaces:**
- Consumes: `Item`, `Unit` de `@/content/types`.
- Produces:
  - `phase1Items: Item[]`, `phase1Units: Unit[]`, `VOWEL_ORDER: readonly string[]`
  - `picturesByInitialPhoneme(phoneme: string): Item[]` en `@/content/pictures`

- [ ] **Step 1: Escribir los tests**

Crea `src/content/phase1.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { picturesByInitialPhoneme } from '@/content/pictures';
import { VOWEL_ORDER, phase1Items, phase1Units } from '@/content/phase1';
import { itemSchema, unitSchema } from '@/content/types';

describe('Fase 1', () => {
  it('enseña las vocales en el orden a, e, o, i, u', () => {
    expect(VOWEL_ORDER).toEqual(['a', 'e', 'o', 'i', 'u']);
    expect(phase1Units.map((u) => u.id)).toEqual([
      'phase1:vowel-a', 'phase1:vowel-e', 'phase1:vowel-o', 'phase1:vowel-i', 'phase1:vowel-u',
    ]);
  });

  it('todo valida contra los esquemas', () => {
    for (const unit of phase1Units) expect(unitSchema.safeParse(unit).success).toBe(true);
    for (const item of phase1Items) expect(itemSchema.safeParse(item).success).toBe(true);
  });

  it('cada unidad introduce un fonema y una letra', () => {
    for (const unit of phase1Units) {
      expect(unit.introduces).toHaveLength(2);
      expect(unit.introduces[0]?.startsWith('phoneme:')).toBe(true);
      expect(unit.introduces[1]?.startsWith('letter:')).toBe(true);
    }
  });

  it('cada letra trae su par mayúscula y minúscula', () => {
    for (const item of phase1Items.filter((i) => i.kind === 'letter')) {
      expect(item.display?.upper).toBe(item.text.toUpperCase());
      expect(item.display?.lower).toBe(item.text);
    }
  });

  it('la primera vocal depende de haber terminado la Fase 0 y las demás encadenan', () => {
    expect(phase1Units[0]?.requires).toEqual(['phase0:hear-it']);
    expect(phase1Units[1]?.requires).toEqual(['phase1:vowel-a']);
    expect(phase1Units[4]?.requires).toEqual(['phase1:vowel-i']);
  });

  it('cada unidad usa las cuatro plantillas de la fase', () => {
    for (const unit of phase1Units) {
      expect(unit.exercises.map((e) => e.templateId).sort()).toEqual(
        ['initial-sound', 'listen-tap', 'say-it', 'trace'],
      );
    }
  });

  it('cada vocal tiene al menos 3 imágenes de ejemplo derivadas del catálogo', () => {
    for (const vowel of VOWEL_ORDER) {
      expect(picturesByInitialPhoneme(vowel).length).toBeGreaterThanOrEqual(3);
    }
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/phase1.test.ts`
Expected: FAIL, no se puede resolver `@/content/phase1`.

- [ ] **Step 3: Añadir el helper al catálogo de imágenes**

Al final de `src/content/pictures.ts` añade:

```ts
export function picturesByInitialPhoneme(phoneme: string): Item[] {
  return pictures.filter((picture) => picture.phonemes[0] === phoneme);
}
```

- [ ] **Step 4: Implementar los datos**

Crea `src/content/phase1.ts`:

```ts
import type { Item, Unit } from '@/content/types';

export const VOWEL_ORDER = ['a', 'e', 'o', 'i', 'u'] as const;

const UNIT_TITLES: Record<string, string> = {
  a: 'La vocal a', e: 'La vocal e', o: 'La vocal o', i: 'La vocal i', u: 'La vocal u',
};

export const phase1Items: Item[] = VOWEL_ORDER.flatMap((vowel): Item[] => [
  {
    id: `phoneme:${vowel}`,
    kind: 'phoneme',
    text: vowel,
    phonemes: [vowel],
    audioKey: `phoneme:${vowel}`,
  },
  {
    id: `letter:${vowel}`,
    kind: 'letter',
    text: vowel,
    phonemes: [vowel],
    audioKey: `phoneme:${vowel}`,
    display: { upper: vowel.toUpperCase(), lower: vowel },
  },
]);

export const phase1Units: Unit[] = VOWEL_ORDER.map((vowel, index) => {
  const previous = VOWEL_ORDER[index - 1];
  return {
    id: `phase1:vowel-${vowel}`,
    phase: 1,
    title: UNIT_TITLES[vowel] ?? `La vocal ${vowel}`,
    audioKey: `unit:phase1:vowel-${vowel}`,
    requires: previous === undefined ? ['phase0:hear-it'] : [`phase1:vowel-${previous}`],
    introduces: [`phoneme:${vowel}`, `letter:${vowel}`],
    exercises: [
      { templateId: 'initial-sound', weight: 1 },
      { templateId: 'listen-tap', weight: 3 },
      { templateId: 'trace', weight: 2 },
      { templateId: 'say-it', weight: 2 },
    ],
  };
});
```

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test src/content/phase1.test.ts src/content/pictures.test.ts`
Expected: PASS ambos archivos.

- [ ] **Step 6: Commit**

```bash
git add src/content/phase1.ts src/content/phase1.test.ts src/content/pictures.ts
git commit -m "feat(content): Fase 1 con las cinco vocales en orden a, e, o, i, u

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Datos de la Fase 2, las sílabas

Las consonantes m, l, s y p. Cada una introduce su fonema, su letra, sus 5 sílabas y sus palabras. Es la tarea donde los cuatro invariantes de palabra se convierten en tests que fallarían si alguien añade una palabra inadecuada.

**Files:**
- Create: `src/content/phase2.ts`
- Test: `src/content/phase2.test.ts`

**Interfaces:**
- Consumes: `Item`, `Unit` de `@/content/types`; los invariantes de `@/content/invariants`.
- Produces: `phase2Items: Item[]`, `phase2Units: Unit[]`, `CONSONANT_ORDER: readonly string[]`, `lettersIntroducedBefore(unitId: string): Set<string>`.

- [ ] **Step 1: Escribir los tests**

Crea `src/content/phase2.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  accentIsFinalOnly, hasAdjacentVowels, hasOnlyOpenSyllables, stripDiacritics, syllabify,
} from '@/content/invariants';
import { CONSONANT_ORDER, lettersIntroducedBefore, phase2Items, phase2Units } from '@/content/phase2';
import { itemSchema, unitSchema } from '@/content/types';

const words = phase2Items.filter((i) => i.kind === 'word');

describe('Fase 2, estructura', () => {
  it('enseña las consonantes en el orden m, l, s, p', () => {
    expect(CONSONANT_ORDER).toEqual(['m', 'l', 's', 'p']);
    expect(phase2Units.map((u) => u.id)).toEqual([
      'phase2:m', 'phase2:l', 'phase2:s', 'phase2:p',
    ]);
  });

  it('todo valida contra los esquemas', () => {
    for (const unit of phase2Units) expect(unitSchema.safeParse(unit).success).toBe(true);
    for (const item of phase2Items) expect(itemSchema.safeParse(item).success).toBe(true);
  });

  it('cada unidad introduce fonema, letra, 5 sílabas y al menos 5 palabras', () => {
    for (const unit of phase2Units) {
      const introduced = unit.introduces;
      expect(introduced.filter((id) => id.startsWith('phoneme:'))).toHaveLength(1);
      expect(introduced.filter((id) => id.startsWith('letter:'))).toHaveLength(1);
      expect(introduced.filter((id) => id.startsWith('syllable:'))).toHaveLength(5);
      expect(introduced.filter((id) => id.startsWith('word:')).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('la primera consonante depende de la última vocal', () => {
    expect(phase2Units[0]?.requires).toEqual(['phase1:vowel-u']);
    expect(phase2Units[3]?.requires).toEqual(['phase2:s']);
  });
});

describe('Fase 2, invariante 1: pertenencia de letras', () => {
  it('cada palabra usa solo letras ya introducidas en su unidad o antes', () => {
    for (const unit of phase2Units) {
      const allowed = lettersIntroducedBefore(unit.id);
      for (const id of unit.introduces.filter((x) => x.startsWith('word:'))) {
        const word = phase2Items.find((i) => i.id === id);
        expect(word).toBeDefined();
        for (const letter of stripDiacritics(word?.text ?? '')) {
          expect(allowed.has(letter)).toBe(true);
        }
      }
    }
  });
});

describe('Fase 2, invariante 2: sílabas abiertas', () => {
  it('toda palabra se descompone solo en CV o V', () => {
    for (const word of words) expect(hasOnlyOpenSyllables(word.text)).toBe(true);
  });

  it('las sílabas declaradas coinciden con la silabificación', () => {
    for (const word of words) expect(word.syllables).toEqual(syllabify(word.text));
  });

  it('rechazaría una palabra con coda o grupo consonántico', () => {
    expect(hasOnlyOpenSyllables('pan')).toBe(false);
    expect(hasOnlyOpenSyllables('plato')).toBe(false);
  });
});

describe('Fase 2, invariante 3: sin vocales adyacentes', () => {
  it('ninguna palabra tiene dos vocales seguidas', () => {
    for (const word of words) expect(hasAdjacentVowels(word.text)).toBe(false);
  });

  it('rechazaría mío y tiene', () => {
    expect(hasAdjacentVowels('mío')).toBe(true);
    expect(hasAdjacentVowels('tiene')).toBe(true);
  });
});

describe('Fase 2, invariante 4: tildes', () => {
  it('solo mamá y papá llevan tilde, y van marcadas', () => {
    const conTilde = words.filter((w) => w.text !== stripDiacritics(w.text));
    expect(conTilde.map((w) => w.text).sort()).toEqual(['mamá', 'papá']);
    for (const word of conTilde) expect(word.accented).toBe(true);
  });

  it('la tilde cae en la última sílaba', () => {
    for (const word of words) expect(accentIsFinalOnly(word.text)).toBe(true);
  });

  it('ninguna palabra sin tilde queda marcada como acentuada', () => {
    for (const word of words.filter((w) => w.text === stripDiacritics(w.text))) {
      expect(word.accented).toBeUndefined();
    }
  });
});

describe('Fase 2, sílabas', () => {
  it('cada consonante genera sus 5 sílabas con las vocales en orden a, e, i, o, u', () => {
    const deM = phase2Items.filter((i) => i.kind === 'syllable' && i.text.startsWith('m'));
    expect(deM.map((i) => i.text)).toEqual(['ma', 'me', 'mi', 'mo', 'mu']);
  });

  it('cada sílaba declara sus dos fonemas', () => {
    const ma = phase2Items.find((i) => i.id === 'syllable:ma');
    expect(ma?.phonemes).toEqual(['m', 'a']);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/phase2.test.ts`
Expected: FAIL, no se puede resolver `@/content/phase2`.

- [ ] **Step 3: Implementar los datos**

Crea `src/content/phase2.ts`. Las listas de palabras son las del spec §4 y ya cumplen los cuatro invariantes.

```ts
import { stripDiacritics, syllabify } from '@/content/invariants';
import { VOWEL_ORDER } from '@/content/phase1';
import type { Item, Unit } from '@/content/types';

export const CONSONANT_ORDER = ['m', 'l', 's', 'p'] as const;
type Consonant = (typeof CONSONANT_ORDER)[number];

const SYLLABLE_VOWELS = ['a', 'e', 'i', 'o', 'u'] as const;

const WORDS: Record<Consonant, string[]> = {
  m: ['mamá', 'mimo', 'mima', 'ama', 'amo'],
  l: ['lima', 'loma', 'mula', 'mala', 'malo', 'lelo', 'ala', 'ola'],
  s: ['mesa', 'masa', 'misa', 'suma', 'sumo', 'sola', 'sala', 'oso', 'uso', 'eso', 'asa'],
  p: ['papá', 'pipa', 'mapa', 'sapo', 'sopa', 'pesa', 'puma', 'pala', 'pelo', 'polo', 'lupa', 'paso', 'piso'],
};

const UNIT_TITLES: Record<Consonant, string> = {
  m: 'La m y sus sílabas',
  l: 'La l y sus sílabas',
  s: 'La s y sus sílabas',
  p: 'La p y sus sílabas',
};

function letterItem(consonant: Consonant): Item {
  return {
    id: `letter:${consonant}`,
    kind: 'letter',
    text: consonant,
    phonemes: [consonant],
    audioKey: `phoneme:${consonant}`,
    display: { upper: consonant.toUpperCase(), lower: consonant },
  };
}

function syllableItems(consonant: Consonant): Item[] {
  return SYLLABLE_VOWELS.map((vowel) => ({
    id: `syllable:${consonant}${vowel}`,
    kind: 'syllable',
    text: `${consonant}${vowel}`,
    phonemes: [consonant, vowel],
    audioKey: `syllable:${consonant}${vowel}`,
  }));
}

function wordItem(word: string): Item {
  const accented = word !== stripDiacritics(word);
  const base: Item = {
    id: `word:${stripDiacritics(word)}`,
    kind: 'word',
    text: word,
    phonemes: [...stripDiacritics(word)],
    audioKey: `word:${stripDiacritics(word)}`,
    imageKey: `img:${stripDiacritics(word)}`,
    syllables: syllabify(word),
  };
  return accented ? { ...base, accented: true } : base;
}

export const phase2Items: Item[] = CONSONANT_ORDER.flatMap((consonant): Item[] => [
  { id: `phoneme:${consonant}`, kind: 'phoneme', text: consonant, phonemes: [consonant], audioKey: `phoneme:${consonant}` },
  letterItem(consonant),
  ...syllableItems(consonant),
  ...WORDS[consonant].map(wordItem),
]);

export const phase2Units: Unit[] = CONSONANT_ORDER.map((consonant, index) => {
  const previous = CONSONANT_ORDER[index - 1];
  return {
    id: `phase2:${consonant}`,
    phase: 2,
    title: UNIT_TITLES[consonant],
    audioKey: `unit:phase2:${consonant}`,
    requires: previous === undefined ? ['phase1:vowel-u'] : [`phase2:${previous}`],
    introduces: [
      `phoneme:${consonant}`,
      `letter:${consonant}`,
      ...syllableItems(consonant).map((i) => i.id),
      ...WORDS[consonant].map((w) => `word:${stripDiacritics(w)}`),
    ],
    exercises: [
      { templateId: 'listen-tap', weight: 3 },
      { templateId: 'build', weight: 2 },
      { templateId: 'trace', weight: 1 },
      { templateId: 'say-it', weight: 3 },
      { templateId: 'read-word', weight: 2 },
    ],
  };
});

/** Letras disponibles al llegar a esa unidad: las 5 vocales más las consonantes hasta ella incluida. */
export function lettersIntroducedBefore(unitId: string): Set<string> {
  const index = CONSONANT_ORDER.findIndex((c) => `phase2:${c}` === unitId);
  const consonants = index < 0 ? [] : CONSONANT_ORDER.slice(0, index + 1);
  return new Set<string>([...VOWEL_ORDER, ...consonants]);
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/content/phase2.test.ts`
Expected: los 15 tests PASS. Si alguno de los invariantes falla, el error señala la palabra concreta: corrige la palabra, no el invariante.

- [ ] **Step 5: Commit**

```bash
git add src/content/phase2.ts src/content/phase2.test.ts
git commit -m "feat(content): Fase 2 con m, l, s, p y sus palabras validadas

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Manifiesto de audio

Enumera todo lo que la app tiene que decir. Se divide en dos partes: las claves derivadas del contenido, que deben coincidir exactamente con lo que el contenido referencia, y las claves de interfaz, que se escriben a mano. El texto asociado es la fuente para generar los audios en los tres acentos más adelante.

El test por omisión solo comprueba consistencia interna. La verificación de ficheros en disco vive detrás de `SILABIN_CHECK_AUDIO_FILES=1` para que ningún test nazca en rojo mientras no existan los assets.

**Files:**
- Create: `src/content/audio-manifest.ts`
- Test: `src/content/audio-manifest.test.ts`

**Interfaces:**
- Consumes: `phase0Items`, `phase0Units`, `phase1Items`, `phase1Units`, `phase2Items`, `phase2Units`, `pictures`.
- Produces:
  - `ACCENTS: readonly ['do', 'mx', 'neutro']`
  - `contentAudio: Record<string, string>`, `uiAudio: Record<string, string>`, `audioManifest: Record<string, string>`
  - `audioPath(key: string, accent: Accent): string`
  - `referencedAudioKeys(): Set<string>`

- [ ] **Step 1: Escribir los tests**

Crea `src/content/audio-manifest.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCENTS, audioManifest, audioPath, contentAudio, referencedAudioKeys, uiAudio } from '@/content/audio-manifest';
import { templateIds, templates } from '@/content/templates';

describe('manifiesto de audio', () => {
  it('declara los tres acentos', () => {
    expect(ACCENTS).toEqual(['do', 'mx', 'neutro']);
  });

  it('cubre todas las claves que el contenido referencia', () => {
    for (const key of referencedAudioKeys()) expect(contentAudio[key]).toBeDefined();
  });

  it('no tiene claves de contenido huérfanas', () => {
    const referenced = referencedAudioKeys();
    for (const key of Object.keys(contentAudio)) expect(referenced.has(key)).toBe(true);
  });

  it('ningún texto queda vacío', () => {
    for (const [key, text] of Object.entries(audioManifest)) {
      expect(text.trim().length, `clave vacía: ${key}`).toBeGreaterThan(0);
    }
  });

  it('el sonido de una consonante no es su nombre', () => {
    expect(contentAudio['phoneme:m']).toBe('mmm');
    expect(contentAudio['phoneme:m']).not.toBe('eme');
    expect(contentAudio['phoneme:s']).toBe('sss');
  });

  it('declara una instrucción para cada plantilla', () => {
    for (const id of templateIds) expect(uiAudio[`instruction:${id}`]).toBeDefined();
  });

  it('declara audio para cada pista que lo necesita', () => {
    for (const id of templateIds) {
      for (const hint of templates[id].hints) {
        if (hint.action.includes('replay-instruction')) {
          expect(uiAudio[`instruction:${id}`]).toBeDefined();
        }
      }
    }
  });

  it('declara las locuciones de celebración y de reintento', () => {
    for (const key of ['celebrate:correct', 'celebrate:session', 'feedback:retry', 'feedback:no-speech']) {
      expect(uiAudio[key]).toBeDefined();
    }
  });

  it('audioPath construye la ruta esperada', () => {
    expect(audioPath('phoneme:a', 'do')).toBe('/audio/do/phoneme_a.m4a');
  });

  it.runIf(process.env.SILABIN_CHECK_AUDIO_FILES === '1')(
    'todos los ficheros existen en los tres acentos',
    () => {
      for (const key of Object.keys(audioManifest)) {
        for (const accent of ACCENTS) {
          expect(existsSync(`public${audioPath(key, accent)}`), `falta ${key} en ${accent}`).toBe(true);
        }
      }
    },
  );
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/audio-manifest.test.ts`
Expected: FAIL, no se puede resolver `@/content/audio-manifest`.

- [ ] **Step 3: Implementar el manifiesto**

Crea `src/content/audio-manifest.ts`:

```ts
import { phase0Items, phase0Units } from '@/content/phase0';
import { phase1Items, phase1Units } from '@/content/phase1';
import { phase2Items, phase2Units } from '@/content/phase2';
import { pictures } from '@/content/pictures';
import { templateIds } from '@/content/templates';
import type { Item, Unit } from '@/content/types';

export const ACCENTS = ['do', 'mx', 'neutro'] as const;
export type Accent = (typeof ACCENTS)[number];

const allItems: Item[] = [...pictures, ...phase0Items, ...phase1Items, ...phase2Items];
const allUnits: Unit[] = [...phase0Units, ...phase1Units, ...phase2Units];

export function referencedAudioKeys(): Set<string> {
  return new Set([...allItems.map((i) => i.audioKey), ...allUnits.map((u) => u.audioKey)]);
}

/** Sonido alargado de cada fonema. Las oclusivas no se alargan: se dicen una vez. */
const PHONEME_SOUND: Record<string, string> = {
  a: 'aaa', e: 'eee', i: 'iii', o: 'ooo', u: 'uuu',
  m: 'mmm', l: 'lll', s: 'sss', p: 'p',
};

function textForKey(key: string): string {
  const [prefix, rest = ''] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  switch (prefix) {
    case 'phoneme':
      return PHONEME_SOUND[rest] ?? rest;
    case 'syllable':
    case 'word':
      return allItems.find((i) => i.audioKey === key)?.text ?? rest;
    case 'unit':
      return allUnits.find((u) => u.audioKey === key)?.title ?? rest;
    case 'instruction': {
      const item = phase0Items.find((i) => i.audioKey === key);
      if (item === undefined) return rest;
      const [phoneme = '', word = ''] = rest.replace('hear:', '').split('-');
      return `¿Oyes ${PHONEME_SOUND[phoneme] ?? phoneme} en ${word}?`;
    }
    default:
      return rest;
  }
}

export const contentAudio: Record<string, string> = Object.fromEntries(
  [...referencedAudioKeys()].sort().map((key) => [key, textForKey(key)]),
);

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  'listen-tap': 'Escucha y toca la que suena.',
  'count-syllables': 'Escucha la palabra y toca una vez por cada parte.',
  rhyme: '¿Cuál suena parecido al final?',
  'initial-sound': '¿Cuál empieza con este sonido?',
  build: 'Arrastra las piezas para formar la sílaba.',
  trace: 'Sigue la letra con el dedo.',
  'say-it': 'Toca el micrófono y dilo.',
  'read-word': 'Lee la palabra en voz alta.',
};

export const uiAudio: Record<string, string> = {
  ...Object.fromEntries(templateIds.map((id) => [`instruction:${id}`, TEMPLATE_INSTRUCTIONS[id] ?? ''])),
  'celebrate:correct': '¡Muy bien!',
  'celebrate:session': '¡Terminaste! Mira tus estrellas.',
  'feedback:retry': 'Mmm, otra vez.',
  'feedback:no-speech': 'No te oí. ¿Lo dices otra vez?',
  'reward:new': '¡Ganaste un premio nuevo!',
  'ui:tap-to-start': 'Toca para empezar.',
  'ui:mic-listening': 'Te escucho.',
};

export const audioManifest: Record<string, string> = { ...contentAudio, ...uiAudio };

export function audioPath(key: string, accent: Accent): string {
  return `/audio/${accent}/${key.replace(/[:]/g, '_')}.m4a`;
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/content/audio-manifest.test.ts`
Expected: los 9 tests PASS y el décimo se salta por falta de la variable de entorno.

- [ ] **Step 5: Comprobar que el test de ficheros se salta de verdad**

Run: `SILABIN_CHECK_AUDIO_FILES=1 pnpm test src/content/audio-manifest.test.ts`
Expected: FAIL en el test de ficheros, porque los audios aún no existen. Es el comportamiento correcto: confirma que la puerta funciona. Vuelve a correr sin la variable y comprueba que queda verde.

- [ ] **Step 6: Commit**

```bash
git add src/content/audio-manifest.ts src/content/audio-manifest.test.ts
git commit -m "feat(content): manifiesto de audio con las claves de contenido y de interfaz

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Ensamblado y validación global del currículo

Une las tres fases, añade las unidades vacías de Fase 3 que dibujan el camino futuro, valida todo con Zod al importar y expone el currículo indexado que consume el motor. Si algún dato está mal, la aplicación no arranca: es el comportamiento que se quiere.

**Files:**
- Create: `src/content/phases-future.ts`, `src/content/index.ts`
- Test: `src/content/index.test.ts`

**Interfaces:**
- Consumes: todos los módulos de `content/`.
- Produces:
  - `type CurriculumIndex = { items: ReadonlyMap<string, Item>; units: ReadonlyMap<string, Unit>; unitOrder: string[] }`
  - `buildCurriculum(raw: Curriculum): CurriculumIndex`
  - `curriculum: CurriculumIndex` ya validado
  - `phase3Units: Unit[]`

- [ ] **Step 1: Escribir los tests**

Crea `src/content/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCurriculum, curriculum } from '@/content/index';
import type { Curriculum } from '@/content/types';

describe('currículo ensamblado', () => {
  it('carga sin lanzar y contiene las unidades de las fases 0 a 3', () => {
    expect(curriculum.units.size).toBeGreaterThanOrEqual(13);
    expect(curriculum.units.has('phase0:clap')).toBe(true);
    expect(curriculum.units.has('phase2:p')).toBe(true);
    expect([...curriculum.units.values()].some((u) => u.phase === 3)).toBe(true);
  });

  it('indexa los ítems por id', () => {
    expect(curriculum.items.get('syllable:ma')?.text).toBe('ma');
    expect(curriculum.items.get('letter:a')?.display?.upper).toBe('A');
  });

  it('ordena las unidades de forma topológica: ningún prerrequisito aparece después', () => {
    const position = new Map(curriculum.unitOrder.map((id, index) => [id, index]));
    for (const unit of curriculum.units.values()) {
      for (const required of unit.requires) {
        expect(position.get(required)!).toBeLessThan(position.get(unit.id)!);
      }
    }
  });

  it('empieza por la primera unidad de la Fase 0', () => {
    expect(curriculum.unitOrder[0]).toBe('phase0:clap');
  });

  it('todo ítem que una unidad introduce existe', () => {
    for (const unit of curriculum.units.values()) {
      for (const id of unit.introduces) expect(curriculum.items.has(id)).toBe(true);
    }
  });

  it('todo prerrequisito apunta a una unidad existente', () => {
    for (const unit of curriculum.units.values()) {
      for (const required of unit.requires) expect(curriculum.units.has(required)).toBe(true);
    }
  });

  it('ningún ítem se introduce en dos unidades', () => {
    const seen = new Set<string>();
    for (const unit of curriculum.units.values()) {
      for (const id of unit.introduces) {
        expect(seen.has(id), `${id} se introduce dos veces`).toBe(false);
        seen.add(id);
      }
    }
  });
});

describe('buildCurriculum, validaciones', () => {
  const item = { id: 'letter:a', kind: 'letter' as const, text: 'a', phonemes: ['a'], audioKey: 'phoneme:a', display: { upper: 'A', lower: 'a' } };
  const unit = { id: 'u1', phase: 1 as const, title: 'U1', audioKey: 'unit:u1', requires: [], introduces: ['letter:a'], exercises: [{ templateId: 'listen-tap' as const, weight: 1 }] };

  it('rechaza ids de ítem repetidos', () => {
    const raw: Curriculum = { items: [item, item], units: [unit] };
    expect(() => buildCurriculum(raw)).toThrow(/repetido/i);
  });

  it('rechaza un prerrequisito inexistente', () => {
    const raw: Curriculum = { items: [item], units: [{ ...unit, requires: ['no-existe'] }] };
    expect(() => buildCurriculum(raw)).toThrow(/prerrequisito/i);
  });

  it('rechaza un ítem introducido que no existe', () => {
    const raw: Curriculum = { items: [item], units: [{ ...unit, introduces: ['letter:z'] }] };
    expect(() => buildCurriculum(raw)).toThrow(/introduce/i);
  });

  it('rechaza un ciclo de prerrequisitos', () => {
    const raw: Curriculum = {
      items: [item],
      units: [
        { ...unit, id: 'a', requires: ['b'] },
        { ...unit, id: 'b', requires: ['a'], introduces: [] as string[], phase: 3 as const, exercises: [] },
      ],
    };
    expect(() => buildCurriculum(raw)).toThrow(/ciclo/i);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/content/index.test.ts`
Expected: FAIL, no se puede resolver `@/content/index`.

- [ ] **Step 3: Crear las unidades de Fase 3**

Crea `src/content/phases-future.ts`. No tienen ítems: solo existen para que el mapa muestre el camino que viene y quede bloqueado.

```ts
import type { Unit } from '@/content/types';

const FUTURE = [
  ['t', 'La t'], ['n', 'La n'], ['d', 'La d'], ['r', 'La r suave'],
  ['f', 'La f'], ['enie', 'La ñ'], ['c', 'La c con a, o, u'], ['b', 'La b'],
] as const;

export const phase3Units: Unit[] = FUTURE.map(([slug, title], index) => {
  const previous = FUTURE[index - 1];
  return {
    id: `phase3:${slug}`,
    phase: 3,
    title,
    audioKey: `unit:phase3:${slug}`,
    requires: previous === undefined ? ['phase2:p'] : [`phase3:${previous[0]}`],
    introduces: [],
    exercises: [],
  };
});
```

- [ ] **Step 4: Implementar el ensamblado**

Crea `src/content/index.ts`:

```ts
import { phase0Items, phase0Units } from '@/content/phase0';
import { phase1Items, phase1Units } from '@/content/phase1';
import { phase2Items, phase2Units } from '@/content/phase2';
import { phase3Units } from '@/content/phases-future';
import { pictures } from '@/content/pictures';
import { curriculumSchema, type Curriculum, type Item, type Unit } from '@/content/types';

export type CurriculumIndex = {
  items: ReadonlyMap<string, Item>;
  units: ReadonlyMap<string, Unit>;
  unitOrder: string[];
};

function topologicalOrder(units: Unit[]): string[] {
  const pending = new Map(units.map((u) => [u.id, new Set(u.requires)]));
  const order: string[] = [];
  while (pending.size > 0) {
    const ready = [...pending.entries()]
      .filter(([, requires]) => [...requires].every((id) => order.includes(id)))
      .map(([id]) => id)
      .sort();
    const next = ready[0];
    if (next === undefined) {
      throw new Error(`Hay un ciclo de prerrequisitos entre: ${[...pending.keys()].join(', ')}`);
    }
    order.push(next);
    pending.delete(next);
  }
  return order;
}

export function buildCurriculum(raw: Curriculum): CurriculumIndex {
  curriculumSchema.parse(raw);

  const items = new Map<string, Item>();
  for (const item of raw.items) {
    if (items.has(item.id)) throw new Error(`Id de ítem repetido: ${item.id}`);
    items.set(item.id, item);
  }

  const units = new Map<string, Unit>();
  for (const unit of raw.units) {
    if (units.has(unit.id)) throw new Error(`Id de unidad repetido: ${unit.id}`);
    units.set(unit.id, unit);
  }

  for (const unit of units.values()) {
    for (const required of unit.requires) {
      if (!units.has(required)) {
        throw new Error(`La unidad ${unit.id} declara un prerrequisito inexistente: ${required}`);
      }
    }
    for (const id of unit.introduces) {
      if (!items.has(id)) {
        throw new Error(`La unidad ${unit.id} introduce un ítem inexistente: ${id}`);
      }
    }
  }

  const introduced = new Set<string>();
  for (const unit of units.values()) {
    for (const id of unit.introduces) {
      if (introduced.has(id)) throw new Error(`El ítem ${id} se introduce en más de una unidad`);
      introduced.add(id);
    }
  }

  return { items, units, unitOrder: topologicalOrder([...units.values()]) };
}

export const curriculum: CurriculumIndex = buildCurriculum({
  items: [...pictures, ...phase0Items, ...phase1Items, ...phase2Items],
  units: [...phase0Units, ...phase1Units, ...phase2Units, ...phase3Units],
});
```

- [ ] **Step 5: Verificar que pasa toda la capa de contenido**

Run: `pnpm test src/content && pnpm typecheck`
Expected: todos los archivos de `content/` en verde y `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/content/index.ts src/content/index.test.ts src/content/phases-future.ts
git commit -m "feat(content): ensamblado del currículo con validación global y orden topológico

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Tipos del motor y generador con semilla

Define el estado sobre el que opera todo el motor y el generador pseudoaleatorio que hace determinista la planificación. Sin esto no se puede escribir ningún test del motor.

Decisión de diseño: los campos opcionales del progreso se modelan como `number | null` y `string | null`, no como propiedades opcionales. Con `exactOptionalPropertyTypes` activado, las propiedades opcionales obligan a construir objetos por partes, y `null` viaja mejor a JSON que `undefined`, que simplemente desaparece al serializar.

**Files:**
- Create: `src/engine/types.ts`, `src/engine/random.ts`
- Test: `src/engine/random.test.ts`

**Interfaces:**
- Consumes: `TemplateId` de `@/content/templates`.
- Produces:
  - `Box`, `ItemProgress`, `UnitStatus`, `UnitProgress`, `Counters`, `ProgressState`
  - `ExerciseResolution`, `PlannedExercise`
  - `emptyItemProgress(): ItemProgress`, `emptyProgressState(): ProgressState`
  - `Rng`, `createRng(seed: number): Rng`

- [ ] **Step 1: Escribir los tests del generador**

Crea `src/engine/random.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '@/engine/random';

describe('createRng', () => {
  it('produce la misma secuencia con la misma semilla', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('produce secuencias distintas con semillas distintas', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('devuelve valores dentro de [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int devuelve enteros dentro del rango', () => {
    const rng = createRng(3);
    for (let i = 0; i < 100; i += 1) {
      const value = rng.int(5);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(5);
    }
  });

  it('pick elige un elemento del arreglo', () => {
    const rng = createRng(9);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i += 1) expect(items).toContain(rng.pick(items));
  });

  it('pick lanza con un arreglo vacío', () => {
    expect(() => createRng(1).pick([])).toThrow(/vacío/i);
  });

  it('shuffle conserva todos los elementos y no muta el original', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = createRng(11).shuffle(original);
    expect([...shuffled].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it('shuffle es determinista con la misma semilla', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(createRng(21).shuffle(items)).toEqual(createRng(21).shuffle(items));
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/engine/random.test.ts`
Expected: FAIL, no se puede resolver `@/engine/random`.

- [ ] **Step 3: Implementar los tipos**

Crea `src/engine/types.ts`:

```ts
import type { TemplateId } from '@/content/templates';

export type Box = 0 | 1 | 2 | 3;
export type Stars = 0 | 1 | 2 | 3;

export type ItemProgress = {
  /** 0 = aún no acertado. 1 a 3 = caja Leitner. */
  box: Box;
  /** true en cuanto el ítem se ha presentado una vez, aunque todavía no se haya acertado. */
  presented: boolean;
  /** Aciertos al primer intento, contados como máximo uno por sesión. */
  firstTryCorrect: number;
  /** Veces que se resolvió con el modelo del tercer rung. */
  assisted: number;
  lastSessionIndex: number;
  /** Última sesión que otorgó crédito de dominio, para exigir sesiones distintas. */
  lastCreditSession: number | null;
  masteredAt: string | null;
};

export type UnitStatus = 'locked' | 'active' | 'done';
export type UnitProgress = { status: UnitStatus; bestStars: Stars };

export type Counters = {
  traces: number;
  sessions: number;
  voiceOk: number;
  wordsRead: number;
};

export type ProgressState = {
  items: Record<string, ItemProgress>;
  units: Record<string, UnitProgress>;
  sessionCounter: number;
  counters: Counters;
};

export type ExerciseResolution =
  | { status: 'mastery-credit' }
  | { status: 'correct-with-hint'; hintsUsed: 1 | 2 }
  | { status: 'assisted' };

export type PlannedExercise = {
  /** Único dentro de la sesión. */
  id: string;
  kind: 'presentation' | 'evaluation';
  templateId: TemplateId;
  itemId: string;
  /** Opciones ya resueltas, incluida la correcta. Vacío en plantillas sin opciones. */
  optionIds: string[];
  source: 'active-unit' | 'review';
};

export function emptyItemProgress(): ItemProgress {
  return {
    box: 0,
    presented: false,
    firstTryCorrect: 0,
    assisted: 0,
    lastSessionIndex: -1,
    lastCreditSession: null,
    masteredAt: null,
  };
}

export function emptyProgressState(): ProgressState {
  return {
    items: {},
    units: {},
    sessionCounter: 0,
    counters: { traces: 0, sessions: 0, voiceOk: 0, wordsRead: 0 },
  };
}
```

- [ ] **Step 4: Implementar el generador**

Crea `src/engine/random.ts`. El algoritmo es mulberry32: 32 bits de estado, rápido y determinista.

```ts
export type Rng = {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(maxExclusive: number): number {
    if (maxExclusive <= 0) throw new Error('int necesita un máximo mayor que cero');
    return Math.floor(next() * maxExclusive);
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick no puede elegir de un arreglo vacío');
    const item = items[int(items.length)];
    if (item === undefined) throw new Error('pick obtuvo un índice inválido');
    return item;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      const a = out[i];
      const b = out[j];
      if (a === undefined || b === undefined) continue;
      out[i] = b;
      out[j] = a;
    }
    return out;
  }

  return { next, int, pick, shuffle };
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test src/engine/random.test.ts && pnpm typecheck`
Expected: los 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/random.ts src/engine/random.test.ts
git commit -m "feat(engine): tipos del progreso y generador pseudoaleatorio con semilla

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Cajas Leitner

Las cajas 1, 2 y 3 con intervalos de 1, 3 y 7 sesiones. Decide qué ítem vuelve a aparecer y cuándo. Es la regla que hace que el repaso sea espaciado y no aleatorio.

**Files:**
- Create: `src/engine/leitner.ts`
- Test: `src/engine/leitner.test.ts`

**Interfaces:**
- Consumes: `Box`, `ItemProgress` de `@/engine/types`.
- Produces: `BOX_INTERVALS`, `MAX_BOX`, `promote(box)`, `demote(box)`, `isDue(progress, sessionIndex)`, `sessionsUntilDue(progress, sessionIndex)`.

- [ ] **Step 1: Escribir los tests**

Crea `src/engine/leitner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOX_INTERVALS, demote, isDue, promote, sessionsUntilDue } from '@/engine/leitner';
import { emptyItemProgress, type ItemProgress } from '@/engine/types';

function progress(overrides: Partial<ItemProgress>): ItemProgress {
  return { ...emptyItemProgress(), ...overrides };
}

describe('intervalos', () => {
  it('son 1, 3 y 7 sesiones', () => {
    expect(BOX_INTERVALS).toEqual({ 1: 1, 2: 3, 3: 7 });
  });
});

describe('promote', () => {
  it('sube una caja', () => {
    expect(promote(0)).toBe(1);
    expect(promote(1)).toBe(2);
    expect(promote(2)).toBe(3);
  });

  it('no pasa de la caja 3', () => {
    expect(promote(3)).toBe(3);
  });
});

describe('demote', () => {
  it('manda a la caja 1 desde cualquier caja', () => {
    expect(demote(3)).toBe(1);
    expect(demote(2)).toBe(1);
    expect(demote(1)).toBe(1);
  });

  it('también saca de la caja 0, porque el ítem ya se intentó', () => {
    expect(demote(0)).toBe(1);
  });
});

describe('isDue', () => {
  it('un ítem sin acertar nunca está vencido: lo elige el planificador por otra vía', () => {
    expect(isDue(progress({ box: 0, presented: true, lastSessionIndex: 0 }), 10)).toBe(false);
  });

  it('caja 1 vence a la sesión siguiente', () => {
    const p = progress({ box: 1, lastSessionIndex: 5 });
    expect(isDue(p, 5)).toBe(false);
    expect(isDue(p, 6)).toBe(true);
  });

  it('caja 2 vence tres sesiones después', () => {
    const p = progress({ box: 2, lastSessionIndex: 5 });
    expect(isDue(p, 7)).toBe(false);
    expect(isDue(p, 8)).toBe(true);
  });

  it('caja 3 vence siete sesiones después', () => {
    const p = progress({ box: 3, lastSessionIndex: 1 });
    expect(isDue(p, 7)).toBe(false);
    expect(isDue(p, 8)).toBe(true);
  });
});

describe('sessionsUntilDue', () => {
  it('cuenta lo que falta y no baja de cero', () => {
    expect(sessionsUntilDue(progress({ box: 2, lastSessionIndex: 5 }), 6)).toBe(2);
    expect(sessionsUntilDue(progress({ box: 2, lastSessionIndex: 5 }), 20)).toBe(0);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/engine/leitner.test.ts`
Expected: FAIL, no se puede resolver `@/engine/leitner`.

- [ ] **Step 3: Implementar**

Crea `src/engine/leitner.ts`:

```ts
import type { Box, ItemProgress } from '@/engine/types';

export const MAX_BOX = 3 as const;
export const BOX_INTERVALS: Record<1 | 2 | 3, number> = { 1: 1, 2: 3, 3: 7 };

export function promote(box: Box): Box {
  return box >= MAX_BOX ? MAX_BOX : ((box + 1) as Box);
}

export function demote(_box: Box): Box {
  return 1;
}

export function isDue(progress: ItemProgress, sessionIndex: number): boolean {
  if (progress.box === 0) return false;
  return sessionIndex - progress.lastSessionIndex >= BOX_INTERVALS[progress.box];
}

export function sessionsUntilDue(progress: ItemProgress, sessionIndex: number): number {
  if (progress.box === 0) return 0;
  const due = progress.lastSessionIndex + BOX_INTERVALS[progress.box];
  return Math.max(0, due - sessionIndex);
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/engine/leitner.test.ts`
Expected: los 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/leitner.ts src/engine/leitner.test.ts
git commit -m "feat(engine): cajas Leitner con intervalos de 1, 3 y 7 sesiones

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Dominio de ítems, completitud de unidades y desbloqueo

Traduce a código las tres reglas de progreso: un ítem se domina con 3 aciertos sin ayuda en sesiones distintas, una unidad se completa con el 80 % de sus ítems dominados, y una unidad se desbloquea cuando todos sus prerrequisitos están completos. También decide cuál es la unidad activa.

**Files:**
- Create: `src/engine/mastery.ts`, `src/engine/unlock.ts`
- Test: `src/engine/mastery.test.ts`, `src/engine/unlock.test.ts`

**Interfaces:**
- Consumes: `CurriculumIndex` de `@/content/index`; `ItemProgress`, `ProgressState`, `UnitProgress` de `@/engine/types`.
- Produces:
  - `MASTERY_TARGET = 3`, `UNIT_COMPLETION_THRESHOLD = 0.8`
  - `isMastered(progress): boolean`, `unitMasteryRatio(content, state, unitId): number`, `isUnitComplete(content, state, unitId): boolean`
  - `recomputeUnitStatuses(content, state): Record<string, UnitProgress>`, `activeUnitId(content, state): string`

- [ ] **Step 1: Escribir los tests de dominio**

Crea `src/engine/mastery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCurriculum } from '@/content/index';
import { MASTERY_TARGET, UNIT_COMPLETION_THRESHOLD, isMastered, isUnitComplete, unitMasteryRatio } from '@/engine/mastery';
import { emptyItemProgress, emptyProgressState, type ProgressState } from '@/engine/types';

const content = buildCurriculum({
  items: [1, 2, 3, 4, 5].map((n) => ({
    id: `syllable:m${n}`, kind: 'syllable' as const, text: `m${n}`,
    phonemes: ['m', 'a'], audioKey: `syllable:m${n}`,
  })),
  units: [{
    id: 'u', phase: 2 as const, title: 'U', audioKey: 'unit:u', requires: [],
    introduces: [1, 2, 3, 4, 5].map((n) => `syllable:m${n}`),
    exercises: [{ templateId: 'listen-tap' as const, weight: 1 }],
  }],
});

function stateWithMastered(count: number): ProgressState {
  const state = emptyProgressState();
  for (let n = 1; n <= count; n += 1) {
    state.items[`syllable:m${n}`] = { ...emptyItemProgress(), firstTryCorrect: MASTERY_TARGET, box: 3 };
  }
  return state;
}

describe('isMastered', () => {
  it('exige 3 aciertos al primer intento', () => {
    expect(MASTERY_TARGET).toBe(3);
    expect(isMastered({ ...emptyItemProgress(), firstTryCorrect: 2 })).toBe(false);
    expect(isMastered({ ...emptyItemProgress(), firstTryCorrect: 3 })).toBe(true);
  });

  it('no cuenta las resoluciones con ayuda', () => {
    expect(isMastered({ ...emptyItemProgress(), assisted: 9 })).toBe(false);
  });
});

describe('unitMasteryRatio', () => {
  it('es la fracción de ítems dominados', () => {
    expect(unitMasteryRatio(content, stateWithMastered(0), 'u')).toBe(0);
    expect(unitMasteryRatio(content, stateWithMastered(4), 'u')).toBeCloseTo(0.8);
    expect(unitMasteryRatio(content, stateWithMastered(5), 'u')).toBe(1);
  });

  it('una unidad sin ítems cuenta como completa, es el caso de la Fase 3', () => {
    const vacio = buildCurriculum({
      items: [],
      units: [{ id: 'v', phase: 3 as const, title: 'V', audioKey: 'unit:v', requires: [], introduces: [], exercises: [] }],
    });
    expect(unitMasteryRatio(vacio, emptyProgressState(), 'v')).toBe(1);
  });
});

describe('isUnitComplete', () => {
  it('el umbral es el 80 por ciento', () => {
    expect(UNIT_COMPLETION_THRESHOLD).toBe(0.8);
    expect(isUnitComplete(content, stateWithMastered(3), 'u')).toBe(false);
    expect(isUnitComplete(content, stateWithMastered(4), 'u')).toBe(true);
  });
});
```

- [ ] **Step 2: Escribir los tests de desbloqueo**

Crea `src/engine/unlock.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCurriculum } from '@/content/index';
import { MASTERY_TARGET } from '@/engine/mastery';
import { activeUnitId, recomputeUnitStatuses } from '@/engine/unlock';
import { emptyItemProgress, emptyProgressState, type ProgressState } from '@/engine/types';

const content = buildCurriculum({
  items: ['a', 'b', 'c'].map((s) => ({
    id: `letter:${s}`, kind: 'letter' as const, text: s, phonemes: [s],
    audioKey: `phoneme:${s}`, display: { upper: s.toUpperCase(), lower: s },
  })),
  units: [
    { id: 'u1', phase: 1 as const, title: 'U1', audioKey: 'unit:u1', requires: [], introduces: ['letter:a'], exercises: [{ templateId: 'listen-tap' as const, weight: 1 }] },
    { id: 'u2', phase: 1 as const, title: 'U2', audioKey: 'unit:u2', requires: ['u1'], introduces: ['letter:b'], exercises: [{ templateId: 'listen-tap' as const, weight: 1 }] },
    { id: 'u3', phase: 1 as const, title: 'U3', audioKey: 'unit:u3', requires: ['u2'], introduces: ['letter:c'], exercises: [{ templateId: 'listen-tap' as const, weight: 1 }] },
  ],
});

function withMastered(ids: string[]): ProgressState {
  const state = emptyProgressState();
  for (const id of ids) {
    state.items[id] = { ...emptyItemProgress(), firstTryCorrect: MASTERY_TARGET, box: 3 };
  }
  return state;
}

describe('recomputeUnitStatuses', () => {
  it('al empezar, la primera unidad está activa y las demás bloqueadas', () => {
    const statuses = recomputeUnitStatuses(content, emptyProgressState());
    expect(statuses.u1?.status).toBe('active');
    expect(statuses.u2?.status).toBe('locked');
    expect(statuses.u3?.status).toBe('locked');
  });

  it('completar una unidad activa la siguiente', () => {
    const statuses = recomputeUnitStatuses(content, withMastered(['letter:a']));
    expect(statuses.u1?.status).toBe('done');
    expect(statuses.u2?.status).toBe('active');
    expect(statuses.u3?.status).toBe('locked');
  });

  it('conserva las mejores estrellas ya obtenidas', () => {
    const state = withMastered(['letter:a']);
    state.units.u1 = { status: 'active', bestStars: 3 };
    expect(recomputeUnitStatuses(content, state).u1?.bestStars).toBe(3);
  });

  it('el progreso no retrocede: una unidad marcada done sigue done', () => {
    const state = emptyProgressState();
    state.units.u1 = { status: 'done', bestStars: 2 };
    expect(recomputeUnitStatuses(content, state).u1?.status).toBe('done');
  });
});

describe('activeUnitId', () => {
  it('devuelve la primera unidad activa en orden topológico', () => {
    expect(activeUnitId(content, emptyProgressState())).toBe('u1');
    expect(activeUnitId(content, withMastered(['letter:a']))).toBe('u2');
  });

  it('con todo completo devuelve la última unidad, para poder seguir repasando', () => {
    const todo = withMastered(['letter:a', 'letter:b', 'letter:c']);
    expect(activeUnitId(content, todo)).toBe('u3');
  });
});
```

- [ ] **Step 3: Correr y verificar que fallan**

Run: `pnpm test src/engine/mastery.test.ts src/engine/unlock.test.ts`
Expected: FAIL, no se pueden resolver los dos módulos.

- [ ] **Step 4: Implementar el dominio**

Crea `src/engine/mastery.ts`:

```ts
import type { CurriculumIndex } from '@/content/index';
import type { ItemProgress, ProgressState } from '@/engine/types';
import { emptyItemProgress } from '@/engine/types';

export const MASTERY_TARGET = 3;
export const UNIT_COMPLETION_THRESHOLD = 0.8;

export function isMastered(progress: ItemProgress): boolean {
  return progress.firstTryCorrect >= MASTERY_TARGET;
}

export function itemProgressOf(state: ProgressState, itemId: string): ItemProgress {
  return state.items[itemId] ?? emptyItemProgress();
}

export function unitMasteryRatio(content: CurriculumIndex, state: ProgressState, unitId: string): number {
  const unit = content.units.get(unitId);
  if (unit === undefined) throw new Error(`Unidad desconocida: ${unitId}`);
  if (unit.introduces.length === 0) return 1;
  const mastered = unit.introduces.filter((id) => isMastered(itemProgressOf(state, id))).length;
  return mastered / unit.introduces.length;
}

export function isUnitComplete(content: CurriculumIndex, state: ProgressState, unitId: string): boolean {
  return unitMasteryRatio(content, state, unitId) >= UNIT_COMPLETION_THRESHOLD;
}
```

- [ ] **Step 5: Implementar el desbloqueo**

Crea `src/engine/unlock.ts`:

```ts
import type { CurriculumIndex } from '@/content/index';
import { isUnitComplete } from '@/engine/mastery';
import type { ProgressState, UnitProgress, UnitStatus } from '@/engine/types';

export function recomputeUnitStatuses(
  content: CurriculumIndex,
  state: ProgressState,
): Record<string, UnitProgress> {
  const out: Record<string, UnitProgress> = {};

  for (const unitId of content.unitOrder) {
    const unit = content.units.get(unitId);
    if (unit === undefined) continue;
    const previous = state.units[unitId];
    const bestStars = previous?.bestStars ?? 0;

    // El progreso nunca retrocede: lo que ya estaba terminado sigue terminado.
    if (previous?.status === 'done') {
      out[unitId] = { status: 'done', bestStars };
      continue;
    }

    const requirementsMet = unit.requires.every((id) => out[id]?.status === 'done');
    let status: UnitStatus = 'locked';
    if (requirementsMet) {
      status = isUnitComplete(content, state, unitId) ? 'done' : 'active';
    }
    out[unitId] = { status, bestStars };
  }

  return out;
}

export function activeUnitId(content: CurriculumIndex, state: ProgressState): string {
  const statuses = recomputeUnitStatuses(content, state);
  const active = content.unitOrder.find((id) => statuses[id]?.status === 'active');
  if (active !== undefined) return active;
  const last = content.unitOrder.at(-1);
  if (last === undefined) throw new Error('El currículo no tiene unidades');
  return last;
}
```

- [ ] **Step 6: Verificar que pasan**

Run: `pnpm test src/engine && pnpm typecheck`
Expected: los 10 tests de las dos suites PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/mastery.ts src/engine/mastery.test.ts src/engine/unlock.ts src/engine/unlock.test.ts
git commit -m "feat(engine): dominio de ítems, completitud al 80 por ciento y desbloqueo de unidades

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Máquina de intentos y escalera de pistas

Convierte la tabla de pistas del spec en una máquina de estados. Recibe la plantilla y si el niño acertó, y devuelve la pista que toca mostrar o el resultado del ejercicio. Es la pieza que garantiza que nunca haya un cuarto fallo: al tercero se modela la respuesta y el ejercicio termina en acierto.

**Files:**
- Create: `src/engine/attempts.ts`
- Test: `src/engine/attempts.test.ts`

**Interfaces:**
- Consumes: `templates`, `HintStep`, `TemplateId` de `@/content/templates`; `ExerciseResolution` de `@/engine/types`.
- Produces:
  - `type AttemptState = { attempt: 1 | 2 | 3; hintsShown: 0 | 1 | 2 | 3; resolved: boolean }`
  - `type AttemptStep = { state: AttemptState; hint: HintStep | null; resolution: ExerciseResolution | null }`
  - `createAttemptState(): AttemptState`
  - `recordAttempt(templateId, state, outcome): AttemptStep`

- [ ] **Step 1: Escribir los tests**

Crea `src/engine/attempts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createAttemptState, recordAttempt } from '@/engine/attempts';

describe('primer intento', () => {
  it('acertar da crédito de dominio y no muestra pista', () => {
    const step = recordAttempt('listen-tap', createAttemptState(), 'correct');
    expect(step.resolution).toEqual({ status: 'mastery-credit' });
    expect(step.hint).toBeNull();
    expect(step.state.resolved).toBe(true);
  });

  it('fallar muestra el rung reduce y pasa al segundo intento', () => {
    const step = recordAttempt('listen-tap', createAttemptState(), 'wrong');
    expect(step.resolution).toBeNull();
    expect(step.hint?.rung).toBe('reduce');
    expect(step.state).toEqual({ attempt: 2, hintsShown: 1, resolved: false });
  });
});

describe('segundo intento', () => {
  const tras1Fallo = recordAttempt('listen-tap', createAttemptState(), 'wrong').state;

  it('acertar cuenta como correcto con una pista', () => {
    const step = recordAttempt('listen-tap', tras1Fallo, 'correct');
    expect(step.resolution).toEqual({ status: 'correct-with-hint', hintsUsed: 1 });
  });

  it('fallar muestra el rung sound y pasa al tercer intento', () => {
    const step = recordAttempt('listen-tap', tras1Fallo, 'wrong');
    expect(step.hint?.rung).toBe('sound');
    expect(step.state).toEqual({ attempt: 3, hintsShown: 2, resolved: false });
  });
});

describe('tercer intento', () => {
  const tras2Fallos = recordAttempt(
    'listen-tap',
    recordAttempt('listen-tap', createAttemptState(), 'wrong').state,
    'wrong',
  ).state;

  it('acertar cuenta como correcto con dos pistas', () => {
    const step = recordAttempt('listen-tap', tras2Fallos, 'correct');
    expect(step.resolution).toEqual({ status: 'correct-with-hint', hintsUsed: 2 });
  });

  it('fallar muestra el modelo y resuelve como asistido', () => {
    const step = recordAttempt('listen-tap', tras2Fallos, 'wrong');
    expect(step.hint?.rung).toBe('model');
    expect(step.resolution).toEqual({ status: 'assisted' });
    expect(step.state).toEqual({ attempt: 3, hintsShown: 3, resolved: true });
  });
});

describe('invariantes de la escalera', () => {
  it('nunca hay un cuarto intento: tres fallos siempre resuelven', () => {
    let state = createAttemptState();
    for (let i = 0; i < 3; i += 1) {
      const step = recordAttempt('say-it', state, 'wrong');
      state = step.state;
    }
    expect(state.resolved).toBe(true);
  });

  it('lanza si se registra un intento sobre un ejercicio ya resuelto', () => {
    const resuelto = recordAttempt('listen-tap', createAttemptState(), 'correct').state;
    expect(() => recordAttempt('listen-tap', resuelto, 'wrong')).toThrow(/resuelto/i);
  });

  it('sirve igual para las plantillas sin opciones, donde no hay nada que resaltar', () => {
    const step = recordAttempt('say-it', createAttemptState(), 'wrong');
    expect(step.hint?.action).toBe('show-mouth+replay-instruction');
  });

  it('el rung model de las plantillas de voz acepta cualquier habla', () => {
    let state = createAttemptState();
    for (let i = 0; i < 2; i += 1) state = recordAttempt('read-word', state, 'wrong').state;
    const step = recordAttempt('read-word', state, 'wrong');
    expect(step.hint?.action).toBe('play-full+accept-any-speech');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/engine/attempts.test.ts`
Expected: FAIL, no se puede resolver `@/engine/attempts`.

- [ ] **Step 3: Implementar**

Crea `src/engine/attempts.ts`:

```ts
import { templates, type HintStep, type TemplateId } from '@/content/templates';
import type { ExerciseResolution } from '@/engine/types';

export type AttemptState = { attempt: 1 | 2 | 3; hintsShown: 0 | 1 | 2 | 3; resolved: boolean };
export type AttemptOutcome = 'correct' | 'wrong';
export type AttemptStep = {
  state: AttemptState;
  hint: HintStep | null;
  resolution: ExerciseResolution | null;
};

export function createAttemptState(): AttemptState {
  return { attempt: 1, hintsShown: 0, resolved: false };
}

export function recordAttempt(
  templateId: TemplateId,
  state: AttemptState,
  outcome: AttemptOutcome,
): AttemptStep {
  if (state.resolved) {
    throw new Error('El ejercicio ya está resuelto: no se pueden registrar más intentos');
  }

  const hints = templates[templateId].hints;

  if (outcome === 'correct') {
    const resolution: ExerciseResolution =
      state.attempt === 1
        ? { status: 'mastery-credit' }
        : { status: 'correct-with-hint', hintsUsed: state.attempt === 2 ? 1 : 2 };
    return { state: { ...state, resolved: true }, hint: null, resolution };
  }

  if (state.attempt === 3) {
    const model = hints[2];
    return {
      state: { attempt: 3, hintsShown: 3, resolved: true },
      hint: model,
      resolution: { status: 'assisted' },
    };
  }

  const nextAttempt = (state.attempt + 1) as 2 | 3;
  const hint = hints[state.attempt - 1];
  if (hint === undefined) throw new Error(`La plantilla ${templateId} no define la pista ${state.attempt}`);
  return {
    state: { attempt: nextAttempt, hintsShown: state.attempt as 1 | 2, resolved: false },
    hint,
    resolution: null,
  };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/engine/attempts.test.ts`
Expected: los 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/attempts.ts src/engine/attempts.test.ts
git commit -m "feat(engine): máquina de intentos con la escalera de tres pistas

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Aplicar resultados al estado

Traduce el resultado de un ejercicio en un nuevo estado de progreso, sin mutar el anterior. Aquí vive la regla de las sesiones distintas: repetir el mismo ítem dos veces en la misma sesión no acumula dos créditos de dominio.

**Files:**
- Create: `src/engine/apply.ts`
- Test: `src/engine/apply.test.ts`

**Interfaces:**
- Consumes: `CurriculumIndex`; `promote`, `demote` de `@/engine/leitner`; `isMastered` de `@/engine/mastery`; `recomputeUnitStatuses` de `@/engine/unlock`; tipos de `@/engine/types`.
- Produces:
  - `applyPresentation(state, itemId, sessionIndex): ProgressState`
  - `applyResolution(input): ProgressState`
  - `applySessionEnd(input): ProgressState`

- [ ] **Step 1: Escribir los tests**

Crea `src/engine/apply.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCurriculum } from '@/content/index';
import { applyPresentation, applyResolution, applySessionEnd } from '@/engine/apply';
import { emptyProgressState, type ProgressState } from '@/engine/types';

const content = buildCurriculum({
  items: [
    { id: 'syllable:ma', kind: 'syllable', text: 'ma', phonemes: ['m', 'a'], audioKey: 'syllable:ma' },
    { id: 'word:mapa', kind: 'word', text: 'mapa', phonemes: ['m', 'a', 'p', 'a'], audioKey: 'word:mapa', syllables: ['ma', 'pa'] },
    { id: 'letter:m', kind: 'letter', text: 'm', phonemes: ['m'], audioKey: 'phoneme:m', display: { upper: 'M', lower: 'm' } },
  ],
  units: [{
    id: 'phase2:m', phase: 2, title: 'La m', audioKey: 'unit:phase2:m', requires: [],
    introduces: ['syllable:ma', 'word:mapa', 'letter:m'],
    exercises: [{ templateId: 'listen-tap', weight: 1 }],
  }],
});

const NOW = '2026-09-18T12:00:00.000Z';

function credit(state: ProgressState, sessionIndex: number, itemId = 'syllable:ma'): ProgressState {
  return applyResolution({
    content, state, itemId, templateId: 'listen-tap',
    resolution: { status: 'mastery-credit' }, sessionIndex, now: NOW,
  });
}

describe('applyPresentation', () => {
  it('marca el ítem como presentado sin darle dominio', () => {
    const state = applyPresentation(emptyProgressState(), 'syllable:ma', 0);
    expect(state.items['syllable:ma']?.presented).toBe(true);
    expect(state.items['syllable:ma']?.firstTryCorrect).toBe(0);
    expect(state.items['syllable:ma']?.box).toBe(0);
  });

  it('no muta el estado recibido', () => {
    const original = emptyProgressState();
    applyPresentation(original, 'syllable:ma', 0);
    expect(original.items['syllable:ma']).toBeUndefined();
  });
});

describe('applyResolution con crédito de dominio', () => {
  it('suma un acierto y sube de caja', () => {
    const state = credit(emptyProgressState(), 0);
    expect(state.items['syllable:ma']?.firstTryCorrect).toBe(1);
    expect(state.items['syllable:ma']?.box).toBe(1);
    expect(state.items['syllable:ma']?.lastCreditSession).toBe(0);
  });

  it('no suma dos créditos en la misma sesión', () => {
    const state = credit(credit(emptyProgressState(), 0), 0);
    expect(state.items['syllable:ma']?.firstTryCorrect).toBe(1);
  });

  it('suma en sesiones distintas y marca la fecha de dominio al tercero', () => {
    let state = emptyProgressState();
    state = credit(state, 0);
    state = credit(state, 1);
    expect(state.items['syllable:ma']?.masteredAt).toBeNull();
    state = credit(state, 2);
    expect(state.items['syllable:ma']?.firstTryCorrect).toBe(3);
    expect(state.items['syllable:ma']?.masteredAt).toBe(NOW);
    expect(state.items['syllable:ma']?.box).toBe(3);
  });

  it('no reescribe la fecha de dominio ya puesta', () => {
    let state = emptyProgressState();
    for (const session of [0, 1, 2]) state = credit(state, session);
    state = credit(state, 3);
    expect(state.items['syllable:ma']?.masteredAt).toBe(NOW);
  });
});

describe('applyResolution con ayuda', () => {
  it('acertar con pista baja a la caja 1 y no toca el dominio', () => {
    let state = emptyProgressState();
    for (const session of [0, 1, 2]) state = credit(state, session);
    state = applyResolution({
      content, state, itemId: 'syllable:ma', templateId: 'listen-tap',
      resolution: { status: 'correct-with-hint', hintsUsed: 1 }, sessionIndex: 3, now: NOW,
    });
    expect(state.items['syllable:ma']?.box).toBe(1);
    expect(state.items['syllable:ma']?.firstTryCorrect).toBe(3);
  });

  it('resolver con el modelo cuenta como asistido', () => {
    const state = applyResolution({
      content, state: emptyProgressState(), itemId: 'syllable:ma', templateId: 'listen-tap',
      resolution: { status: 'assisted' }, sessionIndex: 0, now: NOW,
    });
    expect(state.items['syllable:ma']?.assisted).toBe(1);
    expect(state.items['syllable:ma']?.box).toBe(1);
    expect(state.items['syllable:ma']?.firstTryCorrect).toBe(0);
  });
});

describe('contadores para los logros', () => {
  it('cuenta los trazos completados, con ayuda o sin ella', () => {
    let state = applyResolution({
      content, state: emptyProgressState(), itemId: 'letter:m', templateId: 'trace',
      resolution: { status: 'assisted' }, sessionIndex: 0, now: NOW,
    });
    state = applyResolution({
      content, state, itemId: 'letter:m', templateId: 'trace',
      resolution: { status: 'mastery-credit' }, sessionIndex: 1, now: NOW,
    });
    expect(state.counters.traces).toBe(2);
  });

  it('cuenta los aciertos de voz solo cuando no fueron asistidos', () => {
    let state = applyResolution({
      content, state: emptyProgressState(), itemId: 'syllable:ma', templateId: 'say-it',
      resolution: { status: 'mastery-credit' }, sessionIndex: 0, now: NOW,
    });
    expect(state.counters.voiceOk).toBe(1);
    state = applyResolution({
      content, state, itemId: 'syllable:ma', templateId: 'say-it',
      resolution: { status: 'assisted' }, sessionIndex: 1, now: NOW,
    });
    expect(state.counters.voiceOk).toBe(1);
  });

  it('cuenta las palabras leídas', () => {
    const state = applyResolution({
      content, state: emptyProgressState(), itemId: 'word:mapa', templateId: 'read-word',
      resolution: { status: 'correct-with-hint', hintsUsed: 1 }, sessionIndex: 0, now: NOW,
    });
    expect(state.counters.wordsRead).toBe(1);
    expect(state.counters.voiceOk).toBe(1);
  });
});

describe('applySessionEnd', () => {
  it('avanza el contador de sesiones y guarda la mejor marca', () => {
    const state = applySessionEnd({ content, state: emptyProgressState(), unitId: 'phase2:m', stars: 2 });
    expect(state.sessionCounter).toBe(1);
    expect(state.counters.sessions).toBe(1);
    expect(state.units['phase2:m']?.bestStars).toBe(2);
  });

  it('no baja la mejor marca ya conseguida', () => {
    let state = applySessionEnd({ content, state: emptyProgressState(), unitId: 'phase2:m', stars: 3 });
    state = applySessionEnd({ content, state, unitId: 'phase2:m', stars: 1 });
    expect(state.units['phase2:m']?.bestStars).toBe(3);
  });

  it('recalcula los estados de las unidades', () => {
    const state = applySessionEnd({ content, state: emptyProgressState(), unitId: 'phase2:m', stars: 1 });
    expect(state.units['phase2:m']?.status).toBe('active');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/engine/apply.test.ts`
Expected: FAIL, no se puede resolver `@/engine/apply`.

- [ ] **Step 3: Implementar**

Crea `src/engine/apply.ts`:

```ts
import type { TemplateId } from '@/content/templates';
import type { CurriculumIndex } from '@/content/index';
import { demote, promote } from '@/engine/leitner';
import { isMastered, itemProgressOf } from '@/engine/mastery';
import { recomputeUnitStatuses } from '@/engine/unlock';
import type { ExerciseResolution, ItemProgress, ProgressState, Stars } from '@/engine/types';

export function applyPresentation(
  state: ProgressState,
  itemId: string,
  sessionIndex: number,
): ProgressState {
  const current = itemProgressOf(state, itemId);
  const next: ItemProgress = { ...current, presented: true, lastSessionIndex: sessionIndex };
  return { ...state, items: { ...state.items, [itemId]: next } };
}

function bumpCounters(
  state: ProgressState,
  templateId: TemplateId,
  resolution: ExerciseResolution,
): ProgressState['counters'] {
  const counters = { ...state.counters };
  const succeeded = resolution.status !== 'assisted';

  if (templateId === 'trace') counters.traces += 1;
  if ((templateId === 'say-it' || templateId === 'read-word') && succeeded) counters.voiceOk += 1;
  if (templateId === 'read-word' && succeeded) counters.wordsRead += 1;

  return counters;
}

export function applyResolution(input: {
  content: CurriculumIndex;
  state: ProgressState;
  itemId: string;
  templateId: TemplateId;
  resolution: ExerciseResolution;
  sessionIndex: number;
  now: string;
}): ProgressState {
  const { content, state, itemId, templateId, resolution, sessionIndex, now } = input;
  if (!content.items.has(itemId)) throw new Error(`Ítem desconocido: ${itemId}`);

  const current = itemProgressOf(state, itemId);
  const next: ItemProgress = { ...current, presented: true, lastSessionIndex: sessionIndex };

  if (resolution.status === 'mastery-credit') {
    const alreadyCredited = current.lastCreditSession === sessionIndex;
    if (!alreadyCredited) {
      next.firstTryCorrect = current.firstTryCorrect + 1;
      next.lastCreditSession = sessionIndex;
      next.box = promote(current.box);
    }
  } else {
    if (resolution.status === 'assisted') next.assisted = current.assisted + 1;
    next.box = demote(current.box);
  }

  if (next.masteredAt === null && isMastered(next)) next.masteredAt = now;

  const withItem: ProgressState = {
    ...state,
    items: { ...state.items, [itemId]: next },
    counters: bumpCounters(state, templateId, resolution),
  };

  return { ...withItem, units: recomputeUnitStatuses(content, withItem) };
}

export function applySessionEnd(input: {
  content: CurriculumIndex;
  state: ProgressState;
  unitId: string;
  stars: Stars;
}): ProgressState {
  const { content, state, unitId, stars } = input;

  const withSession: ProgressState = {
    ...state,
    sessionCounter: state.sessionCounter + 1,
    counters: { ...state.counters, sessions: state.counters.sessions + 1 },
  };

  const units = recomputeUnitStatuses(content, withSession);
  const previous = units[unitId];
  if (previous !== undefined) {
    units[unitId] = {
      status: previous.status,
      bestStars: Math.max(previous.bestStars, stars) as Stars,
    };
  }

  return { ...withSession, units };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/engine/apply.test.ts && pnpm typecheck`
Expected: los 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/apply.ts src/engine/apply.test.ts
git commit -m "feat(engine): aplicar resultados al progreso con crédito una vez por sesión

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Elección de distractores

Decide qué opciones incorrectas acompañan a la correcta. Es la tarea que impide que el niño vea `b` y `d` juntas, y la que hace que los ejercicios empiecen fáciles, con formas muy distintas, y se vuelvan más finos después.

**Files:**
- Create: `src/engine/distractors.ts`
- Test: `src/engine/distractors.test.ts`

**Interfaces:**
- Consumes: `Item` de `@/content/types`; `areMirrorConfusable` de `@/content/invariants`; `Rng` de `@/engine/random`.
- Produces:
  - `LETTER_SHAPE_GROUPS`
  - `type DistractorLevel = 'easy' | 'hard'`
  - `similarity(a: Item, b: Item): 0 | 1 | 2`
  - `isForbiddenDistractor(target: Item, candidate: Item): boolean`
  - `pickDistractors(input: { target; pool; count; rng; level }): Item[]`

- [ ] **Step 1: Escribir los tests**

Crea `src/engine/distractors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isForbiddenDistractor, pickDistractors, similarity } from '@/engine/distractors';
import { createRng } from '@/engine/random';
import type { Item } from '@/content/types';

function letter(text: string): Item {
  return {
    id: `letter:${text}`, kind: 'letter', text, phonemes: [text],
    audioKey: `phoneme:${text}`, display: { upper: text.toUpperCase(), lower: text },
  };
}

function syllable(text: string): Item {
  return {
    id: `syllable:${text}`, kind: 'syllable', text,
    phonemes: [text[0] ?? '', text[1] ?? ''], audioKey: `syllable:${text}`,
  };
}

function picture(text: string, onset: string): Item {
  return {
    id: `picture:${text}`, kind: 'picture', text, phonemes: [onset],
    audioKey: `word:${text}`, imageKey: `img:${text}`, syllables: [text],
  };
}

describe('isForbiddenDistractor', () => {
  it('prohíbe las letras que se confunden en espejo', () => {
    expect(isForbiddenDistractor(letter('b'), letter('d'))).toBe(true);
    expect(isForbiddenDistractor(letter('p'), letter('q'))).toBe(true);
  });

  it('prohíbe el propio objetivo como distractor', () => {
    expect(isForbiddenDistractor(letter('a'), letter('a'))).toBe(true);
  });

  it('prohíbe una imagen con el mismo sonido inicial, porque habría dos respuestas correctas', () => {
    expect(isForbiddenDistractor(picture('oso', 'o'), picture('ojo', 'o'))).toBe(true);
    expect(isForbiddenDistractor(picture('oso', 'o'), picture('uva', 'u'))).toBe(false);
  });

  it('permite letras de formas distintas', () => {
    expect(isForbiddenDistractor(letter('m'), letter('a'))).toBe(false);
  });
});

describe('similarity', () => {
  it('las letras del mismo grupo de forma son muy parecidas', () => {
    expect(similarity(letter('a'), letter('o'))).toBe(2);
    expect(similarity(letter('a'), letter('m'))).toBe(0);
  });

  it('las sílabas que comparten consonante son más parecidas que las que comparten vocal', () => {
    expect(similarity(syllable('ma'), syllable('mo'))).toBe(2);
    expect(similarity(syllable('ma'), syllable('la'))).toBe(1);
    expect(similarity(syllable('ma'), syllable('pe'))).toBe(0);
  });
});

describe('pickDistractors', () => {
  const vocales = ['a', 'e', 'i', 'o', 'u'].map(letter);

  it('devuelve la cantidad pedida', () => {
    const out = pickDistractors({ target: letter('a'), pool: vocales, count: 2, rng: createRng(1), level: 'easy' });
    expect(out).toHaveLength(2);
  });

  it('nunca incluye el objetivo', () => {
    const out = pickDistractors({ target: letter('a'), pool: vocales, count: 4, rng: createRng(2), level: 'hard' });
    expect(out.map((i) => i.id)).not.toContain('letter:a');
  });

  it('no repite distractores', () => {
    const out = pickDistractors({ target: letter('a'), pool: vocales, count: 4, rng: createRng(3), level: 'hard' });
    expect(new Set(out.map((i) => i.id)).size).toBe(4);
  });

  it('en nivel fácil prefiere formas distintas', () => {
    const pool = [letter('o'), letter('e'), letter('m'), letter('i')];
    const out = pickDistractors({ target: letter('a'), pool, count: 2, rng: createRng(4), level: 'easy' });
    expect(out.map((i) => i.text).sort()).toEqual(['i', 'm']);
  });

  it('en nivel difícil prefiere las más parecidas', () => {
    const pool = [letter('o'), letter('e'), letter('m'), letter('i')];
    const out = pickDistractors({ target: letter('a'), pool, count: 2, rng: createRng(4), level: 'hard' });
    expect(out.map((i) => i.text).sort()).toEqual(['e', 'o']);
  });

  it('para sílabas en nivel difícil elige las que comparten consonante', () => {
    const pool = ['me', 'mi', 'la', 'pe'].map(syllable);
    const out = pickDistractors({ target: syllable('ma'), pool, count: 2, rng: createRng(5), level: 'hard' });
    expect(out.map((i) => i.text).sort()).toEqual(['me', 'mi']);
  });

  it('nunca elige un distractor prohibido aunque sea el único parecido', () => {
    const pool = [letter('d'), letter('m'), letter('i')];
    const out = pickDistractors({ target: letter('b'), pool, count: 2, rng: createRng(6), level: 'hard' });
    expect(out.map((i) => i.text)).not.toContain('d');
  });

  it('es determinista con la misma semilla', () => {
    const args = { target: letter('a'), pool: vocales, count: 2, level: 'hard' as const };
    const a = pickDistractors({ ...args, rng: createRng(9) });
    const b = pickDistractors({ ...args, rng: createRng(9) });
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });

  it('lanza si el grupo de candidatos no alcanza', () => {
    expect(() =>
      pickDistractors({ target: letter('a'), pool: [letter('a')], count: 2, rng: createRng(7), level: 'easy' }),
    ).toThrow(/suficientes/i);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/engine/distractors.test.ts`
Expected: FAIL, no se puede resolver `@/engine/distractors`.

- [ ] **Step 3: Implementar**

Crea `src/engine/distractors.ts`:

```ts
import { areMirrorConfusable, stripDiacritics } from '@/content/invariants';
import type { Item } from '@/content/types';
import type { Rng } from '@/engine/random';

/** Letras que comparten trazos y se confunden por la vista, no por el sonido. */
export const LETTER_SHAPE_GROUPS: readonly (readonly string[])[] = [
  ['a', 'e', 'o', 'c', 's'],
  ['i', 'l', 't', 'f', 'j'],
  ['m', 'n', 'u', 'h', 'r'],
  ['b', 'd', 'p', 'q', 'g'],
  ['v', 'w', 'x', 'y', 'z', 'k', 'ñ'],
];

export type DistractorLevel = 'easy' | 'hard';

function shapeGroupOf(letter: string): number {
  return LETTER_SHAPE_GROUPS.findIndex((group) => group.includes(letter));
}

export function similarity(a: Item, b: Item): 0 | 1 | 2 {
  if (a.kind === 'letter' || a.kind === 'phoneme') {
    const groupA = shapeGroupOf(stripDiacritics(a.text));
    const groupB = shapeGroupOf(stripDiacritics(b.text));
    return groupA >= 0 && groupA === groupB ? 2 : 0;
  }

  if (a.kind === 'syllable') {
    if (a.text[0] === b.text[0]) return 2;
    if (a.text[1] === b.text[1]) return 1;
    return 0;
  }

  if (a.kind === 'word') {
    if (a.syllables?.[0] === b.syllables?.[0]) return 2;
    if (a.text.length === b.text.length) return 1;
    return 0;
  }

  return 0;
}

export function isForbiddenDistractor(target: Item, candidate: Item): boolean {
  if (target.id === candidate.id || target.text === candidate.text) return true;

  if (target.text.length === 1 && candidate.text.length === 1) {
    if (areMirrorConfusable(stripDiacritics(target.text), stripDiacritics(candidate.text))) return true;
  }

  // En sonido inicial, dos opciones con el mismo sonido inicial darían dos respuestas correctas.
  if ((target.kind === 'picture' || target.kind === 'phoneme') && candidate.kind === 'picture') {
    if (target.phonemes[0] === candidate.phonemes[0]) return true;
  }

  return false;
}

export function pickDistractors(input: {
  target: Item;
  pool: readonly Item[];
  count: number;
  rng: Rng;
  level: DistractorLevel;
}): Item[] {
  const { target, pool, count, rng, level } = input;

  const allowed = pool.filter((candidate) => !isForbiddenDistractor(target, candidate));
  if (allowed.length < count) {
    throw new Error(
      `No hay suficientes distractores para ${target.id}: se piden ${count} y solo hay ${allowed.length}`,
    );
  }

  // Se mezcla primero para que los empates de similitud se resuelvan de forma determinista pero variada.
  const shuffled = rng.shuffle(allowed);
  const sorted = [...shuffled].sort((a, b) => {
    const diff = similarity(target, b) - similarity(target, a);
    return level === 'hard' ? diff : -diff;
  });

  return sorted.slice(0, count);
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/engine/distractors.test.ts`
Expected: los 14 tests PASS. Si el test de nivel fácil o difícil falla por el orden de los empates, ajusta la semilla del test, no el criterio de ordenación.

- [ ] **Step 5: Commit**

```bash
git add src/engine/distractors.ts src/engine/distractors.test.ts
git commit -m "feat(engine): distractores con reglas de espejo y dificultad graduada

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Planificador de sesión

Arma la lista de ejercicios de una sesión: presenta lo nuevo, dedica el 70 % a la unidad activa y el 30 % a repaso vencido, elige plantilla y opciones para cada ítem, evita dos ejercicios iguales seguidos y cierra con el más fácil. Todo determinista dada una semilla.

Esta tarea amplía `PlannedExercise` con `correctOptionId`, porque en el ejercicio de sonido inicial la respuesta correcta es una imagen, no el ítem del ejercicio, y la interfaz necesita saber cuál es.

**Files:**
- Create: `src/engine/planner.ts`
- Modify: `src/engine/types.ts` (añadir `correctOptionId` a `PlannedExercise`)
- Test: `src/engine/planner.test.ts`

**Interfaces:**
- Consumes: `CurriculumIndex`; `templates`; `pictures`; `createRng`; `isDue`; `itemProgressOf`; `pickDistractors`.
- Produces:
  - `MAX_PRESENTATIONS = 2`, `REVIEW_SHARE = 0.3`
  - `owningUnits(content): Map<string, string>`
  - `planSession(input: { content; state; activeUnitId; sessionLength; seed }): PlannedExercise[]`

- [ ] **Step 1: Ampliar el tipo del ejercicio planificado**

En `src/engine/types.ts`, sustituye el tipo `PlannedExercise` por este:

```ts
export type PlannedExercise = {
  /** Único dentro de la sesión. */
  id: string;
  kind: 'presentation' | 'evaluation';
  templateId: TemplateId;
  /** El ítem que se practica. En una presentación, el ítem que se enseña. */
  itemId: string;
  /** Opciones ya resueltas y mezcladas, incluida la correcta. Vacío en plantillas sin opciones. */
  optionIds: string[];
  /**
   * Cuál de las opciones es la correcta. Coincide con itemId en listen-tap,
   * pero en initial-sound la respuesta es una imagen distinta del fonema practicado.
   * Null en las plantillas sin opciones.
   */
  correctOptionId: string | null;
  source: 'active-unit' | 'review';
};
```

- [ ] **Step 2: Escribir los tests**

Crea `src/engine/planner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { curriculum } from '@/content/index';
import { templates } from '@/content/templates';
import { MAX_PRESENTATIONS, planSession } from '@/engine/planner';
import { emptyItemProgress, emptyProgressState, type ProgressState } from '@/engine/types';

function plan(state: ProgressState, unitId: string, length: 5 | 6 = 5, seed = 1) {
  return planSession({ content: curriculum, state, activeUnitId: unitId, sessionLength: length, seed });
}

/** Deja la unidad con todos sus ítems ya presentados y en caja 1. */
function presented(unitId: string, state = emptyProgressState()): ProgressState {
  const unit = curriculum.units.get(unitId);
  const next = { ...state, items: { ...state.items } };
  for (const id of unit?.introduces ?? []) {
    next.items[id] = { ...emptyItemProgress(), presented: true, box: 1, firstTryCorrect: 1, lastSessionIndex: 0 };
  }
  return next;
}

describe('longitud y presentaciones', () => {
  it('devuelve exactamente la cantidad de ejercicios pedida', () => {
    expect(plan(emptyProgressState(), 'phase1:vowel-a', 5)).toHaveLength(5);
    expect(plan(emptyProgressState(), 'phase1:vowel-a', 6)).toHaveLength(6);
  });

  it('en una unidad nueva presenta como máximo 2 ítems', () => {
    const presentaciones = plan(emptyProgressState(), 'phase2:m').filter((e) => e.kind === 'presentation');
    expect(presentaciones.length).toBeLessThanOrEqual(MAX_PRESENTATIONS);
    expect(presentaciones.length).toBeGreaterThan(0);
  });

  it('solo presenta ítems que no se han presentado antes', () => {
    const sinPresentaciones = plan(presented('phase1:vowel-a'), 'phase1:vowel-a');
    expect(sinPresentaciones.filter((e) => e.kind === 'presentation')).toHaveLength(0);
  });

  it('las presentaciones van al principio', () => {
    const sesion = plan(emptyProgressState(), 'phase2:m');
    const indices = sesion.flatMap((e, i) => (e.kind === 'presentation' ? [i] : []));
    for (const [posicion, indice] of indices.entries()) expect(indice).toBe(posicion);
  });
});

describe('mezcla de unidad activa y repaso', () => {
  it('sin nada vencido, todo sale de la unidad activa', () => {
    const sesion = plan(presented('phase1:vowel-a'), 'phase1:vowel-a');
    expect(sesion.every((e) => e.source === 'active-unit')).toBe(true);
  });

  it('con ítems vencidos de unidades anteriores, reserva alrededor del 30 por ciento', () => {
    let state = presented('phase1:vowel-a');
    state = presented('phase1:vowel-e', state);
    state = { ...state, sessionCounter: 10 };
    const sesion = plan(state, 'phase1:vowel-e', 6);
    const repaso = sesion.filter((e) => e.source === 'review');
    expect(repaso.length).toBeGreaterThanOrEqual(1);
    expect(repaso.length).toBeLessThanOrEqual(2);
  });

  it('el repaso nunca trae ítems de la unidad activa', () => {
    let state = presented('phase1:vowel-a');
    state = presented('phase1:vowel-e', state);
    state = { ...state, sessionCounter: 10 };
    const activa = curriculum.units.get('phase1:vowel-e')?.introduces ?? [];
    for (const ejercicio of plan(state, 'phase1:vowel-e', 6).filter((e) => e.source === 'review')) {
      expect(activa).not.toContain(ejercicio.itemId);
    }
  });
});

describe('determinismo', () => {
  it('la misma semilla da la misma sesión', () => {
    const a = plan(presented('phase2:m'), 'phase2:m', 6, 99);
    const b = plan(presented('phase2:m'), 'phase2:m', 6, 99);
    expect(a).toEqual(b);
  });

  it('semillas distintas producen sesiones distintas al menos alguna vez', () => {
    const firmas = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
        plan(presented('phase2:m'), 'phase2:m', 6, seed).map((e) => `${e.templateId}:${e.itemId}`).join('|'),
      ),
    );
    expect(firmas.size).toBeGreaterThan(1);
  });
});

describe('orden de los ejercicios', () => {
  it('no coloca dos veces la misma plantilla seguidas', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const sesion = plan(presented('phase2:m'), 'phase2:m', 6, seed);
      const evaluaciones = sesion.filter((e) => e.kind === 'evaluation');
      for (let i = 1; i < evaluaciones.length; i += 1) {
        expect(evaluaciones[i]?.templateId).not.toBe(evaluaciones[i - 1]?.templateId);
      }
    }
  });

  it('cierra con la evaluación más fácil de la sesión', () => {
    const sesion = plan(presented('phase2:m'), 'phase2:m', 6, 3);
    const evaluaciones = sesion.filter((e) => e.kind === 'evaluation');
    const ultima = evaluaciones.at(-1);
    const minima = Math.min(...evaluaciones.map((e) => templates[e.templateId].difficulty));
    expect(templates[ultima!.templateId].difficulty).toBe(minima);
  });

  it('cada ejercicio tiene un id único en la sesión', () => {
    const sesion = plan(presented('phase2:m'), 'phase2:m', 6);
    expect(new Set(sesion.map((e) => e.id)).size).toBe(sesion.length);
  });
});

describe('plantillas y opciones', () => {
  it('cada ejercicio usa una plantilla que acepta la clase del ítem', () => {
    for (const unitId of ['phase0:clap', 'phase1:vowel-a', 'phase2:m']) {
      for (const ejercicio of plan(presented(unitId), unitId, 6)) {
        const item = curriculum.items.get(ejercicio.itemId);
        expect(templates[ejercicio.templateId].itemKinds).toContain(item?.kind);
      }
    }
  });

  it('las plantillas con opciones traen la correcta entre ellas y sin repetidos', () => {
    for (const ejercicio of plan(presented('phase2:m'), 'phase2:m', 6)) {
      if (templates[ejercicio.templateId].options === undefined) continue;
      expect(ejercicio.correctOptionId).not.toBeNull();
      expect(ejercicio.optionIds).toContain(ejercicio.correctOptionId);
      expect(new Set(ejercicio.optionIds).size).toBe(ejercicio.optionIds.length);
    }
  });

  it('las plantillas sin opciones no traen ninguna', () => {
    for (const ejercicio of plan(presented('phase2:m'), 'phase2:m', 6)) {
      if (templates[ejercicio.templateId].options !== undefined) continue;
      expect(ejercicio.optionIds).toEqual([]);
      expect(ejercicio.correctOptionId).toBeNull();
    }
  });

  it('la cantidad de opciones respeta el rango de la plantilla', () => {
    for (const ejercicio of plan(presented('phase2:m'), 'phase2:m', 6)) {
      const rango = templates[ejercicio.templateId].options;
      if (rango === undefined) continue;
      expect(ejercicio.optionIds.length).toBeGreaterThanOrEqual(rango.min);
      expect(ejercicio.optionIds.length).toBeLessThanOrEqual(rango.max);
    }
  });

  it('usa las opciones que trae el dato cuando existen, como en rimas', () => {
    const sesion = plan(presented('phase0:rhyme'), 'phase0:rhyme', 5);
    const rima = sesion.find((e) => e.templateId === 'rhyme');
    const item = curriculum.items.get(rima?.itemId ?? '');
    expect(rima?.correctOptionId).toBe(item?.task?.answer);
    expect(rima?.optionIds.sort()).toEqual([...(item?.task?.optionIds ?? [])].sort());
  });
});
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `pnpm test src/engine/planner.test.ts`
Expected: FAIL, no se puede resolver `@/engine/planner`.

- [ ] **Step 4: Implementar el planificador**

Crea `src/engine/planner.ts`:

```ts
import type { CurriculumIndex } from '@/content/index';
import { pictures } from '@/content/pictures';
import { templates, type TemplateId } from '@/content/templates';
import type { Item, Unit } from '@/content/types';
import { pickDistractors, type DistractorLevel } from '@/engine/distractors';
import { isDue } from '@/engine/leitner';
import { itemProgressOf } from '@/engine/mastery';
import { createRng, type Rng } from '@/engine/random';
import type { PlannedExercise, ProgressState } from '@/engine/types';

export const MAX_PRESENTATIONS = 2;
export const REVIEW_SHARE = 0.3;

/** Qué unidad introduce cada ítem. */
export function owningUnits(content: CurriculumIndex): Map<string, string> {
  const out = new Map<string, string>();
  for (const unit of content.units.values()) {
    for (const itemId of unit.introduces) out.set(itemId, unit.id);
  }
  return out;
}

function templatesFor(unit: Unit, item: Item): TemplateId[] {
  return unit.exercises
    .filter((exercise) => templates[exercise.templateId].itemKinds.includes(item.kind))
    .flatMap((exercise) => Array.from({ length: exercise.weight }, () => exercise.templateId));
}

function pickTemplate(unit: Unit, item: Item, rng: Rng): TemplateId {
  const weighted = templatesFor(unit, item);
  if (weighted.length > 0) return rng.pick(weighted);

  const fallback = (Object.keys(templates) as TemplateId[]).filter((id) =>
    templates[id].itemKinds.includes(item.kind),
  );
  if (fallback.length === 0) throw new Error(`Ninguna plantilla acepta un ítem de clase ${item.kind}`);
  return rng.pick(fallback);
}

function optionPool(content: CurriculumIndex, item: Item, templateId: TemplateId): Item[] {
  if (templateId === 'initial-sound') return [...pictures];
  const kinds = templates[templateId].itemKinds;
  return [...content.items.values()].filter((candidate) => kinds.includes(candidate.kind));
}

function buildOptions(input: {
  content: CurriculumIndex;
  item: Item;
  templateId: TemplateId;
  level: DistractorLevel;
  rng: Rng;
}): { optionIds: string[]; correctOptionId: string | null } {
  const { content, item, templateId, level, rng } = input;
  const range = templates[templateId].options;
  if (range === undefined) return { optionIds: [], correctOptionId: null };

  // Las tareas orales ya traen sus opciones escritas en el dato.
  if (item.task?.optionIds !== undefined) {
    return { optionIds: rng.shuffle(item.task.optionIds), correctOptionId: item.task.answer };
  }

  const total = level === 'easy' ? range.min : range.max;

  // En sonido inicial la respuesta es una imagen que empieza por el fonema practicado.
  const correct: Item =
    templateId === 'initial-sound'
      ? rng.pick(pictures.filter((p) => p.phonemes[0] === item.phonemes[0]))
      : item;

  const distractors = pickDistractors({
    target: correct,
    pool: optionPool(content, item, templateId).filter((c) => c.id !== correct.id),
    count: total - 1,
    rng,
    level,
  });

  return {
    optionIds: rng.shuffle([correct.id, ...distractors.map((d) => d.id)]),
    correctOptionId: correct.id,
  };
}

function greedyNoAdjacent(list: PlannedExercise[], rng: Rng): PlannedExercise[] {
  const pending = rng.shuffle(list);
  const out: PlannedExercise[] = [];
  while (pending.length > 0) {
    const previous = out.at(-1)?.templateId;
    let index = pending.findIndex((e) => e.templateId !== previous);
    if (index < 0) index = 0;
    const [chosen] = pending.splice(index, 1);
    if (chosen !== undefined) out.push(chosen);
  }
  return out;
}

export function planSession(input: {
  content: CurriculumIndex;
  state: ProgressState;
  activeUnitId: string;
  sessionLength: 5 | 6;
  seed: number;
}): PlannedExercise[] {
  const { content, state, activeUnitId, sessionLength, seed } = input;
  const rng = createRng(seed);
  const unit = content.units.get(activeUnitId);
  if (unit === undefined) throw new Error(`Unidad desconocida: ${activeUnitId}`);
  const sessionIndex = state.sessionCounter;
  const owners = owningUnits(content);

  let counter = 0;
  const makeExercise = (
    itemId: string,
    kind: PlannedExercise['kind'],
    source: PlannedExercise['source'],
  ): PlannedExercise => {
    const item = content.items.get(itemId);
    if (item === undefined) throw new Error(`Ítem desconocido: ${itemId}`);
    const ownerId = owners.get(itemId) ?? activeUnitId;
    const owner = content.units.get(ownerId) ?? unit;
    const templateId = pickTemplate(owner, item, rng);
    const level: DistractorLevel = itemProgressOf(state, itemId).firstTryCorrect >= 1 ? 'hard' : 'easy';
    const { optionIds, correctOptionId } =
      kind === 'presentation'
        ? { optionIds: [], correctOptionId: null }
        : buildOptions({ content, item, templateId, level, rng });
    counter += 1;
    return { id: `ex-${counter}`, kind, templateId, itemId, optionIds, correctOptionId, source };
  };

  // 1. Presentar lo nuevo, como máximo dos ítems.
  const unpresented = unit.introduces.filter((id) => !itemProgressOf(state, id).presented);
  const toPresent = unpresented.slice(0, MAX_PRESENTATIONS);
  const presentations = toPresent.map((id) => makeExercise(id, 'presentation', 'active-unit'));

  const budget = sessionLength - presentations.length;
  if (budget <= 0) return presentations;

  // 2. Repaso vencido de otras unidades, de la caja más baja a la más alta.
  const reviewPool = [...content.items.keys()]
    .filter((id) => owners.get(id) !== activeUnitId)
    .filter((id) => isDue(itemProgressOf(state, id), sessionIndex))
    .sort((a, b) => {
      const pa = itemProgressOf(state, a);
      const pb = itemProgressOf(state, b);
      return pa.box - pb.box || pa.lastSessionIndex - pb.lastSessionIndex || a.localeCompare(b);
    });

  const reviewCount = Math.min(Math.round(REVIEW_SHARE * budget), reviewPool.length);
  const activeCount = budget - reviewCount;

  // 3. Unidad activa: los menos dominados primero, ciclando si hay más huecos que ítems.
  const availableActive = unit.introduces.filter(
    (id) => itemProgressOf(state, id).presented || toPresent.includes(id),
  );
  const activeSorted = rng
    .shuffle(availableActive)
    .sort((a, b) => itemProgressOf(state, a).firstTryCorrect - itemProgressOf(state, b).firstTryCorrect);

  const activeIds: string[] = [];
  const source = activeSorted.length > 0 ? activeSorted : reviewPool;
  for (let i = 0; i < activeCount && source.length > 0; i += 1) {
    const id = source[i % source.length];
    if (id !== undefined) activeIds.push(id);
  }

  const evaluations = [
    ...activeIds.map((id) => makeExercise(id, 'evaluation', 'active-unit')),
    ...reviewPool.slice(0, reviewCount).map((id) => makeExercise(id, 'evaluation', 'review')),
  ];

  if (evaluations.length === 0) return presentations;

  // 4. Cerrar con el más fácil y evitar dos plantillas iguales seguidas.
  const easiest = evaluations.reduce((best, current) =>
    templates[current.templateId].difficulty < templates[best.templateId].difficulty ? current : best,
  );
  const rest = evaluations.filter((e) => e.id !== easiest.id);
  const arranged = greedyNoAdjacent(rest, rng);

  if (arranged.at(-1)?.templateId === easiest.templateId) {
    const swapIndex = arranged.findIndex(
      (e, i) =>
        e.templateId !== easiest.templateId &&
        arranged[i - 1]?.templateId !== arranged.at(-1)?.templateId &&
        arranged[i + 1]?.templateId !== arranged.at(-1)?.templateId,
    );
    const last = arranged.length - 1;
    const a = arranged[swapIndex];
    const b = arranged[last];
    if (swapIndex >= 0 && a !== undefined && b !== undefined) {
      arranged[swapIndex] = b;
      arranged[last] = a;
    }
  }

  return [...presentations, ...arranged, easiest];
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test src/engine/planner.test.ts && pnpm typecheck`
Expected: los 17 tests PASS.

Si el test de "no coloca dos veces la misma plantilla seguidas" falla para alguna semilla, comprueba primero cuántas plantillas distintas admite la unidad: con una sola plantilla aplicable la adyacencia es inevitable y el test debe excluir ese caso, no el algoritmo.

- [ ] **Step 6: Commit**

```bash
git add src/engine/planner.ts src/engine/planner.test.ts src/engine/types.ts
git commit -m "feat(engine): planificador de sesión con mezcla 70/30 y cierre fácil

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Estrellas de la sesión

Convierte los resultados de los ejercicios en 1, 2 o 3 estrellas. Solo cuentan los aciertos al primer intento, y nunca la velocidad.

**Files:**
- Create: `src/engine/stars.ts`
- Test: `src/engine/stars.test.ts`

**Interfaces:**
- Consumes: `ExerciseResolution`, `Stars` de `@/engine/types`.
- Produces: `THREE_STAR_RATIO = 1`, `TWO_STAR_RATIO = 0.8`, `firstTryRatio(resolutions): number`, `starsForSession(resolutions): Stars`.

- [ ] **Step 1: Escribir los tests**

Crea `src/engine/stars.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { firstTryRatio, starsForSession } from '@/engine/stars';
import type { ExerciseResolution } from '@/engine/types';

const perfecto: ExerciseResolution = { status: 'mastery-credit' };
const conPista: ExerciseResolution = { status: 'correct-with-hint', hintsUsed: 1 };
const asistido: ExerciseResolution = { status: 'assisted' };

describe('starsForSession', () => {
  it('da 3 estrellas si todo se acertó al primer intento', () => {
    expect(starsForSession([perfecto, perfecto, perfecto, perfecto, perfecto])).toBe(3);
  });

  it('da 2 estrellas con el 80 por ciento al primer intento', () => {
    expect(starsForSession([perfecto, perfecto, perfecto, perfecto, conPista])).toBe(2);
  });

  it('da 1 estrella por completar cuando no llega al 80 por ciento', () => {
    expect(starsForSession([perfecto, conPista, asistido, asistido, asistido])).toBe(1);
  });

  it('da 1 estrella aunque no haya acertado nada al primer intento', () => {
    expect(starsForSession([asistido, asistido, asistido])).toBe(1);
  });

  it('no da estrellas si no hubo ejercicios evaluados', () => {
    expect(starsForSession([])).toBe(0);
  });

  it('no premia la velocidad: dos sesiones con los mismos resultados dan lo mismo', () => {
    const a = starsForSession([perfecto, perfecto, conPista]);
    const b = starsForSession([conPista, perfecto, perfecto]);
    expect(a).toBe(b);
  });
});

describe('firstTryRatio', () => {
  it('es la fracción de aciertos sin ayuda', () => {
    expect(firstTryRatio([perfecto, conPista])).toBe(0.5);
    expect(firstTryRatio([])).toBe(0);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/engine/stars.test.ts`
Expected: FAIL, no se puede resolver `@/engine/stars`.

- [ ] **Step 3: Implementar**

Crea `src/engine/stars.ts`:

```ts
import type { ExerciseResolution, Stars } from '@/engine/types';

export const THREE_STAR_RATIO = 1;
export const TWO_STAR_RATIO = 0.8;

export function firstTryRatio(resolutions: readonly ExerciseResolution[]): number {
  if (resolutions.length === 0) return 0;
  const firstTry = resolutions.filter((r) => r.status === 'mastery-credit').length;
  return firstTry / resolutions.length;
}

export function starsForSession(resolutions: readonly ExerciseResolution[]): Stars {
  if (resolutions.length === 0) return 0;
  const ratio = firstTryRatio(resolutions);
  if (ratio >= THREE_STAR_RATIO) return 3;
  if (ratio >= TWO_STAR_RATIO) return 2;
  return 1;
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/engine/stars.test.ts`
Expected: los 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/stars.ts src/engine/stars.test.ts
git commit -m "feat(engine): estrellas por aciertos al primer intento

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Catálogo de logros y su evaluación

Los 8 logros y los hitos de estrellas. Las estrellas son experiencia acumulada: no se gastan y nunca se pierden. Los logros desbloquean cosméticos y jamás contenido pedagógico.

**Files:**
- Create: `src/engine/rewards.ts`
- Test: `src/engine/rewards.test.ts`

**Interfaces:**
- Consumes: `CurriculumIndex`; `isMastered`, `itemProgressOf`; `ProgressState`.
- Produces:
  - `type RewardKind = 'badge' | 'background' | 'companion' | 'trail' | 'sticker' | 'trophy'`
  - `type RewardContext = { content: CurriculumIndex; state: ProgressState; totalStars: number }`
  - `type Reward = { id: string; name: string; kind: RewardKind; requirement: string; isEarned(ctx): boolean }`
  - `REWARDS: Reward[]`, `STAR_MILESTONES: number[]`
  - `totalStars(state): number`, `earnedRewardIds(ctx): string[]`, `newlyEarnedRewardIds(alreadyUnlocked, ctx): string[]`

- [ ] **Step 1: Escribir los tests**

Crea `src/engine/rewards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { curriculum } from '@/content/index';
import { MASTERY_TARGET } from '@/engine/mastery';
import { REWARDS, earnedRewardIds, newlyEarnedRewardIds, totalStars } from '@/engine/rewards';
import { emptyItemProgress, emptyProgressState, type ProgressState } from '@/engine/types';

function withMastered(ids: string[], base = emptyProgressState()): ProgressState {
  const state = { ...base, items: { ...base.items } };
  for (const id of ids) {
    state.items[id] = { ...emptyItemProgress(), firstTryCorrect: MASTERY_TARGET, box: 3, presented: true };
  }
  return state;
}

function context(state: ProgressState) {
  return { content: curriculum, state, totalStars: totalStars(state) };
}

describe('catálogo', () => {
  it('tiene los 8 logros de la primera versión más los hitos de estrellas', () => {
    const base = REWARDS.filter((r) => !r.id.startsWith('stars:'));
    expect(base).toHaveLength(8);
    expect(REWARDS.filter((r) => r.id.startsWith('stars:'))).toHaveLength(4);
  });

  it('cada logro tiene id único, nombre y requisito legible', () => {
    expect(new Set(REWARDS.map((r) => r.id)).size).toBe(REWARDS.length);
    for (const reward of REWARDS) {
      expect(reward.name.length).toBeGreaterThan(0);
      expect(reward.requirement.length).toBeGreaterThan(0);
    }
  });

  it('ningún logro desbloquea contenido, solo cosméticos y colecciones', () => {
    for (const reward of REWARDS) {
      expect(['badge', 'background', 'companion', 'trail', 'sticker', 'trophy']).toContain(reward.kind);
    }
  });
});

describe('totalStars', () => {
  it('suma la mejor marca de cada unidad', () => {
    const state = emptyProgressState();
    state.units['phase1:vowel-a'] = { status: 'done', bestStars: 3 };
    state.units['phase1:vowel-e'] = { status: 'active', bestStars: 2 };
    expect(totalStars(state)).toBe(5);
  });

  it('empieza en cero', () => {
    expect(totalStars(emptyProgressState())).toBe(0);
  });
});

describe('condiciones de los logros', () => {
  it('la primera sesión desbloquea el primer fondo', () => {
    const state = emptyProgressState();
    state.counters.sessions = 1;
    expect(earnedRewardIds(context(state))).toContain('first-session');
  });

  it('dominar la a desbloquea su pegatina', () => {
    expect(earnedRewardIds(context(withMastered(['letter:a'])))).toContain('vowel-a');
  });

  it('las cinco vocales desbloquean el compañero nuevo', () => {
    const vocales = ['a', 'e', 'o', 'i', 'u'].map((v) => `letter:${v}`);
    const earned = earnedRewardIds(context(withMastered(vocales)));
    expect(earned).toContain('five-vowels');
  });

  it('cuatro vocales todavía no bastan', () => {
    const cuatro = ['a', 'e', 'o', 'i'].map((v) => `letter:${v}`);
    expect(earnedRewardIds(context(withMastered(cuatro)))).not.toContain('five-vowels');
  });

  it('el primer acierto de voz desbloquea el rastro de estrellitas', () => {
    const state = emptyProgressState();
    state.counters.voiceOk = 1;
    expect(earnedRewardIds(context(state))).toContain('first-syllable-voice');
  });

  it('diez trazos desbloquean el fondo del espacio', () => {
    const state = emptyProgressState();
    state.counters.traces = 9;
    expect(earnedRewardIds(context(state))).not.toContain('steady-hand');
    state.counters.traces = 10;
    expect(earnedRewardIds(context(state))).toContain('steady-hand');
  });

  it('diez sesiones desbloquean el accesorio del compañero', () => {
    const state = emptyProgressState();
    state.counters.sessions = 10;
    expect(earnedRewardIds(context(state))).toContain('ten-sessions');
  });

  it('cinco palabras leídas desbloquean el rastro de burbujas', () => {
    const state = emptyProgressState();
    state.counters.wordsRead = 5;
    expect(earnedRewardIds(context(state))).toContain('word-reader');
  });

  it('terminar la Fase 2 desbloquea el trofeo', () => {
    const state = emptyProgressState();
    for (const consonante of ['m', 'l', 's', 'p']) {
      state.units[`phase2:${consonante}`] = { status: 'done', bestStars: 2 };
    }
    expect(earnedRewardIds(context(state))).toContain('phase2-done');
  });

  it('los hitos de estrellas se desbloquean por total acumulado', () => {
    const state = emptyProgressState();
    state.units.u = { status: 'done', bestStars: 3 };
    const ctx = { content: curriculum, state, totalStars: 26 };
    const earned = earnedRewardIds(ctx);
    expect(earned).toContain('stars:10');
    expect(earned).toContain('stars:25');
    expect(earned).not.toContain('stars:50');
  });
});

describe('newlyEarnedRewardIds', () => {
  it('devuelve solo lo que aún no estaba desbloqueado', () => {
    const state = emptyProgressState();
    state.counters.sessions = 1;
    state.counters.traces = 10;
    const nuevos = newlyEarnedRewardIds(['first-session'], context(state));
    expect(nuevos).toEqual(['steady-hand']);
  });

  it('devuelve vacío si no hay nada nuevo', () => {
    const state = emptyProgressState();
    state.counters.sessions = 1;
    expect(newlyEarnedRewardIds(['first-session'], context(state))).toEqual([]);
  });

  it('un logro conseguido nunca vuelve a aparecer como nuevo', () => {
    const state = emptyProgressState();
    state.counters.sessions = 20;
    const primera = newlyEarnedRewardIds([], context(state));
    const segunda = newlyEarnedRewardIds(primera, context(state));
    expect(segunda).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/engine/rewards.test.ts`
Expected: FAIL, no se puede resolver `@/engine/rewards`.

- [ ] **Step 3: Implementar**

Crea `src/engine/rewards.ts`:

```ts
import type { CurriculumIndex } from '@/content/index';
import { isMastered, itemProgressOf } from '@/engine/mastery';
import type { ProgressState } from '@/engine/types';

export type RewardKind = 'badge' | 'background' | 'companion' | 'trail' | 'sticker' | 'trophy';

export type RewardContext = {
  content: CurriculumIndex;
  state: ProgressState;
  totalStars: number;
};

export type Reward = {
  id: string;
  name: string;
  kind: RewardKind;
  /** Cómo se consigue, en texto para el adulto. */
  requirement: string;
  isEarned(ctx: RewardContext): boolean;
};

export const STAR_MILESTONES = [10, 25, 50, 100];

const VOWEL_LETTERS = ['letter:a', 'letter:e', 'letter:o', 'letter:i', 'letter:u'];
const PHASE2_UNITS = ['phase2:m', 'phase2:l', 'phase2:s', 'phase2:p'];

export function totalStars(state: ProgressState): number {
  return Object.values(state.units).reduce((sum, unit) => sum + unit.bestStars, 0);
}

const BASE_REWARDS: Reward[] = [
  {
    id: 'first-session', name: 'Pradera', kind: 'background',
    requirement: 'Completar la primera sesión.',
    isEarned: ({ state }) => state.counters.sessions >= 1,
  },
  {
    id: 'vowel-a', name: 'A de avión', kind: 'sticker',
    requirement: 'Dominar la vocal a.',
    isEarned: ({ state }) => isMastered(itemProgressOf(state, 'letter:a')),
  },
  {
    id: 'five-vowels', name: 'Compañero nuevo', kind: 'companion',
    requirement: 'Dominar las cinco vocales.',
    isEarned: ({ state }) => VOWEL_LETTERS.every((id) => isMastered(itemProgressOf(state, id))),
  },
  {
    id: 'first-syllable-voice', name: 'Estrellitas', kind: 'trail',
    requirement: 'Decir una sílaba en voz alta correctamente por primera vez.',
    isEarned: ({ state }) => state.counters.voiceOk >= 1,
  },
  {
    id: 'steady-hand', name: 'Espacio', kind: 'background',
    requirement: 'Completar 10 trazos.',
    isEarned: ({ state }) => state.counters.traces >= 10,
  },
  {
    id: 'ten-sessions', name: 'Gorra del compañero', kind: 'badge',
    requirement: 'Completar 10 sesiones, no hace falta que sean seguidas.',
    isEarned: ({ state }) => state.counters.sessions >= 10,
  },
  {
    id: 'word-reader', name: 'Burbujas', kind: 'trail',
    requirement: 'Leer 5 palabras en voz alta.',
    isEarned: ({ state }) => state.counters.wordsRead >= 5,
  },
  {
    id: 'phase2-done', name: 'Bosque y trofeo', kind: 'trophy',
    requirement: 'Completar toda la Fase 2.',
    isEarned: ({ state }) => PHASE2_UNITS.every((id) => state.units[id]?.status === 'done'),
  },
];

const MILESTONE_REWARDS: Reward[] = STAR_MILESTONES.map((threshold) => ({
  id: `stars:${threshold}`,
  name: `Pegatina de ${threshold} estrellas`,
  kind: 'sticker' as const,
  requirement: `Acumular ${threshold} estrellas.`,
  isEarned: ({ totalStars: stars }: RewardContext) => stars >= threshold,
}));

export const REWARDS: Reward[] = [...BASE_REWARDS, ...MILESTONE_REWARDS];

export function earnedRewardIds(ctx: RewardContext): string[] {
  return REWARDS.filter((reward) => reward.isEarned(ctx)).map((reward) => reward.id);
}

export function newlyEarnedRewardIds(alreadyUnlocked: readonly string[], ctx: RewardContext): string[] {
  const known = new Set(alreadyUnlocked);
  return earnedRewardIds(ctx).filter((id) => !known.has(id));
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/engine/rewards.test.ts && pnpm typecheck`
Expected: los 17 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rewards.ts src/engine/rewards.test.ts
git commit -m "feat(engine): catálogo de logros y evaluación por contadores y estrellas

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: API pública del motor y test de integración de sesiones

Reexporta lo que la interfaz va a consumir y añade el test que más valor tiene de todo el plan: simular a un niño jugando muchas sesiones seguidas y comprobar que progresa, desbloquea unidades, gana estrellas y logros, y que nada retrocede.

**Files:**
- Create: `src/engine/index.ts`
- Test: `src/engine/session.integration.test.ts`

**Interfaces:**
- Consumes: todos los módulos de `engine/`.
- Produces: `@/engine` como único punto de importación para la interfaz.

- [ ] **Step 1: Escribir el barril**

Crea `src/engine/index.ts`:

```ts
export { applyPresentation, applyResolution, applySessionEnd } from '@/engine/apply';
export { createAttemptState, recordAttempt } from '@/engine/attempts';
export type { AttemptOutcome, AttemptState, AttemptStep } from '@/engine/attempts';
export { LETTER_SHAPE_GROUPS, pickDistractors, similarity } from '@/engine/distractors';
export type { DistractorLevel } from '@/engine/distractors';
export { BOX_INTERVALS, demote, isDue, promote, sessionsUntilDue } from '@/engine/leitner';
export {
  MASTERY_TARGET, UNIT_COMPLETION_THRESHOLD,
  isMastered, isUnitComplete, itemProgressOf, unitMasteryRatio,
} from '@/engine/mastery';
export { MAX_PRESENTATIONS, REVIEW_SHARE, owningUnits, planSession } from '@/engine/planner';
export { createRng } from '@/engine/random';
export type { Rng } from '@/engine/random';
export {
  REWARDS, STAR_MILESTONES, earnedRewardIds, newlyEarnedRewardIds, totalStars,
} from '@/engine/rewards';
export type { Reward, RewardContext, RewardKind } from '@/engine/rewards';
export { firstTryRatio, starsForSession } from '@/engine/stars';
export { emptyItemProgress, emptyProgressState } from '@/engine/types';
export type {
  Box, Counters, ExerciseResolution, ItemProgress, PlannedExercise,
  ProgressState, Stars, UnitProgress, UnitStatus,
} from '@/engine/types';
export { activeUnitId, recomputeUnitStatuses } from '@/engine/unlock';
```

- [ ] **Step 2: Escribir el test de integración**

Crea `src/engine/session.integration.test.ts`. La función `playSession` simula una sesión completa: planifica, resuelve cada ejercicio según el perfil del niño, aplica todo y cierra.

```ts
import { describe, expect, it } from 'vitest';
import { curriculum } from '@/content/index';
import { templates } from '@/content/templates';
import {
  activeUnitId, applyPresentation, applyResolution, applySessionEnd,
  createAttemptState, earnedRewardIds, planSession, recordAttempt,
  starsForSession, totalStars, emptyProgressState,
  type ExerciseResolution, type ProgressState,
} from '@/engine';

type Perfil = 'siempre-acierta' | 'falla-una-vez' | 'siempre-falla';

const NOW = '2026-09-18T12:00:00.000Z';

/** Resuelve un ejercicio recorriendo la escalera de pistas según el perfil. */
function resolveExercise(templateId: Parameters<typeof recordAttempt>[0], perfil: Perfil): ExerciseResolution {
  let state = createAttemptState();
  let intentos = 0;
  for (;;) {
    intentos += 1;
    const acierta =
      perfil === 'siempre-acierta' ||
      (perfil === 'falla-una-vez' && intentos >= 2);
    const step = recordAttempt(templateId, state, acierta ? 'correct' : 'wrong');
    if (step.resolution !== null) return step.resolution;
    state = step.state;
  }
}

function playSession(state: ProgressState, perfil: Perfil, seed: number): ProgressState {
  const unitId = activeUnitId(curriculum, state);
  const plan = planSession({
    content: curriculum, state, activeUnitId: unitId, sessionLength: 6, seed,
  });

  let next = state;
  const resolutions: ExerciseResolution[] = [];

  for (const exercise of plan) {
    if (exercise.kind === 'presentation') {
      next = applyPresentation(next, exercise.itemId, next.sessionCounter);
      continue;
    }
    const resolution = resolveExercise(exercise.templateId, perfil);
    resolutions.push(resolution);
    next = applyResolution({
      content: curriculum, state: next, itemId: exercise.itemId,
      templateId: exercise.templateId, resolution,
      sessionIndex: next.sessionCounter, now: NOW,
    });
  }

  return applySessionEnd({
    content: curriculum, state: next, unitId, stars: starsForSession(resolutions),
  });
}

describe('un niño que siempre acierta', () => {
  it('avanza de unidad y acumula estrellas', () => {
    let state = emptyProgressState();
    const primeraUnidad = activeUnitId(curriculum, state);
    for (let i = 0; i < 20; i += 1) state = playSession(state, 'siempre-acierta', i + 1);

    expect(state.sessionCounter).toBe(20);
    expect(activeUnitId(curriculum, state)).not.toBe(primeraUnidad);
    expect(totalStars(state)).toBeGreaterThan(0);
    expect(Object.values(state.units).some((u) => u.status === 'done')).toBe(true);
  });

  it('desbloquea los primeros logros', () => {
    let state = emptyProgressState();
    for (let i = 0; i < 12; i += 1) state = playSession(state, 'siempre-acierta', i + 1);
    const earned = earnedRewardIds({ content: curriculum, state, totalStars: totalStars(state) });
    expect(earned).toContain('first-session');
    expect(earned).toContain('ten-sessions');
  });

  it('nunca pierde una unidad ya terminada', () => {
    let state = emptyProgressState();
    const terminadas = new Set<string>();
    for (let i = 0; i < 25; i += 1) {
      state = playSession(state, 'siempre-acierta', i + 1);
      for (const [id, unit] of Object.entries(state.units)) {
        if (unit.status === 'done') terminadas.add(id);
      }
      for (const id of terminadas) expect(state.units[id]?.status).toBe('done');
    }
  });

  it('las mejores estrellas nunca bajan', () => {
    let state = emptyProgressState();
    let anterior = 0;
    for (let i = 0; i < 15; i += 1) {
      state = playSession(state, 'siempre-acierta', i + 1);
      const actual = totalStars(state);
      expect(actual).toBeGreaterThanOrEqual(anterior);
      anterior = actual;
    }
  });
});

describe('un niño que necesita una pista', () => {
  it('también progresa, más despacio', () => {
    let conPistas = emptyProgressState();
    let perfecto = emptyProgressState();
    for (let i = 0; i < 15; i += 1) {
      conPistas = playSession(conPistas, 'falla-una-vez', i + 1);
      perfecto = playSession(perfecto, 'siempre-acierta', i + 1);
    }
    expect(totalStars(conPistas)).toBeLessThan(totalStars(perfecto));
    expect(conPistas.sessionCounter).toBe(15);
  });
});

describe('un niño que falla todo', () => {
  it('termina todas las sesiones sin quedarse atascado ni perder nada', () => {
    let state = emptyProgressState();
    for (let i = 0; i < 15; i += 1) state = playSession(state, 'siempre-falla', i + 1);

    expect(state.sessionCounter).toBe(15);
    expect(state.counters.sessions).toBe(15);
    // Una estrella por sesión completada, nunca cero ni negativo.
    expect(totalStars(state)).toBeGreaterThanOrEqual(1);
    for (const progress of Object.values(state.items)) {
      expect(progress.firstTryCorrect).toBeGreaterThanOrEqual(0);
      expect(progress.box).toBeGreaterThanOrEqual(0);
    }
  });

  it('se queda en la primera unidad, que es lo correcto: no avanza sin dominar', () => {
    let state = emptyProgressState();
    const primera = activeUnitId(curriculum, state);
    for (let i = 0; i < 15; i += 1) state = playSession(state, 'siempre-falla', i + 1);
    expect(activeUnitId(curriculum, state)).toBe(primera);
  });
});

describe('invariantes de toda sesión', () => {
  it('todos los ejercicios son coherentes en las tres fases', () => {
    let state = emptyProgressState();
    for (let i = 0; i < 40; i += 1) {
      const unitId = activeUnitId(curriculum, state);
      const plan = planSession({
        content: curriculum, state, activeUnitId: unitId, sessionLength: 6, seed: i + 1,
      });
      expect(plan).toHaveLength(6);
      for (const exercise of plan) {
        const item = curriculum.items.get(exercise.itemId);
        expect(item).toBeDefined();
        expect(templates[exercise.templateId].itemKinds).toContain(item?.kind);
        if (exercise.correctOptionId !== null) {
          expect(exercise.optionIds).toContain(exercise.correctOptionId);
        }
      }
      state = playSession(state, 'siempre-acierta', i + 1);
    }
  });
});
```

- [ ] **Step 3: Correr el test de integración**

Run: `pnpm test src/engine/session.integration.test.ts`
Expected: los 9 tests PASS.

Este test es el que descubre los problemas reales de integración. Si falla, lee el mensaje antes de tocar nada: casi siempre señala un desajuste entre el planificador y los datos, no un error del test.

- [ ] **Step 4: Verificar toda la suite**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
git add src/engine/index.ts src/engine/session.integration.test.ts
git commit -m "feat(engine): API pública y test de integración de sesiones completas

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 21: Esquema del estado persistido y migraciones

Define el documento único que se guarda en el dispositivo, lo valida con Zod y prepara el camino de migraciones. Si el documento está corrupto se detecta aquí, no cuando la interfaz ya lo está usando.

**Files:**
- Create: `src/store/schema.ts`
- Test: `src/store/schema.test.ts`

**Interfaces:**
- Consumes: tipos de `@/engine/types`.
- Produces:
  - `CURRENT_VERSION = 1`
  - `type Settings`, `type SessionRecord`, `type RewardState`, `type PersistedState`
  - `persistedStateSchema`, `settingsSchema`
  - `emptyPersistedState(): PersistedState`
  - `migrate(raw: unknown): { state: PersistedState; recovered: boolean }`

- [ ] **Step 1: Escribir los tests**

Crea `src/store/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, emptyPersistedState, migrate, persistedStateSchema } from '@/store/schema';

describe('estado vacío', () => {
  it('valida contra el esquema', () => {
    expect(persistedStateSchema.safeParse(emptyPersistedState()).success).toBe(true);
  });

  it('empieza con los ajustes por omisión del spec', () => {
    const state = emptyPersistedState();
    expect(state.version).toBe(CURRENT_VERSION);
    expect(state.settings.accent).toBe('neutro');
    expect(state.settings.lowercaseTracing).toBe(false);
    expect(state.settings.sessionLength).toBe(5);
    expect(state.settings.speechMode).toBe('parent');
    expect(state.settings.reducedCelebrations).toBe(false);
  });

  it('empieza sin progreso, sin sesiones y sin premios', () => {
    const state = emptyPersistedState();
    expect(state.items).toEqual({});
    expect(state.sessions).toEqual([]);
    expect(state.rewards.unlockedAt).toEqual({});
    expect(state.rewards.equipped).toEqual({ background: null, companion: null, trail: null });
  });
});

describe('esquema', () => {
  it('rechaza un acento desconocido', () => {
    const state = emptyPersistedState();
    const roto = { ...state, settings: { ...state.settings, accent: 'ru' } };
    expect(persistedStateSchema.safeParse(roto).success).toBe(false);
  });

  it('rechaza una longitud de sesión fuera de 5 o 6', () => {
    const state = emptyPersistedState();
    const roto = { ...state, settings: { ...state.settings, sessionLength: 9 } };
    expect(persistedStateSchema.safeParse(roto).success).toBe(false);
  });

  it('rechaza estrellas fuera de 0 a 3', () => {
    const state = emptyPersistedState();
    const roto = { ...state, units: { u: { status: 'done', bestStars: 7 } } };
    expect(persistedStateSchema.safeParse(roto).success).toBe(false);
  });

  it('acepta un documento con progreso real', () => {
    const state = emptyPersistedState();
    state.items['letter:a'] = {
      box: 2, presented: true, firstTryCorrect: 2, assisted: 1,
      lastSessionIndex: 4, lastCreditSession: 4, masteredAt: null,
    };
    state.units['phase1:vowel-a'] = { status: 'active', bestStars: 2 };
    state.sessions.push({ index: 0, unitId: 'phase1:vowel-a', stars: 2, endedAt: '2026-09-18T12:00:00.000Z' });
    expect(persistedStateSchema.safeParse(state).success).toBe(true);
  });
});

describe('migrate', () => {
  it('devuelve el documento tal cual si es válido y de la versión actual', () => {
    const state = emptyPersistedState();
    const result = migrate(state);
    expect(result.recovered).toBe(false);
    expect(result.state.version).toBe(CURRENT_VERSION);
  });

  it('recupera con estado vacío si el documento es basura', () => {
    for (const basura of [null, undefined, 42, 'hola', {}, { version: 1 }]) {
      const result = migrate(basura);
      expect(result.recovered).toBe(true);
      expect(result.state).toEqual(emptyPersistedState());
    }
  });

  it('recupera si la versión es más nueva de lo que esta app entiende', () => {
    const futuro = { ...emptyPersistedState(), version: 99 };
    expect(migrate(futuro).recovered).toBe(true);
  });

  it('conserva el progreso de un documento válido', () => {
    const state = emptyPersistedState();
    state.units['phase1:vowel-a'] = { status: 'done', bestStars: 3 };
    expect(migrate(state).state.units['phase1:vowel-a']?.bestStars).toBe(3);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/store/schema.test.ts`
Expected: FAIL, no se puede resolver `@/store/schema`.

- [ ] **Step 3: Implementar**

Crea `src/store/schema.ts`:

```ts
import { z } from 'zod';
import { emptyProgressState } from '@/engine/types';

export const CURRENT_VERSION = 1;

const starsSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const settingsSchema = z.object({
  accent: z.enum(['do', 'mx', 'neutro']),
  lowercaseTracing: z.boolean(),
  sessionLength: z.union([z.literal(5), z.literal(6)]),
  speechMode: z.enum(['auto', 'parent']),
  reducedCelebrations: z.boolean(),
  childName: z.string().nullable(),
  pinHash: z.string().nullable(),
});
export type Settings = z.infer<typeof settingsSchema>;

const itemProgressSchema = z.object({
  box: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  presented: z.boolean(),
  firstTryCorrect: z.number().int().min(0),
  assisted: z.number().int().min(0),
  lastSessionIndex: z.number().int(),
  lastCreditSession: z.number().int().nullable(),
  masteredAt: z.string().nullable(),
});

const unitProgressSchema = z.object({
  status: z.enum(['locked', 'active', 'done']),
  bestStars: starsSchema,
});

export const sessionRecordSchema = z.object({
  index: z.number().int().min(0),
  unitId: z.string().min(1),
  stars: starsSchema,
  endedAt: z.string().min(1),
});
export type SessionRecord = z.infer<typeof sessionRecordSchema>;

export const rewardStateSchema = z.object({
  unlockedAt: z.record(z.string(), z.string()),
  equipped: z.object({
    background: z.string().nullable(),
    companion: z.string().nullable(),
    trail: z.string().nullable(),
  }),
});
export type RewardState = z.infer<typeof rewardStateSchema>;

export const persistedStateSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  settings: settingsSchema,
  items: z.record(z.string(), itemProgressSchema),
  units: z.record(z.string(), unitProgressSchema),
  sessionCounter: z.number().int().min(0),
  counters: z.object({
    traces: z.number().int().min(0),
    sessions: z.number().int().min(0),
    voiceOk: z.number().int().min(0),
    wordsRead: z.number().int().min(0),
  }),
  sessions: z.array(sessionRecordSchema),
  rewards: rewardStateSchema,
});
export type PersistedState = z.infer<typeof persistedStateSchema>;

export function emptyPersistedState(): PersistedState {
  return {
    version: CURRENT_VERSION,
    settings: {
      accent: 'neutro',
      lowercaseTracing: false,
      sessionLength: 5,
      // Hasta que existan Azure y la API del navegador, el adulto es el evaluador real.
      speechMode: 'parent',
      reducedCelebrations: false,
      childName: null,
      pinHash: null,
    },
    ...emptyProgressState(),
    sessions: [],
    rewards: { unlockedAt: {}, equipped: { background: null, companion: null, trail: null } },
  };
}

/**
 * Lleva cualquier documento leído del disco a la versión actual.
 * Si no se puede, devuelve un estado vacío y avisa con recovered en true,
 * para que la interfaz pueda ofrecer restaurar desde una exportación.
 */
export function migrate(raw: unknown): { state: PersistedState; recovered: boolean } {
  const parsed = persistedStateSchema.safeParse(raw);
  if (parsed.success) return { state: parsed.data, recovered: false };

  // Punto de extensión: cuando exista la versión 2, aquí se transformará una v1 en v2
  // antes de volver a validar. Mientras solo hay una versión, cualquier fallo se recupera.
  return { state: emptyPersistedState(), recovered: true };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test src/store/schema.test.ts && pnpm typecheck`
Expected: los 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/schema.ts src/store/schema.test.ts
git commit -m "feat(store): esquema del estado persistido con recuperación ante corrupción

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 22: Persistencia local con adaptador inyectable

Carga y guarda el documento en el dispositivo. El adaptador se inyecta para que los tests corran sin IndexedDB y para poder cambiar a la nube más adelante sin tocar el resto. Incluye exportar e importar el progreso en JSON, que es la forma de pasar de un dispositivo a otro sin cuentas.

**Files:**
- Create: `src/store/persist.ts`
- Test: `src/store/persist.test.ts`

**Interfaces:**
- Consumes: `persistedStateSchema`, `emptyPersistedState`, `migrate` de `@/store/schema`; `idb-keyval`.
- Produces:
  - `STORAGE_KEY = 'silabin.state.v1'`
  - `type StorageAdapter = { read(): Promise<unknown>; write(value: unknown): Promise<void>; clear(): Promise<void> }`
  - `createMemoryAdapter(initial?): StorageAdapter`, `createIdbAdapter(): StorageAdapter`
  - `loadState(adapter): Promise<{ state: PersistedState; recovered: boolean }>`
  - `saveState(adapter, state): Promise<void>`
  - `exportState(state): string`, `importState(json: string): { state; recovered }`

- [ ] **Step 1: Escribir los tests**

Crea `src/store/persist.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { emptyPersistedState } from '@/store/schema';
import {
  createMemoryAdapter, exportState, importState, loadState, saveState,
  type StorageAdapter,
} from '@/store/persist';

describe('loadState', () => {
  it('devuelve el estado vacío cuando no hay nada guardado', async () => {
    const { state, recovered } = await loadState(createMemoryAdapter());
    expect(state).toEqual(emptyPersistedState());
    expect(recovered).toBe(false);
  });

  it('devuelve lo guardado si es válido', async () => {
    const guardado = emptyPersistedState();
    guardado.units['phase1:vowel-a'] = { status: 'done', bestStars: 3 };
    const { state, recovered } = await loadState(createMemoryAdapter(guardado));
    expect(state.units['phase1:vowel-a']?.bestStars).toBe(3);
    expect(recovered).toBe(false);
  });

  it('recupera con estado vacío si lo guardado está corrupto', async () => {
    const { state, recovered } = await loadState(createMemoryAdapter({ version: 1, basura: true }));
    expect(state).toEqual(emptyPersistedState());
    expect(recovered).toBe(true);
  });

  it('recupera si el almacenamiento lanza, como en una ventana privada', async () => {
    const roto: StorageAdapter = {
      read: () => Promise.reject(new Error('sin acceso')),
      write: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    };
    const { state, recovered } = await loadState(roto);
    expect(state).toEqual(emptyPersistedState());
    expect(recovered).toBe(true);
  });
});

describe('saveState', () => {
  it('guarda y vuelve a leer sin perder nada', async () => {
    const adapter = createMemoryAdapter();
    const state = emptyPersistedState();
    state.counters.sessions = 4;
    state.sessions.push({ index: 0, unitId: 'phase1:vowel-a', stars: 2, endedAt: '2026-09-18T12:00:00.000Z' });
    await saveState(adapter, state);
    const leido = await loadState(adapter);
    expect(leido.state).toEqual(state);
  });

  it('se niega a guardar un documento inválido', async () => {
    const adapter = createMemoryAdapter();
    const roto = { ...emptyPersistedState(), sessionCounter: -5 };
    await expect(saveState(adapter, roto)).rejects.toThrow(/inválido/i);
  });

  it('no propaga el error si el almacenamiento falla al escribir', async () => {
    const soloLectura: StorageAdapter = {
      read: () => Promise.resolve(null),
      write: () => Promise.reject(new Error('cuota agotada')),
      clear: () => Promise.resolve(),
    };
    await expect(saveState(soloLectura, emptyPersistedState())).resolves.toBeUndefined();
  });
});

describe('exportar e importar', () => {
  it('un ciclo completo conserva el progreso', () => {
    const state = emptyPersistedState();
    state.units['phase2:m'] = { status: 'done', bestStars: 3 };
    state.rewards.unlockedAt['first-session'] = '2026-09-18T12:00:00.000Z';
    const { state: vuelta, recovered } = importState(exportState(state));
    expect(recovered).toBe(false);
    expect(vuelta).toEqual(state);
  });

  it('exporta JSON legible por una persona', () => {
    expect(exportState(emptyPersistedState())).toContain('\n');
  });

  it('importar basura recupera con estado vacío en vez de lanzar', () => {
    expect(importState('esto no es json').recovered).toBe(true);
    expect(importState('{"version":1}').recovered).toBe(true);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm test src/store/persist.test.ts`
Expected: FAIL, no se puede resolver `@/store/persist`.

- [ ] **Step 3: Implementar**

Crea `src/store/persist.ts`:

```ts
import { get, set, del } from 'idb-keyval';
import {
  emptyPersistedState, migrate, persistedStateSchema, type PersistedState,
} from '@/store/schema';

export const STORAGE_KEY = 'silabin.state.v1';

export type StorageAdapter = {
  read(): Promise<unknown>;
  write(value: unknown): Promise<void>;
  clear(): Promise<void>;
};

/** Adaptador en memoria para los tests y para cuando el navegador no deja guardar. */
export function createMemoryAdapter(initial: unknown = null): StorageAdapter {
  let value = initial;
  return {
    read: () => Promise.resolve(value),
    write: (next) => {
      value = next;
      return Promise.resolve();
    },
    clear: () => {
      value = null;
      return Promise.resolve();
    },
  };
}

export function createIdbAdapter(): StorageAdapter {
  return {
    read: () => get(STORAGE_KEY),
    write: (value) => set(STORAGE_KEY, value),
    clear: () => del(STORAGE_KEY),
  };
}

export async function loadState(
  adapter: StorageAdapter,
): Promise<{ state: PersistedState; recovered: boolean }> {
  let raw: unknown;
  try {
    raw = await adapter.read();
  } catch {
    // Ventana privada, almacenamiento bloqueado o base de datos inaccesible.
    return { state: emptyPersistedState(), recovered: true };
  }

  if (raw === null || raw === undefined) return { state: emptyPersistedState(), recovered: false };
  return migrate(raw);
}

export async function saveState(adapter: StorageAdapter, state: unknown): Promise<void> {
  const parsed = persistedStateSchema.safeParse(state);
  if (!parsed.success) {
    throw new Error(`No se guarda un documento inválido: ${parsed.error.issues[0]?.message ?? 'desconocido'}`);
  }

  try {
    await adapter.write(parsed.data);
  } catch {
    // Quedarse sin cuota o sin permiso no debe tumbar la sesión de juego en curso.
  }
}

export function exportState(state: PersistedState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): { state: PersistedState; recovered: boolean } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { state: emptyPersistedState(), recovered: true };
  }
  return migrate(raw);
}
```

- [ ] **Step 4: Verificar toda la suite**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo verde. Con esto el núcleo está completo: contenido validado, motor con TDD y persistencia.

- [ ] **Step 5: Commit**

```bash
git add src/store/persist.ts src/store/persist.test.ts
git commit -m "feat(store): persistencia con adaptador inyectable, exportar e importar

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Qué queda listo al terminar este plan

- El currículo de las fases 0, 1 y 2 como datos validados, con las unidades de Fase 3 dibujando el camino futuro.
- Un motor que decide qué practicar, qué pista dar, cuándo se domina un ítem, cuándo se desbloquea una unidad, cuántas estrellas se ganan y qué logro se consigue.
- Persistencia local con recuperación ante corrupción y traspaso entre dispositivos por JSON.
- Una suite de pruebas que simula 40 sesiones seguidas de tres perfiles de niño distintos.
- Ninguna interfaz. Nada que un niño pueda tocar todavía.

Un hueco deliberado: `applySessionEnd` actualiza contadores y mejores marcas, pero no añade nada al historial `sessions` del documento persistido, porque ese campo vive en `PersistedState` y no en el `ProgressState` del motor. Añadir el registro de cada sesión terminada es trabajo del Plan 2, que es donde se une el motor con el almacenamiento.

## Hoja de ruta de los planes siguientes

Cada uno se escribe con la skill `writing-plans` cuando llegue su turno, a partir del mismo spec.

| Plan | Contenido | Resultado visible |
|---|---|---|
| 2 | Capa de audio con locuciones, estado con Zustand, pantalla de sesión, mapa, y la plantilla `listen-tap` de punta a punta | El niño ya puede jugar una sesión real |
| 3 | Las otras plantillas de toque: `count-syllables`, `rhyme`, `initial-sound`, y `build` | Las fases 0 y 2 jugables casi completas |
| 4 | `trace`: lienzo, eventos táctiles, puntuación con tolerancia y los 3 niveles de guía | Escribir letras con el dedo |
| 5 | Voz: captura con micrófono, detección de habla, evaluador `parent` pulido, `say-it` y `read-word` | Leer en voz alta con validación |
| 6 | Recompensas y cosméticos, panel de padres con PIN, PWA instalable y service worker | App completa de la primera versión |
| Después | Spike de Azure, generación de los audios en los 3 acentos, evaluador `browser` | Validación automática de pronunciación |

## Revisión del plan contra el spec

Cobertura verificada sección por sección:

- **§2 Principios pedagógicos**: en Global Constraints, y cada uno con su test. El orden de letras en las tareas 7 y 8, la regla de espejo en la 16, las pistas en la 14, el dominio y el 80 % en la 13, sin castigos en la 18 y en el test de integración de la 20.
- **§3 Arquitectura**: las capas `content/`, `engine/` y `store/` en las tareas 2 a 22. Las capas `speech/`, `audio/`, `features/` y `components/` quedan para los planes 2 a 6.
- **§4 Modelo de contenido**: tareas 2 a 10, incluidos los cuatro invariantes de palabra y las 8 plantillas con sus 3 rungs.
- **§5 Motor de sesión**: tareas 11 a 20.
- **§6 Capa de voz**: fuera de este plan. El ajuste `speechMode` arranca en `parent`, como exige el spec.
- **§7 Recompensas**: la lógica en la tarea 19; la galería y los cosméticos en el Plan 6.
- **§8 Padres, datos y offline**: el esquema, las migraciones, la recuperación y el traspaso por JSON en las tareas 21 y 22; el panel con PIN en el Plan 6.
- **§9 Experiencia de usuario**: fuera de este plan.
- **§10 Pruebas**: cubierto para `content/`, `engine/` y `store/`. La puerta `SILABIN_CHECK_AUDIO_FILES` está en la tarea 9.
- **§11 Riesgos**: el riesgo 1, Azure, queda aislado detrás de la interfaz del Plan 5. Los demás son de interfaz.
- **§12 Escalabilidad**: las fases 3 y siguientes son datos, tarea 10. El adaptador de almacenamiento de la tarea 22 abre la puerta a la nube sin tocar el motor.

Tres desviaciones conscientes del spec, todas documentadas arriba en "Refinamientos": los campos `presented`, `lastCreditSession` y `counters`, y la clase de ítem `picture`.
