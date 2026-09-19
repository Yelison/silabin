# Silabín: diseño aprobado

Fecha: 2026-09-18. Estado: aprobado por el autor del proyecto; pendiente de plan de implementación.

## 1. Contexto y objetivo

Aplicación web para que un niño de **3-4 años que aún no conoce letras** aprenda a leer en español desde cero. Uso principal en **iPad/iPhone** vía Safari, pero debe funcionar en cualquier navegador moderno (Android, PC). Estilo lúdico tipo Duolingo, con sesiones cortas, validación por voz, pistas escalonadas, estrellas y logros canjeables por cosméticos.

El adulto siempre acompaña al niño: la app está diseñada para juego compartido, no para uso autónomo.

Base pedagógica y técnica: `docs/research/pedagogia-lectura-inicial.md` y `docs/research/reconocimiento-voz-infantil.md`.

### Objetivos de la primera versión

1. Conciencia fonológica oral (Fase 0) sin ningún texto en pantalla.
2. Las 5 vocales: sonido, reconocimiento de mayúscula y minúscula, trazo, pronunciación.
3. Sílabas CV con m, l, s, p (20 sílabas) y primeras palabras CV-CV con solo esas letras.
4. Motor de sesión con pistas escalonadas, dominio por ítem y repaso espaciado.
5. Validación por voz con confirmación del adulto y API del navegador; Azure como mejora posterior.
6. Estrellas, logros y cosméticos.
7. Panel de padres con PIN.
8. PWA instalable, funciona sin internet salvo la evaluación de voz en nube.

### Fuera de alcance (primera versión)

Cuentas de usuario y sincronización en nube; varios niños por dispositivo; fases 3 en adelante (t, n, d, r…, VC, CVC, CCV, frases); grabar la voz propia de los padres; modelos de voz en el dispositivo; tienda o monedas; rankings.

## 2. Principios pedagógicos (no negociables en el código)

Derivados de la investigación en `docs/research/`:

- **Sonido, no nombre.** La letra m se presenta como "mmm", nunca "eme". Las locuciones lo respetan.
- **Sílaba como unidad de lectura.** Tras cada consonante nueva se leen de inmediato sus 5 sílabas y palabras CV-CV formadas solo con letras ya dominadas.
- **Orden de letras.** Vocales a, e, o, i, u. Consonantes m, l, s, p (v1); después t, n, d, r suave, f, ñ, c (ca/co/cu), b, j, v, g (ga/go/gu), ll/y, ch, z, qu, h, rr, gue/gui, ce/ci, ge/gi, x, k, w. Nunca b/d/p/q en la misma unidad.
- **Par A/a siempre visible** al presentar una letra. Se lee en minúscula; se traza en mayúscula por defecto a los 3-4 años, minúscula activable por el adulto.
- **Introducción sin error.** Todo ítem nuevo se presenta (ver + oír + boca) antes de evaluarse.
- **Pistas least-to-most.** Intento libre → pista visual → pista sonora parcial → modelo completo que el niño repite. Al tercer fallo se da la respuesta.
- **Sin castigos.** Sin vidas, sin rachas punitivas, sin pérdida de estrellas, sin mensajes negativos. El feedback de error es neutro y de menos de 2 segundos.
- **Sesiones de 5-8 minutos**, 5-6 ejercicios, con cierre claro.
- **Mastery learning.** Se avanza de unidad con ≥80 % de ítems dominados.
- **Repaso espaciado suave.** 70 % contenido de la unidad activa, 30 % repaso.
- **Voz permisiva.** Mejor un falso acierto que frustrar. Se pide "otra vez" una sola vez.
- **Progreso pedagógico y recompensas separados.** Las recompensas nunca bloquean ni saltan contenido.

## 3. Arquitectura técnica

### Stack

- **Next.js** (App Router) + **TypeScript** estricto.
- **Tailwind CSS v4** para estilos; **Framer Motion** para animaciones y celebraciones.
- **Zustand** con persistencia en **IndexedDB** (`idb-keyval`).
- **Zod** para validar contenido y datos persistidos.
- **PWA**: manifest + service worker (Serwist) que precachea audios, imágenes y la app.
- **Vitest** + Testing Library; **Playwright** para e2e móvil.
- Despliegue en **Vercel**. Una única ruta de API (`/api/speech-token`) para emitir tokens efímeros de Azure cuando exista la cuenta.
- Gestor de paquetes: pnpm.

