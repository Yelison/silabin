/**
 * Detector de voz por energía, puro. Sesgo deliberado hacia «oído» (P5): el adulto decide después
 * si la respuesta era buena, así que ante la duda es mejor dar por oído que dejar al niño hablando
 * al vacío. Un clic suelto no cuenta: la voz necesita `MIN_SPEECH_MS` seguidos por encima del umbral.
 */
export const VAD = {
	SPEECH_RMS: 0.02,
	MIN_SPEECH_MS: 120,
	SILENCE_AFTER_MS: 600,
	MAX_MS: 3000,
} as const;

export type VadState = {
	startedAt: number;
	prevT: number;
	/** Milisegundos seguidos de voz; se pone a 0 con un frame bajo mientras no haya `heard`. */
	runMs: number;
	lastVoiceAt: number | null;
	heard: boolean;
	done: boolean;
};

export function createVad(t0: number): VadState {
	return {
		startedAt: t0,
		prevT: t0,
		runMs: 0,
		lastVoiceAt: null,
		heard: false,
		done: false,
	};
}

export function stepVad(
	state: VadState,
	frame: { rms: number; t: number },
): VadState {
	if (state.done) return state;
	const { rms: nivel, t } = frame;
	const esVoz = nivel >= VAD.SPEECH_RMS;
	let runMs = state.runMs;
	let lastVoiceAt = state.lastVoiceAt;
	if (esVoz) {
		runMs += t - state.prevT;
		lastVoiceAt = t;
	} else if (!state.heard) {
		runMs = 0;
	}
	const heard = state.heard || runMs >= VAD.MIN_SPEECH_MS;
	const silencioLargo =
		heard && lastVoiceAt !== null && t - lastVoiceAt >= VAD.SILENCE_AFTER_MS;
	const done = silencioLargo || t - state.startedAt >= VAD.MAX_MS;
	return { ...state, prevT: t, runMs, lastVoiceAt, heard, done };
}

/** Raíz de la media de los cuadrados: la energía de un buffer de muestras. */
export function rms(samples: Float32Array): number {
	if (samples.length === 0) return 0;
	let suma = 0;
	for (const x of samples) suma += x * x;
	return Math.sqrt(suma / samples.length);
}
