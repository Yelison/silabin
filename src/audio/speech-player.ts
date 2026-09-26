import type { AudioPlayer, AudioRequest } from "@/audio/types";
import { type Accent, audioManifest } from "@/content/audio-manifest";

/** Pausa entre sílabas en `by-syllable` y `beats`. */
export const SYLLABLE_GAP_MS = 350;

/**
 * Si `onstart` no llega en este tiempo, `onSegment` y `beat` se lanzan igual (una sola vez)
 * para no depender de él: en Edge, las voces "Natural" tardan en arrancar por la red.
 */
export const SEGMENT_FALLBACK_MS = 250;

/** Mínimo que se espera a un `onend` antes de darlo por perdido (iOS lo pierde a veces). */
export const SPEECH_GUARD_MIN_MS = 3000;
const SPEECH_GUARD_PER_CHAR_MS = 250;
const SPEECH_GUARD_MARGIN_MS = 1000;

function speechGuardMs(text: string): number {
	return Math.max(
		SPEECH_GUARD_MIN_MS,
		SPEECH_GUARD_PER_CHAR_MS * text.length + SPEECH_GUARD_MARGIN_MS,
	);
}

const ACCENT_LANG: Record<Accent, string> = {
	do: "es-DO",
	mx: "es-MX",
	neutro: "es-US",
};

type Deps = {
	synth: SpeechSynthesis | undefined;
	accent: Accent;
	/** Por omisión, el manifiesto de audio. */
	textFor?: (key: string) => string | undefined;
	/** Golpe audible. Por omisión, un clic con `AudioContext`. */
	beat?: () => void;
};

function defaultTextFor(key: string): string | undefined {
	return Object.hasOwn(audioManifest, key) ? audioManifest[key] : undefined;
}

/** Android da `es_MX`, el resto `es-MX`. */
function normalizeLang(lang: string): string {
	return lang.replace("_", "-").toLowerCase();
}

/** Voces "mejoradas": suenan más naturales que la primera de la lista del dispositivo. */
const QUALITY_NAME_RE = /natural|neural|premium|enhanced|mejorad/i;
/** Voces de fantasía de Apple: no sirven para enseñar el sonido de una letra. */
const FANTASY_NAME_RE =
	/\b(eddy|flo|grandma|grandpa|abuel[oa]|reed|rocko|sandy|shelley)\b/i;

function voiceScore(v: SpeechSynthesisVoice): number {
	let score = 0;
	if (QUALITY_NAME_RE.test(v.name)) score += 2;
	if (FANTASY_NAME_RE.test(v.name)) score -= 2;
	return score;
}

/** La de mayor puntuación del grupo; en empate, la primera de la lista. Penalizar no es excluir. */
function bestVoiceOf(
	voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
	if (voices.length === 0) return null;
	let best = voices[0] as SpeechSynthesisVoice;
	let bestScore = voiceScore(best);
	for (let i = 1; i < voices.length; i++) {
		const v = voices[i] as SpeechSynthesisVoice;
		const score = voiceScore(v);
		if (score > bestScore) {
			best = v;
			bestScore = score;
		}
	}
	return best;
}

/**
 * Primero el acento, después la calidad (R19): dentro del grupo del idioma exacto del
 * acento, o si no hay ninguna, dentro de cualquier `es-*`, gana la voz con mejor puntuación.
 */
export function pickVoice(
	voices: readonly SpeechSynthesisVoice[],
	accent: Accent,
): SpeechSynthesisVoice | null {
	const wanted = normalizeLang(ACCENT_LANG[accent]);
	const exact = voices.filter((v) => normalizeLang(v.lang) === wanted);
	if (exact.length > 0) return bestVoiceOf(exact);
	const anyEs = voices.filter((v) => normalizeLang(v.lang).startsWith("es"));
	return bestVoiceOf(anyEs);
}

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
	const g = globalThis as {
		AudioContext?: AudioContextCtor;
		webkitAudioContext?: AudioContextCtor;
	};
	return g.AudioContext ?? g.webkitAudioContext;
}

