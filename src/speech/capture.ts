import { createVad, rms, stepVad } from "@/speech/vad";

export type ListenResult =
	| { kind: "heard" }
	| { kind: "silence" }
	| { kind: "aborted" }
	| { kind: "unavailable"; reason: "no-api" | "denied" | "error" };

export type Listener = {
	listen(opts?: {
		onLevel?(rms: number): void;
		/**
		 * Se llama una sola vez, exactamente cuando el micrófono está listo para medir Y ya pasó
		 * `warmupMs` desde la llamada (lo que tarde más manda). Antes de este instante no llega
		 * ningún frame: quien escucha puede usarlo para pasar su UI de "preparando" a "escuchando"
		 * sin arriesgarse a que sea antes de tiempo.
		 */
		onReady?(): void;
		/**
		 * Colchón mínimo (P7) desde la llamada a `listen` antes de que un frame cuente para el VAD.
		 * La preparación del micrófono (permiso, `AudioContext`, analizador) ocurre en paralelo con
		 * este colchón, no después: si tarda más que `warmupMs` (como en iOS Safari, medido en
		 * dispositivo real), se espera a que esté lista; si tarda menos, se espera igual a que se
		 * cumpla `warmupMs`. Por defecto 0 (sin colchón forzado, el comportamiento previo).
		 */
		warmupMs?: number;
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

/**
 * Lo máximo que se espera a `ctx.resume()`. En iOS Safari el contexto se crea fuera del gesto y
 * `resume()` puede no resolverse nunca: pasado este tiempo se da el micrófono por no disponible
 * y se ofrecen los botones del adulto (P4/P6).
 */
export const RESUME_MAX_MS = 1500;

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
 * No se graba nada: solo se mide la energía de cada frame y se descarta. El analizador se conecta
 * a `ctx.destination` (en silencio) porque en WebKit/iOS Safari un `AnalyserNode` fuera del grafo
 * que llega hasta destination no procesa audio real y siempre mide silencio.
 *
 * `getUserMedia()` puede tardar 800-1700 ms en dispositivos reales (medido en iOS Safari):
 * `warmupMs` corre en paralelo con esa preparación, no en serie. `onReady` avisa cuando ambas
 * cosas se cumplen (mic listo y colchón agotado) y es el único instante desde el que un frame
 * puede llegar a contar para el VAD.
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

			// El colchón (P7) corre desde ya, en paralelo con la apertura del micrófono: gana el que
			// tarde más (Ruling post-PR). Se arranca antes de `getUserMedia` para que de verdad sean
			// concurrentes, no en serie.
			const warmupMs = opts?.warmupMs ?? 0;
			let warmupListo = warmupMs <= 0;
			let warmupTimer: ReturnType<typeof setTimeout> | undefined;
			const warmup: Promise<void> = warmupListo
				? Promise.resolve()
				: new Promise((res) => {
						warmupTimer = setTimeout(() => {
							warmupListo = true;
							res();
						}, warmupMs);
					});

			let stream: MediaStream;
			try {
				stream = await getUserMedia(CONSTRAINTS);
			} catch (e) {
				clearTimeout(warmupTimer);
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
				if (ctx.state === "suspended") {
					let tope: ReturnType<typeof setTimeout> | undefined;
					const sinResume = new Promise<"tope">((res) => {
						tope = setTimeout(() => res("tope"), RESUME_MAX_MS);
					});
					const espera = await Promise.race([
						ctx.resume().then(() => "listo" as const),
						cancelacion.then(() => "aborto" as const),
						sinResume,
					]).finally(() => clearTimeout(tope));
					if (espera === "tope" && !abortado)
						return { kind: "unavailable", reason: "error" };
				}
				if (abortado) return { kind: "aborted" };
				const analyser = ctx.createAnalyser();
				analyser.fftSize = FFT_SIZE;
				ctx.createMediaStreamSource(stream).connect(analyser);
				// WebKit/iOS Safari no procesa audio real en un AnalyserNode cuyo grafo no llega
				// conectado hasta destination; se enlaza a través de un gain mudo para que el
				// analizador sí reciba datos, sin que se oiga el propio micrófono.
				const silencioso = ctx.createGain();
				silencioso.gain.value = 0;
				analyser.connect(silencioso);
				silencioso.connect(ctx.destination);

				if (!warmupListo) {
					const espera = await Promise.race([
						warmup.then(() => "listo" as const),
						cancelacion.then(() => "aborto" as const),
					]);
					if (espera === "aborto") return { kind: "aborted" };
				}
				if (abortado) return { kind: "aborted" };
				opts?.onReady?.();

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
				clearTimeout(warmupTimer);
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
