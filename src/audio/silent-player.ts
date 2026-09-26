import type { AudioPlayer } from "@/audio/types";

/** Reproductor que no suena nada: resuelve todo al instante. Para pruebas y modo sin sonido. */
export function createSilentPlayer(): AudioPlayer {
	let unlocked = false;
	return {
		get unlocked() {
			return unlocked;
		},
		unlock() {
			unlocked = true;
			return Promise.resolve();
		},
		play() {
			return Promise.resolve();
		},
		stop() {},
		beat() {},
	};
}