### Módulos y fronteras

```
src/
  content/     Currículo como datos: ítems, unidades, plantillas de ejercicio, catálogo de recompensas, manifiesto de audio. Sin React.
  engine/      Motor: planificador de sesión, dominio, Leitner, pistas, estrellas. TypeScript puro, sin React ni DOM. Recibe estado + contenido, devuelve decisiones.
  speech/      Interfaz SpeechEvaluator y sus implementaciones (parent, browser, azure), VAD, fonemización y comparación fonética.
  audio/       Reproductor de locuciones pregrabadas por acento (sprites), cola de reproducción, desbloqueo de AudioContext tras gesto.
  store/       Estado persistido (Zustand), esquema versionado y migraciones.
  features/    Pantallas: inicio/mapa, sesión, celebración, recompensas, padres.
  components/  UI infantil reutilizable: botones enormes, tarjetas, micrófono, lienzo de trazo, rastro de dedo.
  app/         Rutas Next.js y la API de token.
```

Regla: `features/` y `components/` nunca deciden pedagogía. Solo renderizan lo que `engine/` ordena y le devuelven eventos (acierto, fallo, tiempo). `engine/`, `content/` y `speech/` (salvo captura de audio) son testeables sin navegador.

## 4. Modelo de contenido

### Ítem

Unidad mínima que se puede dominar.

```ts
type ItemKind = 'phoneme' | 'letter' | 'syllable' | 'word' | 'oral-skill';

type Item = {
  id: string;                 // 'letter:a', 'syllable:ma', 'word:mama', 'oral:count-syllables:mesa'
  kind: ItemKind;
  text: string;               // 'a', 'ma', 'mamá'
  display?: { upper: string; lower: string }; // solo letras: { upper: 'A', lower: 'a' }
  phonemes: string[];         // IPA simplificado: ['m','a']
  audioKey: string;           // clave en el manifiesto de audio (existe en los 3 acentos)
  imageKey?: string;          // palabras y habilidades orales
  syllables?: string[];       // palabras: ['ma','má']
};
```

### Unidad y fase

```ts
type Unit = {
  id: string;                 // 'phase1:vowel-a', 'phase2:m'
  phase: 0 | 1 | 2 | 3;
  title: string;              // texto para el adulto; el niño oye audioKey
  audioKey: string;
  requires: string[];         // ids de unidades prerrequisito
  introduces: string[];       // ítems nuevos que enseña
  exercises: ExerciseTemplateRef[]; // plantillas permitidas y su peso
};
```

### Plantillas de ejercicio (8 en v1)

| id | Qué hace el niño | Ítems | Evaluación |
|---|---|---|---|
| `listen-tap` | Oye un sonido/sílaba y toca la opción correcta entre 2-3 | letras, sílabas, palabras | toque |
| `count-syllables` | Oye una palabra y toca tantas veces como sílabas (1-3) | oral-skill | toques |
| `rhyme` | Oye una palabra y elige entre 2 imágenes la que rima | oral-skill | toque |
| `initial-sound` | Oye "¿cuál empieza por /a/?" y elige entre 2-3 imágenes | fonemas | toque |
| `trace` | Traza la letra con el dedo sobre guía que se desvanece en 3 niveles | letras | trazo (tolerancia) |
| `say-it` | Ve una letra/sílaba, pulsa el micrófono y la dice | letras, sílabas | voz |
| `build` | Arrastra consonante + vocal para formar la sílaba que oye | sílabas | arrastre |
| `read-word` | Ve una palabra CV-CV con imagen oculta, la lee en voz alta; se revela la imagen | palabras | voz |

Cada plantilla define: número de opciones, cómo elegir distractores (nunca b/d/p/q juntos; primero formas muy distintas, luego parecidas), y sus 3 pistas.

### Distractores

