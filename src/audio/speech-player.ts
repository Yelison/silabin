import type { AudioPlayer, AudioRequest } from "@/audio/types";
import { type Accent, audioManifest } from "@/content/audio-manifest";

/** Pausa entre sílabas en `by-syllable` y `beats`. */
export const SYLLABLE_GAP_MS = 350;

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

function pickVoice(
	voices: readonly SpeechSynthesisVoice[],
	accent: Accent,
): SpeechSynthesisVoice | null {
	const wanted = normalizeLang(ACCENT_LANG[accent]);
	return (
		voices.find((v) => normalizeLang(v.lang) === wanted) ??
		voices.find((v) => normalizeLang(v.lang).startsWith("es")) ??
		null
	);
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

	function speakOne(text: string): Promise<void> {
		return new Promise<void>((resolve) => {
			let timer: ReturnType<typeof setTimeout> | undefined;
			let mine: SpeechSynthesisUtterance | undefined;
			const finish = () => {
				clearTimeout(timer);
				if (current === mine) current = null;
				if (interrupt === finish) interrupt = null;
				resolve();
			};
			interrupt = finish;
			if (synth === undefined) return finish();
			try {
				const utterance = new SpeechSynthesisUtterance(text);
				mine = utterance;
				utterance.lang = voice?.lang ?? ACCENT_LANG[accent];
				if (voice !== null) utterance.voice = voice;
				utterance.onend = finish;
				utterance.onerror = finish;
				current = utterance;
				// Si `onend` no llega nunca, el audio no debe bloquear la cola.
				timer = setTimeout(finish, speechGuardMs(text));
				synth.speak(utterance);
			} catch {
				finish();
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
		for (let i = 0; i < syllables.length; i++) {
			if (gen !== generation) return;
			if (i > 0) {
				await pause(SYLLABLE_GAP_MS);
				if (gen !== generation) return;
			}
			request.onSegment?.(i);
			if (gen !== generation) return;
			if (style === "beats") beat();
			if (gen !== generation) return;
			await speakOne(syllables[i] ?? "");
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
