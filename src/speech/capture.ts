import { createVad, rms, stepVad } from "@/speech/vad";

export type ListenResult =
	| { kind: "heard" }
	| { kind: "silence" }
	| { kind: "aborted" }
	| { kind: "unavailable"; reason: "no-api" | "denied" | "error" };

export type Listener = {
	listen(opts?: {
		onLevel?(rms: number): void;
		signal?: AbortSignal;
	}): Promise<ListenResult>;
};

/** P7: sin cancelación de eco, la voz de la app se oiría a sí misma como habla del niño. */
const CONSTRAINTS: MediaStreamConstraints = {
	audio: {
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
	},
};

const FFT_SIZE = 1024;

function razonDeFallo(e: unknown): "denied" | "error" {
	const nombre =
		typeof e === "object" && e !== null && "name" in e ? e.name : undefined;
	return nombre === "NotAllowedError" || nombre === "SecurityError"
		? "denied"
		: "error";
}

function contextoDelNavegador(): AudioContext {
	const Ctor =
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (Ctor === undefined)
		throw new Error("Este navegador no tiene AudioContext");
	return new Ctor();
}

function getUserMediaDelNavegador():
	| ((c: MediaStreamConstraints) => Promise<MediaStream>)
	| undefined {
	if (typeof navigator === "undefined") return undefined;
	const devices = navigator.mediaDevices;
	if (devices === undefined || typeof devices.getUserMedia !== "function")
		return undefined;
	return (c) => devices.getUserMedia(c);
}

/**
 * Escucha el micrófono lo justo para saber si el niño habló. El micrófono se abre y se cierra en
 * cada turno (P6): el `finally` para el intervalo, las pistas y el contexto pase lo que pase.
 * No se graba nada: solo se mide la energía de cada frame y se descarta.
 */
export function createMicListener(deps?: {
	getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
	createAudioContext?: () => AudioContext;
	now?: () => number;
	frameMs?: number;
}): Listener {
	return {
		async listen(opts) {
			const getUserMedia = deps?.getUserMedia ?? getUserMediaDelNavegador();
			if (getUserMedia === undefined)
				return { kind: "unavailable", reason: "no-api" };
			const signal = opts?.signal;
			if (signal?.aborted) return { kind: "aborted" };

			let stream: MediaStream;
			try {
				stream = await getUserMedia(CONSTRAINTS);
			} catch (e) {
				return { kind: "unavailable", reason: razonDeFallo(e) };
			}

			const now = deps?.now ?? (() => performance.now());
			const frameMs = deps?.frameMs ?? 50;
			let ctx: AudioContext | undefined;
			let timer: ReturnType<typeof setInterval> | undefined;
			// Se escucha el aborto desde que hay micrófono, no solo durante el bucle: un `abort` que
			// llega mientras se espera a `ctx.resume()` no vuelve a emitir evento (P6).
			let abortado = false;
			let avisarAborto: () => void = () => {};
			const cancelacion = new Promise<void>((res) => {
				avisarAborto = res;
			});
			const alAbortar = () => {
				abortado = true;
				avisarAborto();
			};
			signal?.addEventListener("abort", alAbortar, { once: true });
			try {
				if (signal?.aborted) return { kind: "aborted" };
				ctx = (deps?.createAudioContext ?? contextoDelNavegador)();
				// Si `resume()` no termina, el aborto también libera la espera.
				if (ctx.state === "suspended")
					await Promise.race([ctx.resume(), cancelacion]);
				if (abortado) return { kind: "aborted" };
				const analyser = ctx.createAnalyser();
				analyser.fftSize = FFT_SIZE;
				ctx.createMediaStreamSource(stream).connect(analyser);
				const buffer = new Float32Array(analyser.fftSize);
				return await new Promise<ListenResult>((resolve, reject) => {
					let vad = createVad(now());
					void cancelacion.then(() => resolve({ kind: "aborted" }));
					timer = setInterval(() => {
						try {
							analyser.getFloatTimeDomainData(buffer);
							const nivel = rms(buffer);
							opts?.onLevel?.(nivel);
							vad = stepVad(vad, { rms: nivel, t: now() });
							if (vad.done) resolve({ kind: vad.heard ? "heard" : "silence" });
						} catch (e) {
							reject(e);
						}
					}, frameMs);
				});
			} catch {
				return { kind: "unavailable", reason: "error" };
			} finally {
				if (timer !== undefined) clearInterval(timer);
				signal?.removeEventListener("abort", alAbortar);
				for (const pista of stream.getTracks()) {
					try {
						pista.stop();
					} catch {
						// Una pista que no se deja parar no debe impedir parar las demás.
					}
				}
				if (ctx !== undefined) {
					try {
						await ctx.close();
					} catch {
						// El contexto ya estaba cerrado.
					}
				}
			}
		},
	};
}

/** Un `Listener` que devuelve resultados de una lista (el último se repite). Para tests y /dev. */
export function createScriptedListener(results: ListenResult[]): Listener {
	let i = 0;
	return {
		async listen() {
			const r = results[Math.min(i, results.length - 1)];
			i += 1;
			return r ?? { kind: "unavailable", reason: "error" };
		},
	};
}