Para letras: nivel fácil = formas muy distintas (a vs i vs u); nivel medio = vocales restantes; nunca una consonante nueva junto a otra en espejo. Para sílabas: misma consonante con otra vocal (ma/mo) o misma vocal con otra consonante ya vista (ma/la). Para imágenes: palabras que no compartan sonido inicial ni rima con la correcta.

### Contenido de la v1

**Fase 0, "Oído de explorador"** (4 unidades, sin texto):

- `phase0:clap`: contar sílabas 1-3 con toques: sol, pan, mesa, casa, gato, mano, pelota, banana, tomate.
- `phase0:rhyme`: rimas con 2 opciones: gato/pato, casa/masa, luna/cuna, ratón/limón, sopa/copa, pelo/velo.
- `phase0:initial`: sonido inicial vocálico con imágenes: avión, árbol, elefante, estrella, isla, iglú, oso, ojo, uva, uno.
- `phase0:hear-it`: "¿oyes /a/ en pato?" sí/no con 2 botones grandes.

**Fase 1, "Las vocales"** (5 unidades en orden a, e, o, i, u; una vocal por unidad, con repaso de las anteriores):

Cada unidad introduce `phoneme:X` y `letter:X`. Plantillas: `initial-sound`, `listen-tap` (letra entre distractores, mayúscula y minúscula), `trace` (mayúscula; minúscula si el adulto lo activa), `say-it`. Presentación con animación de boca y 3 palabras-imagen que empiezan por la vocal.

**Fase 2, "Las sílabas"** (4 unidades: m, l, s, p):

Cada unidad introduce `phoneme:C`, `letter:C` y `syllable:Ca..Cu` (5). Plantillas: `listen-tap`, `build`, `say-it`, `trace` de la consonante, y `read-word` con palabras formadas solo con letras ya introducidas:

- m: mamá, mimo, mima, mío, ama, amo.
- l: lima, loma, mula, mala, malo, lelo, ala, ola.
- s: mesa, masa, misa, suma, sumo, sola, sala, oso, uso, eso, asa.
- p: papá, pipa, mapa, sapo, sopa, pesa, puma, pala, pelo, polo, lupa, paso, piso.

Las palabras con vocal aislada como sílaba (ala, oso) se permiten porque las 5 vocales ya están dominadas.

**Fases 3+**: definidas como unidades vacías en `content/` para que el mapa muestre el camino futuro bloqueado; sin ítems en v1.

### Audio

Todas las locuciones (instrucciones, letras, sílabas, palabras, celebraciones, pistas) se pregraban con síntesis neural en **3 acentos**: dominicano (`do`), mexicano (`mx`) y neutro (`neutro`, voz es-US). Un manifiesto `content/audio-manifest.ts` lista cada `audioKey` y un test verifica que existan los 3 archivos. Hasta tener la cuenta de Azure, el desarrollo usa `speechSynthesis` como placeholder detrás de la misma interfaz `audio/`.

Formato: `.m4a` (AAC) por compatibilidad Safari, con `.ogg` opcional. Se sirven desde `public/audio/{accent}/{key}.m4a` y se precachean.

## 5. Motor de sesión (`engine/`)

### Estado por ítem

```ts
type ItemProgress = {
  box: 0 | 1 | 2 | 3;         // 0 = no visto; 1..3 cajas Leitner
  firstTryCorrect: number;    // aciertos sin ayuda en sesiones distintas
  assisted: number;           // resueltos con modelo (3.er fallo)
  lastSessionIndex: number;   // índice de la última sesión donde apareció
  masteredAt?: string;        // ISO
};
```

### Dominio

- Ítem **dominado**: `firstTryCorrect >= 3` en sesiones distintas.
- Unidad **completada**: ≥80 % de sus ítems `introduces` dominados. Completar desbloquea las unidades cuyo `requires` se cumple.
- El progreso nunca retrocede: un ítem dominado no se "desdomina"; solo puede volver a repaso.

### Leitner

Cajas 1, 2, 3 con intervalos de **1, 3 y 7 sesiones**. Acierto sin ayuda sube una caja (máx. 3); fallo baja a la caja 1. Un ítem está "vencido" cuando `sessionIndex - lastSessionIndex >= intervalo(box)`.

### Planificador de sesión

