export type PlayStyle = "normal" | "by-syllable" | "beats";

export type AudioRequest = {
	/** Clave del manifiesto de audio. */
	key: string;
	/** "normal" por omisión. */
	style?: PlayStyle;
	/** Obligatorio en `by-syllable` y `beats`. */
	syllables?: readonly string[];
	/**
	 * Se llama al empezar cada sílaba, pero solo se garantiza cuando suena: no se llama con
	 * `synth` indefinido, antes de `unlock` ni en el reproductor silencioso. La interfaz no
	 * debe depender de él para avanzar.
	 */
	onSegment?: (index: number) => void;
};

export interface AudioPlayer {
	readonly unlocked: boolean;
	/** Se llama dentro del gesto «Toca para empezar». */
	unlock(): Promise<void>;
	/** Resuelve al terminar de sonar. */
	play(request: AudioRequest): Promise<void>;
	/** Corta lo que suena y vacía la cola. No cancela un `beat` ya lanzado. */
	stop(): void;
	/**
	 * Golpe suelto y síncrono: no hace cola, no pasa por el manifiesto y no exige `unlock`.
	 * Si el contexto de audio no está disponible o no está reanudado, no suena.
	 */
	beat(): void;
}
