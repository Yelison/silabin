# Validación por voz de sílabas en español para niños — comparativa técnica (sept. 2026)

## Resumen ejecutivo

Ningún ASR comercial está diseñado para sílabas aisladas de voces infantiles en español: los reconocedores de palabras tienden a "corregir" /ma/ hacia *mamá* o *más*, y los estudios muestran hasta ~35 % WER en niños de 4-6 años frente a ~5 % en adultos. La única API pública que devuelve puntuación **por fonema en español** es **Azure Pronunciation Assessment**. Arquitectura realista para un MVP: Azure PA como evaluador principal, Web Speech API + comparación fonética como fallback barato, VAD local para detectar que el niño habló, y confirmación del adulto cuando la confianza sea baja.

## Tabla comparativa

| Opción | Español | Offline | Precisión sílaba corta / voz infantil | Coste | Complejidad |
|---|---|---|---|---|---|
| Web Speech API (navegador) | es-ES, es-MX, etc. | Solo Chrome 139+ escritorio con `processLocally` (es-ES) | Baja: devuelve palabras, sin fonemas, sin gramáticas | Gratis | Baja |
| Azure Pronunciation Assessment | es-ES, es-MX | No | Media-alta (fonema IPA + NBest); niños no documentado | ≈ STT estándar (~$1/h; 5 h/mes gratis) | Media |
| Google STT Chirp 3 | es-ES, es-MX, es-US | No | Media (adaptación de frases, sin fonemas) | ~$0.016/min | Media |
| OpenAI gpt-4o-transcribe / Whisper API | Sí | No | Baja-media; alucina en audio corto/silencio | $0.003–0.006/min | Baja |
| Whisper en navegador (Transformers.js) | Sí | Sí (WebGPU/WASM) | Baja-media; modelo tiny 60-90 MB; latencia móvil no confirmada | Gratis | Alta |
| Deepgram Nova-3 | Sí | No | Media (keyterms, streaming) | $0.0077/min + keyterms | Media |
| AssemblyAI Universal-Streaming | Sí | No | Media (keyterms incluidos) | $0.15/h | Media |
| wav2vec2 fonemas (espeak) en servidor | Multilingüe/IPA | Sí (servidor propio) | Potencialmente alta con fine-tuning infantil | Servidor CPU/GPU | Alta |
| Vosk-browser (es small, 39 MB) | Sí | Sí | Baja con gramática (falsos positivos) | Gratis | Media |

## 1. Web Speech API