Entrada: estado, contenido, unidad activa, `sessionLength` (5 o 6 ejercicios). Salida: lista ordenada de ejercicios instanciados.

1. Ítems nuevos de la unidad activa aún no presentados: se incluye una **presentación** (no evaluada) para cada uno, máximo 2 por sesión.
2. ~70 % de los ejercicios evalúan ítems de la unidad activa, priorizando los menos dominados.
3. ~30 % son repaso de ítems vencidos de unidades anteriores, priorizando los de caja más baja. Si no hay vencidos, se rellena con unidad activa.
4. Se alternan plantillas para que no haya dos iguales seguidas y se cierra con un ejercicio de baja dificultad (efecto de final positivo).
5. Determinista dado una semilla, para poder testear.

### Pistas por intento

| Intento | Qué pasa al fallar | Cuenta como |
|---|---|---|
| 1.º | Pista visual: la opción correcta pulsa suavemente, o se muestra la boca, o la guía de trazo reaparece | — |
| 2.º | Pista sonora parcial: se alarga el primer sonido ("mmm…", "aaa…") | — |
| 3.º | Modelo completo: se muestra y se oye la respuesta; el niño la toca/repite para continuar | `assisted` |

Acierto en 1.º intento suma `firstTryCorrect`. Acierto en 2.º o 3.º intento no suma ni resta dominio, pero baja a caja 1. El feedback sonoro de fallo es neutro ("mmm, otra vez") y de menos de 2 s.

### Estrellas por sesión

- 3: todos los ejercicios evaluados acertados al primer intento.
- 2: ≥80 % al primer intento.
- 1: sesión completada.
- Se guarda la **mejor** marca por unidad; el total es la suma de mejores marcas. Repetir no infla el total.

## 6. Capa de voz (`speech/`)

### Interfaz

```ts
type SpeechTarget = { text: string; phonemes: string[]; lang: 'es-MX' | 'es-ES' | 'es-US' };
type SpeechVerdict = { verdict: 'ok' | 'retry' | 'unsure'; confidence: number; detail?: unknown };

interface SpeechEvaluator {
  readonly id: 'parent' | 'browser' | 'azure';
  available(): Promise<boolean>;
  evaluate(input: { audio?: Blob; target: SpeechTarget }): Promise<SpeechVerdict>;
}
```

Cadena de resolución: `azure` → `browser` → `parent`. Se usa el primer evaluador disponible; si falla en tiempo de ejecución (red, permiso), se cae al siguiente sin interrumpir el ejercicio.

### Implementaciones v1

- **`parent`**: no necesita audio. Tras la grabación se muestran dos botones grandes para el adulto: "Lo dijo bien" / "Otra vez". Siempre disponible. Es la implementación por defecto cuando no hay red ni API de voz.
- **`browser`**: Web Speech API (`webkitSpeechRecognition`), `lang` según acento, `maxAlternatives: 5`. Cada alternativa se normaliza (minúsculas, sin tildes), se fonemiza con reglas del español (casi fonémico; ~40 reglas: c/qu/z/s con seseo, g/j, ll/y, h muda, rr) y se compara con `target.phonemes` por distancia de edición **aceptando prefijo** ("ma" ⊂ "mamá"). `ok` si alguna alternativa tiene distancia 0 o prefijo exacto; `retry` si la mejor distancia es 1; `unsure` en otro caso o si no está disponible (p. ej. PWA instalada en iOS). Nunca se usa como única fuente de un "fallo": `retry` de esta capa se trata como `unsure` si el VAD detectó habla clara.
- **`azure`** (post-spike): Pronunciation Assessment con `granularity: Phoneme`, `nbestPhonemeCount: 5`, `referenceText` = sílaba o palabra portadora si las pseudopalabras fallan. `ok` si cada fonema objetivo tiene `AccuracyScore >= 55` o aparece en NBest; `retry` si 35-55; `unsure` bajo 35. Token efímero desde `/api/speech-token`.

### Captura

`getUserMedia` (funciona en Safari iOS, incluida la PWA instalada). Se graba hasta **3 s** o hasta 600 ms de silencio tras habla, usando VAD (Silero vía `@ricky0123/vad-web`; si el modelo no carga, umbral de energía simple). Sin habla detectada → "No te oí, ¿lo dices otra vez?" sin contar intento.