/** El clic del golpe. El contexto se crea y reanuda dentro del gesto (`prepare`). */
function createClicker(): { prepare(): Promise<void>; beat(): void } {
	let context: AudioContext | null = null;
	return {
		async prepare() {
			if (context === null) {
				const Ctor = audioContextCtor();
				if (Ctor === undefined) return;
				try {
					context = new Ctor();
				} catch {
					return;
				}
			}
			try {
				await context.resume();
			} catch {
				// Sin contexto reanudado el golpe simplemente no suena.
			}
		},
		beat() {
			if (context === null || context.state !== "running") return;
			try {
				const now = context.currentTime;
				const osc = context.createOscillator();
				const gain = context.createGain();
				osc.type = "sine";
				osc.frequency.value = 880;
				gain.gain.setValueAtTime(0.0001, now);
				gain.gain.linearRampToValueAtTime(0.4, now + 0.005);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
				osc.connect(gain);
				gain.connect(context.destination);
				osc.start(now);
				osc.stop(now + 0.1);
			} catch {
				// Un golpe que falla no debe romper la sesión.
			}
		},
	};
}

export function createSpeechPlayer(deps: Deps): AudioPlayer {
	const { synth, accent } = deps;
	const textFor = deps.textFor ?? defaultTextFor;
	const clicker = createClicker();
	const beat = deps.beat ?? clicker.beat;
	const prepareBeat =
		deps.beat === undefined ? clicker.prepare : async () => {};

	let unlocked = false;
	let voice: SpeechSynthesisVoice | null = null;
	/** Cada `stop()` la incrementa: lo encolado antes de un stop no debe sonar. */
	let generation = 0;
	let tail: Promise<void> = Promise.resolve();
	/** Termina antes de tiempo lo que esté esperando ahora (utterance o pausa). */
	let interrupt: (() => void) | null = null;

	if (synth !== undefined) {
		voice = pickVoice(synth.getVoices(), accent);
		// Las voces de iOS llegan tarde.
		synth.addEventListener("voiceschanged", () => {
			voice = pickVoice(synth.getVoices(), accent);
		});
	}

	/**
	 * Referencia viva a la utterance en curso: Chrome recolecta las que nadie referencia
	 * y entonces nunca dispara `onend`.
	 */
	let current: SpeechSynthesisUtterance | null = null;

	/**
	 * Dice una locución y resuelve con la latencia de arranque medida (el tiempo entre
	 * `synth.speak` y el primer `onstart`; 0 si `onstart` no llega). Si se pasa `onStarted`,
	 * se llama una sola vez, en el `onstart`, o a los `SEGMENT_FALLBACK_MS` si no llega antes;
	 * nunca bloquea la resolución de la promesa (que depende solo de `onend`/`onerror`/guarda).
	 */
	function speakOne(text: string, onStarted?: () => void): Promise<number> {
		return new Promise<number>((resolve, reject) => {
			let guardTimer: ReturnType<typeof setTimeout> | undefined;
			let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
			let mine: SpeechSynthesisUtterance | undefined;
			let settled = false;
			let segmentFired = false;
			let recordedRealStart = false;
			let latency = 0;
			let sentAt = 0;

			const clearTimers = () => {
				clearTimeout(guardTimer);
				clearTimeout(fallbackTimer);
			};
			const succeed = () => {
				if (settled) return;
				settled = true;
				clearTimers();
				if (current === mine) current = null;
				if (interrupt === onInterrupt) interrupt = null;
				resolve(latency);
			};
			const fail = (err: unknown) => {
				if (settled) return;
				settled = true;
				clearTimers();
				if (current === mine) current = null;
				if (interrupt === onInterrupt) interrupt = null;
				reject(err);
			};
			const onInterrupt = () => succeed();
			interrupt = onInterrupt;

			const triggerSegmentOnce = () => {
				if (segmentFired || settled) return;
				segmentFired = true;
				clearTimeout(fallbackTimer);
				// Fuera de la pila de `synth.speak`: si `onStarted` lanza, no lo traga el
				// `catch` pensado para el propio `speak`, y tampoco bloquea la cola.
				queueMicrotask(() => {
					if (settled) return;
					try {
						onStarted?.();
					} catch (err) {
						fail(err);
					}
				});
			};

			if (synth === undefined) return succeed();
			try {
				const utterance = new SpeechSynthesisUtterance(text);
				mine = utterance;
				utterance.lang = voice?.lang ?? ACCENT_LANG[accent];
				if (voice !== null) utterance.voice = voice;
				utterance.onstart = () => {
					if (settled || recordedRealStart) return;
					recordedRealStart = true;
					latency = Date.now() - sentAt;
					triggerSegmentOnce();
				};
				utterance.onend = succeed;
				utterance.onerror = succeed;
				current = utterance;
				// Si `onend` no llega nunca, el audio no debe bloquear la cola.
				guardTimer = setTimeout(succeed, speechGuardMs(text));
				if (onStarted !== undefined) {
					fallbackTimer = setTimeout(triggerSegmentOnce, SEGMENT_FALLBACK_MS);
				}
				sentAt = Date.now();
				synth.speak(utterance);
			} catch {
				succeed();
			}
		});
	}

	function pause(ms: number): Promise<void> {
		return new Promise<void>((resolve) => {
			const finish = () => {
				clearTimeout(timer);
				if (interrupt === finish) interrupt = null;
				resolve();
			};
			const timer = setTimeout(finish, ms);
			interrupt = finish;
		});
	}

	async function perform(
		request: AudioRequest,
		text: string,
		gen: number,
	): Promise<void> {
		const style = request.style ?? "normal";
		const syllables = request.syllables;
		if (style === "normal" || syllables === undefined) {
			await speakOne(text);
			return;
		}
		// Estimación: la red tarda parecido en sílabas seguidas, así que la pausa de la
		// sílaba i descuenta la latencia de arranque medida en la sílaba i−1.
		let previousLatency = 0;
		for (let i = 0; i < syllables.length; i++) {
			if (gen !== generation) return;
			if (i > 0) {
				await pause(Math.max(0, SYLLABLE_GAP_MS - previousLatency));
				if (gen !== generation) return;
			}
			const index = i;
			const onStarted = () => {
				request.onSegment?.(index);
				if (gen !== generation) return;
				if (style === "beats") beat();
			};
			previousLatency = await speakOne(syllables[index] ?? "", onStarted);
			if (gen !== generation) return;
		}
	}

	return {
		get unlocked() {
			return unlocked;
		},

		async unlock() {
			if (unlocked) return;
			unlocked = true;
			// Todo dentro del gesto: sin `await` antes de estas dos llamadas.
			if (synth !== undefined) {
				try {
					synth.speak(new SpeechSynthesisUtterance(""));
				} catch {
					// Sin síntesis utilizable, `play` resolverá sin sonar.
				}
			}
			await prepareBeat();
		},

		play(request) {
			const text = textFor(request.key);
			if (text === undefined) {
				return Promise.reject(
					new Error(
						`Clave de audio sin texto en el manifiesto: ${request.key}`,
					),
				);
			}
			const style = request.style ?? "normal";
			if (
				style !== "normal" &&
				(request.syllables === undefined || request.syllables.length === 0)
			) {
				return Promise.reject(
					new Error(`El estilo ${style} exige sílabas (${request.key})`),
				);
			}
			if (!unlocked || synth === undefined) return Promise.resolve();

			const gen = generation;
			const run = tail.then(() =>
				gen === generation ? perform(request, text, gen) : undefined,
			);
			tail = run.catch(() => undefined);
			return run;
		},

		stop() {
			generation++;
			synth?.cancel();
			interrupt?.();
		},

		beat() {
			beat();
		},
	};
}