- Soporte: Chrome/Edge completo; Safari 14.1+ / iOS 14.5+ con prefijo `webkit`; Firefox deshabilitado tras flag (https://caniuse.com/mdn-api_speechrecognition).
- **PWA en iOS**: funciona en Safari pero **no en la app instalada en pantalla de inicio** (https://whatpwacando.today/speech-recognition/, https://developer.apple.com/forums/thread/748048). Android WebView no lo soporta.
- Chrome envía audio a Google, Safari a Apple. Desde Chrome 139 existe `processLocally` (es-ES, escritorio).
- Gramáticas JSGF: `SpeechGrammarList` no tiene efecto. `interimResults` y `maxAlternatives` sí funcionan.
- Sílabas aisladas: el modelo de lenguaje favorece palabras reales (experiencia común, no documentada).

## 2. Azure AI Speech – Pronunciation Assessment

- Idiomas: **es-ES y es-MX**; Microsoft recomienda probar ambos (https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment).
- Granularidad `Phoneme` con alfabeto IPA y `NBestPhonemes` (5 candidatos con confianza); el texto de referencia "puede ser una palabra, frase o párrafo". Puntuación por sílaba y prosodia: solo en-US (https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment). **Que acepte una pseudopalabra como "ma" no está confirmado; requiere prueba.**
- SDK JS `microsoft-cognitiveservices-speech-sdk` funciona en navegador con token efímero (https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/scenarios/javascript/node/language-learning/pronunciationAssessment.js).
- Precio: igual que STT estándar (~$1–1.32/h); **5 h/mes gratis**. Sin nota sobre voces infantiles.

## 3. Google Cloud STT / Chirp 3

Chirp 3 GA (mayo 2026), es-ES/es-MX/es-US, streaming con endpointing "supershort", speech adaptation hasta 1 000 frases y boost máx. 20. No devuelve fonemas.

## 4. OpenAI / Whisper / on-device

- API: whisper-1 y gpt-4o-transcribe $0.006/min, mini $0.003. Sin puntuación fonética.
- Alucinaciones en silencio/no-habla bien documentadas; mitigación: VAD previo y filtros. Un clip de 0,5 s de un niño es el peor caso.
- Navegador: whisper-tiny ~60-90 MB; WebGPU en Chrome 113+ y Safari 26 / iOS 26. Latencia real en móvil no confirmada.

## 5. Deepgram, AssemblyAI, Speechmatics, ElevenLabs

Todos con español y streaming; ninguno ofrece puntuación por fonema. Deepgram keyterm prompting (~100 términos), AssemblyAI keyterms incluidos ($0.15/h), Speechmatics custom dictionary ($1.04/h), ElevenLabs Scribe v2 realtime ($0.39/h).

## 6. Enfoques alternativos

- **Comparación fonética**: convertir transcripción y objetivo a fonemas con espeak-ng WASM (https://github.com/xenova/phonemizer.js) o G2P por reglas (el español es casi fonémico) y comparar con Levenshtein normalizado, aceptando prefijo ("ma" ⊂ "mamá").
- **VAD + confirmación del padre**: @ricky0123/vad-web (Silero, ONNX Runtime Web) detecta que hubo habla (https://docs.vad.ricky0123.com/user-guide/browser/).
- **Reconocedores de fonemas**: facebook/wav2vec2-lv-60-espeak-cv-ft: ONNX 197–318 MB cuantizado, inviable en móvil web, viable en servidor pequeño.
- **Vosk-browser**: modelo español small 39 MB; con gramática casi nunca devuelve `[unk]` → falsos positivos.

## 7. Voces infantiles

- Niños de 4-6 años: hasta 35 % WER vs adultos ~5 %; fine-tuning reduce 12-30 % relativo (https://the-learning-agency.com/guides-resources/closing-the-child-speech-recognition-gap-evidence-limitations-and-paths-forward/). Siri/Alexa siguen fallando con niños de 2-5 años.
- SoapBox Labs adquirida por Curriculum Associates (2023); sin API a terceros. Amira usa ASR sobre texto conocido (scripted).
- Mitigaciones: evaluación scripted (el sistema sabe qué se espera), NBest, umbrales bajos (Azure marca `Mispronunciation` <60), tolerancia fonética, validación humana.

## 8. TTS

`speechSynthesis` es irregular: Chrome Android cae a inglés si no hay voz instalada; iOS no expone voces de alta calidad (iOS 17 las retiró). **Recomendado: pregrabar las ~150 sílabas y todas las locuciones** con Azure Neural (0,5 M caracteres/mes gratis; hay voces es-DO, es-MX, es-ES), Google Neural2 o ElevenLabs.

## Recomendación MVP

1. **Captura**: `getUserMedia` + AudioWorklet (funciona en PWA iOS, a diferencia de `SpeechRecognition`; verificar en dispositivos objetivo) + Silero VAD en navegador para recortar el segmento hablado y descartar silencio.
2. **Evaluador principal**: Azure Pronunciation Assessment (es-MX o es-ES según pruebas), `granularity: Phoneme`, `nbestPhonemeCount: 5`, referenceText = sílaba (o palabra portadora si las pseudopalabras fallan). Aceptar si los fonemas objetivo tienen `AccuracyScore` ≥ 50-60 o aparecen en NBest. Coste ≈ $0.0006 por intento de 2 s.
3. **Fallback**: Web Speech API (`maxAlternatives: 5`) → fonemizar → distancia de edición con tolerancia de prefijo. Si VAD detecta habla pero nada supera umbral: botón de confirmación del adulto.
4. **Audio pregrabado**, no `speechSynthesis`.

## Opción robusta para escalar

Servidor propio con wav2vec2 XLSR de fonemas afinado con audio infantil en español recogido con consentimiento (las confirmaciones de los padres del MVP sirven como etiquetas), scoring tipo GOP por fonema, latencia <300 ms vía WebSocket. A medio plazo, modelo cuantizado (~40-80 MB) en navegador con Transformers.js/WebGPU para modo offline.

## No confirmado

Precios oficiales exactos de Azure PA y Google STT; `processLocally` en Chrome Android; aceptación de pseudopalabras por Azure PA; latencia de Whisper WebGPU en móvil; sesgo a palabras completas de Web Speech (empírico).