### Flujo en `say-it` / `read-word`

1. Presentación del objetivo (visual; sin audio del objetivo, para no dar la respuesta).
2. Botón de micrófono enorme; el adulto o el niño lo pulsa. Cuenta regresiva visual de 3 puntos.
3. Grabación con VAD → `evaluate`.
4. `ok` → celebración y `firstTryCorrect` si era 1.º intento.
5. `retry` → "Mmm, otra vez" (una sola vez). Segundo `retry` → paso 6.
6. `unsure` → si hay adulto habilitado, confirmación `parent`; si confirma, `ok`; si no, se aplica la pista del intento correspondiente y se repite desde 2.

### Privacidad

El audio nunca se persiste ni se envía salvo al evaluador activo. El panel de padres muestra qué evaluador está activo y permite forzar `parent`.

## 7. Recompensas

### Estrellas

Experiencia acumulada; nunca se gastan ni se pierden. Contador visible en el mapa; barra hacia el próximo hito.

### Logros (v1)

| id | Condición | Desbloquea |
|---|---|---|
| `first-session` | Completar la primera sesión | Fondo "Pradera" |
| `vowel-a` | Dominar `letter:a` | Pegatina "A de avión" |
| `five-vowels` | Dominar las 5 vocales | Compañero nuevo (2.º personaje) |
| `first-syllable-voice` | Primer `say-it` de sílaba en `ok` | Rastro de dedo "Estrellitas" |
| `steady-hand` | 10 trazos completados | Fondo "Espacio" |
| `ten-sessions` | 10 sesiones completadas (no consecutivas) | Accesorio del compañero (gorra) |
| `word-reader` | 5 palabras leídas en `ok` | Rastro de dedo "Burbujas" |
| `phase2-done` | Completar Fase 2 | Trofeo + fondo "Bosque" |

Hitos de estrellas adicionales (10, 25, 50, 100) desbloquean pegatinas para el álbum.

### Cosméticos equipables

Fondo, compañero (personaje del mapa y de las celebraciones), rastro de dedo (partículas al tocar/arrastrar, sustituto del cursor en táctil; en PC también cambia el cursor). Álbum de pegatinas solo para mirar.

### Celebraciones

Una sola celebración por logro, al terminar la sesión, breve (<4 s), cerrable con un toque. Respeta `prefers-reduced-motion`. Sin sonidos largos.

## 8. Panel de padres, datos y offline

### Panel de padres

Acceso desde un icono discreto con **PIN de 4 dígitos** (definido en el primer uso; se guarda hasheado). Contiene:

- Progreso: por fase/unidad/ítem, con dominados, en repaso y no vistos; últimas 10 sesiones con estrellas.
- Ajustes: acento de voz (do/mx/neutro), trazo de minúsculas (on/off), longitud de sesión (5/6), evaluador de voz (auto/solo adulto), celebraciones (normal/reducidas), nombre del niño.
- Datos: exportar progreso a JSON, importar JSON, reiniciar todo (con doble confirmación).

### Persistencia

Un único documento en IndexedDB:

```ts
type PersistedState = {
  version: 1;
  settings: { accent: 'do' | 'mx' | 'neutro'; lowercaseTracing: boolean; sessionLength: 5 | 6;
              speechMode: 'auto' | 'parent'; reducedCelebrations: boolean; childName?: string; pinHash?: string };
  items: Record<string, ItemProgress>;
  units: Record<string, { status: 'locked' | 'active' | 'done'; bestStars: 0 | 1 | 2 | 3 }>;
  sessions: { index: number; unitId: string; stars: number; endedAt: string }[];
  rewards: { unlockedAt: Record<string, string>; equipped: { background?: string; companion?: string; trail?: string } };
  sessionCounter: number;
};
```

Esquema validado con Zod al cargar; migraciones por `version`. Si el documento está corrupto se ofrece restaurar desde exportación o reiniciar.

### Offline

Service worker precachea la app, imágenes y los audios del acento activo (los otros acentos bajo demanda). Sin red: todo funciona; el evaluador de voz cae a `browser` si está disponible y si no a `parent`, con un aviso discreto en el panel de padres.

