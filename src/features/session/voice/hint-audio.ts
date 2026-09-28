import type { AudioPlayer, AudioRequest } from "@/audio";

/**
 * Lo máximo que se espera a que suene el audio de una pista o de una presentación. La interfaz
 * no depende de que un `play` suene ni acabe (deuda 2): navegador sin voz, audio colgado o
 * `play` que nunca resuelve. Pasado este tiempo se sigue como si hubiera acabado.
 */
export const HINT_AUDIO_MAX_MS = 2500;

/**
 * Reproduce y espera a que acabe, con tope `HINT_AUDIO_MAX_MS`. Nunca rechaza: si el audio
 * falla, se sigue igual (el sonido acompaña, no manda). El audio que pasa del tope sigue su
 * cola; solo se deja de esperar.
 */
export function playCapped(
	audio: AudioPlayer,
	request: AudioRequest,
): Promise<void> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const tope = new Promise<void>((resolve) => {
		timer = setTimeout(resolve, HINT_AUDIO_MAX_MS);
	});
	let sonando: Promise<void>;
	try {
		sonando = Promise.resolve(audio.play(request)).catch(() => {});
	} catch {
		sonando = Promise.resolve();
	}
	return Promise.race([sonando, tope]).finally(() => clearTimeout(timer));
}