## 9. Experiencia de usuario

- **Pantallas**: Inicio/mapa (camino de unidades con el compañero), Sesión (un ejercicio a pantalla completa, barra de progreso de la sesión arriba, botón de salir para el adulto), Fin de sesión (estrellas, logro si hay), Recompensas (galería y equipar), Padres.
- **Sin texto para el niño**: toda instrucción es audio + icono. Los textos visibles son solo las letras/sílabas/palabras objetivo y la UI del adulto.
- **Toques**: objetivos táctiles ≥ 72 px, un solo gesto por ejercicio, sin scroll dentro de un ejercicio.
- **Audio en iOS**: la primera pantalla exige un toque ("Toca para empezar") que desbloquea el `AudioContext`.
- **Orientación**: horizontal y vertical; el trazo usa el lado corto como referencia.
- **Accesibilidad**: contraste AA, estados no solo por color, `prefers-reduced-motion`, panel de padres navegable con teclado.

## 10. Pruebas

- **`engine/`**: Vitest con TDD. Casos: planificador (proporciones 70/30, máximo 2 presentaciones, sin plantillas repetidas seguidas, determinismo por semilla), Leitner (subir/bajar caja, vencimiento), dominio (3 aciertos en sesiones distintas), pistas (transición por intento), estrellas (umbrales y mejor marca), desbloqueo de unidades y logros.
- **`speech/`**: fonemización por reglas (tabla de casos), comparación con prefijo, cadena de fallback con evaluadores simulados.
- **`content/`**: esquema Zod, unicidad de ids, prerrequisitos acíclicos, palabras de Fase 2 compuestas solo por letras ya introducidas, distractores válidos (nunca b/d/p/q juntos), y existencia de los 3 audios por `audioKey`.
- **`store/`**: migraciones y recuperación de documento corrupto.
- **UI**: Testing Library para `listen-tap`, `say-it` con evaluador simulado, PIN de padres. Playwright con viewport iPhone: recorrido completo de una sesión de Fase 1 con eventos táctiles en `trace`.
- **Manual en iPad**: lista de verificación en `docs/checklist-ipad.md`: permiso de micrófono, audio tras el primer toque, instalación en pantalla de inicio, comportamiento sin red.

## 11. Riesgos y experimentos previos

1. **Azure acepta "ma" como referencia?** Spike de 1-2 h cuando exista la cuenta: probar `referenceText` "ma", "mamá" y "ma ma" con es-MX y es-ES en Safari iOS. Si falla, usar palabra portadora (`read-word`) y dejar `say-it` de sílaba con `browser`/`parent`.
2. **Web Speech en PWA instalada de iOS no está disponible**: previsto, cae a `parent`.
3. **Tamaño del VAD (ONNX ~2 MB + runtime)**: medir; si penaliza la carga, umbral de energía.
4. **Voces infantiles**: los umbrales de `azure` y `browser` se ajustan con uso real; el panel de padres permite forzar `parent`.
5. **Autoplay en iOS**: gesto inicial obligatorio; todo audio se reproduce desde una cola tras ese gesto.

## 12. Escalabilidad prevista

- Fases 3+ = nuevas unidades e ítems en `content/`, sin tocar `engine/`.
- Nuevas materias (números, inglés) = nuevo árbol de contenido y, si hace falta, una plantilla de ejercicio nueva.
- Voz propia de los padres = nueva fuente en `audio/` que sobreescribe `audioKey` por acento "familia".
- Nube/varios niños = adaptador de persistencia en `store/` (p. ej. Supabase) manteniendo el mismo `PersistedState`.
- App nativa = la capa `speech/` admite una implementación con reconocimiento de Apple en el dispositivo; el resto es web reutilizable.

## 13. Siguientes pasos

1. Plan de implementación (skill `writing-plans`) a partir de este spec.
2. Andamiaje del proyecto y `content/` con esquema y tests.
3. `engine/` con TDD.
4. UI de sesión con las 8 plantillas, audio placeholder.
5. `speech/` parent + browser; luego spike Azure y generación de audios en 3 acentos.
6. Recompensas, panel de padres, PWA, pruebas en iPad.
