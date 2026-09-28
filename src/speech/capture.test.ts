import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMicListener,
	createScriptedListener,
	type ListenResult,
} from "@/speech/capture";

const FRAME = 50;

/** Un micrófono falso: 2 pistas, un contexto que anota `close` y un analizador con nivel programable. */
function montar(
	opciones: { fallaEnFrame?: number; suspendido?: boolean } = {},
) {
	let t = 0;
	let nivel = 0.001;
	let llamadas = 0;
	const pistas = [{ stop: vi.fn() }, { stop: vi.fn() }];
	const stream = { getTracks: () => pistas } as unknown as MediaStream;
	const close = vi.fn(async () => {});
	const analyser = {
		fftSize: 0,
		getFloatTimeDomainData(buf: Float32Array) {
			llamadas += 1;
			if (llamadas === opciones.fallaEnFrame)
				throw new Error("analizador roto");
			buf.fill(nivel);
		},
	};
	let liberarResume: () => void = () => {};
	const ctx = {
		state: opciones.suspendido ? "suspended" : "running",
		resume: vi.fn(
			() =>
				new Promise<void>((res) => {
					liberarResume = res;
				}),
		),
		createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
		createAnalyser: vi.fn(() => analyser),
		close,
	} as unknown as AudioContext;
	const getUserMedia = vi.fn(async (_c: MediaStreamConstraints) => stream);
	const listener = createMicListener({
		getUserMedia,
		createAudioContext: () => ctx,
		now: () => t,
		frameMs: FRAME,
	});
	/** Avanza un frame con el nivel dado. */
	const tick = async (n: number) => {
		nivel = n;
		t += FRAME;
		await vi.advanceTimersByTimeAsync(FRAME);
	};
	const ticks = async (n: number, cuantos: number) => {
		for (let i = 0; i < cuantos; i++) await tick(n);
	};
	return {
		listener,
		pistas,
		close,
		ctx,
		getUserMedia,
		tick,
		ticks,
		liberarResume: () => liberarResume(),
	};
}

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

const dejarAbierto = async () => {
	await vi.advanceTimersByTimeAsync(0);
};

describe("createMicListener", () => {
	it("S7: habla y silencio dan heard, con onLevel en cada frame y las constraints de P7", async () => {
		const m = montar();
		const niveles: number[] = [];
		const p = m.listener.listen({ onLevel: (r) => niveles.push(r) });
		await dejarAbierto();
		await m.ticks(0.3, 8);
		await m.ticks(0.001, 12);
		await expect(p).resolves.toEqual({ kind: "heard" });
		expect(niveles).toHaveLength(20);
		expect(niveles[0]).toBeCloseTo(0.3, 5);
		expect(m.getUserMedia).toHaveBeenCalledWith({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
			},
		});
	});

	it("solo silencio termina en silence a los 3 s", async () => {
		const m = montar();
		const p = m.listener.listen();
		await dejarAbierto();
		await m.ticks(0.001, 60);
		await expect(p).resolves.toEqual({ kind: "silence" });
	});

	it("S8: abortar a mitad da aborted y cierra pistas y contexto", async () => {
		const m = montar();
		const ac = new AbortController();
		const p = m.listener.listen({ signal: ac.signal });
		await dejarAbierto();
		await m.ticks(0.3, 3);
		ac.abort();
		await expect(p).resolves.toEqual({ kind: "aborted" });
		for (const pista of m.pistas) expect(pista.stop).toHaveBeenCalledTimes(1);
		expect(m.close).toHaveBeenCalledTimes(1);
	});

	it("un aborto durante ctx.resume() da aborted aunque el resume se libere después, y cierra todo", async () => {
		const m = montar({ suspendido: true });
		const ac = new AbortController();
		const p = m.listener.listen({ signal: ac.signal });
		await dejarAbierto(); // getUserMedia resuelto; resume() pendiente
		ac.abort();
		m.liberarResume();
		await dejarAbierto(); // deja que listen retome tras el resume
		await m.ticks(0.001, 60);
		await expect(p).resolves.toEqual({ kind: "aborted" });
		for (const pista of m.pistas) expect(pista.stop).toHaveBeenCalledTimes(1);
		expect(m.close).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
		// Ni siquiera se llega a conectar el analizador tras un aborto durante el resume.
		expect(m.ctx.createAnalyser).not.toHaveBeenCalled();
	});

	it("un ctx.resume() que nunca termina no deja listen colgado ante un abort", async () => {
		const m = montar({ suspendido: true });
		const ac = new AbortController();
		const p = m.listener.listen({ signal: ac.signal });
		await dejarAbierto();
		ac.abort(); // el resume no se libera nunca
		await expect(p).resolves.toEqual({ kind: "aborted" });
		for (const pista of m.pistas) expect(pista.stop).toHaveBeenCalledTimes(1);
		expect(m.close).toHaveBeenCalledTimes(1);
	});

	it("con el contexto suspendido y sin aborto, tras el resume escucha con normalidad", async () => {
		const m = montar({ suspendido: true });
		const p = m.listener.listen();
		await dejarAbierto();
		m.liberarResume();
		await dejarAbierto();
		await m.ticks(0.3, 8);
		await m.ticks(0.001, 12);
		await expect(p).resolves.toEqual({ kind: "heard" });
		expect(m.ctx.resume).toHaveBeenCalledTimes(1);
	});

	it("S8: con la señal ya abortada ni abre el micrófono", async () => {
		const m = montar();
		const ac = new AbortController();
		ac.abort();
		await expect(m.listener.listen({ signal: ac.signal })).resolves.toEqual({
			kind: "aborted",
		});
		expect(m.getUserMedia).not.toHaveBeenCalled();
	});

	it("S8: tras heard también se cierran pistas y contexto, y el intervalo se para", async () => {
		const m = montar();
		const p = m.listener.listen();
		await dejarAbierto();
		await m.ticks(0.3, 8);
		await m.ticks(0.001, 12);
		await p;
		for (const pista of m.pistas) expect(pista.stop).toHaveBeenCalledTimes(1);
		expect(m.close).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("S8: tras silence también se cierran pistas y contexto", async () => {
		const m = montar();
		const p = m.listener.listen();
		await dejarAbierto();
		await m.ticks(0.001, 60);
		await p;
		for (const pista of m.pistas) expect(pista.stop).toHaveBeenCalledTimes(1);
		expect(m.close).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("S9: si el analizador lanza a mitad, unavailable/error y aun así se paran las pistas", async () => {
		const m = montar({ fallaEnFrame: 3 });
		const p = m.listener.listen();
		await dejarAbierto();
		await m.ticks(0.3, 3);
		await expect(p).resolves.toEqual({ kind: "unavailable", reason: "error" });
		for (const pista of m.pistas) expect(pista.stop).toHaveBeenCalledTimes(1);
		expect(m.close).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("si crear el contexto lanza, las pistas del micrófono ya abierto se paran", async () => {
		const pistas = [{ stop: vi.fn() }];
		const listener = createMicListener({
			getUserMedia: async () =>
				({ getTracks: () => pistas }) as unknown as MediaStream,
			createAudioContext: () => {
				throw new Error("sin AudioContext");
			},
		});
		await expect(listener.listen()).resolves.toEqual({
			kind: "unavailable",
			reason: "error",
		});
		expect(pistas[0]?.stop).toHaveBeenCalledTimes(1);
	});

	it("abortar mientras se pide el permiso para las pistas en cuanto llegan", async () => {
		const pistas = [{ stop: vi.fn() }];
		let entregar: (s: MediaStream) => void = () => {};
		const listener = createMicListener({
			getUserMedia: () =>
				new Promise<MediaStream>((res) => {
					entregar = res;
				}),
			createAudioContext: () => {
				throw new Error("no debería crearse");
			},
		});
		const ac = new AbortController();
		const p = listener.listen({ signal: ac.signal });
		ac.abort();
		entregar({ getTracks: () => pistas } as unknown as MediaStream);
		await expect(p).resolves.toEqual({ kind: "aborted" });
		expect(pistas[0]?.stop).toHaveBeenCalledTimes(1);
	});

	it("S10: sin getUserMedia da unavailable/no-api, sin lanzar", async () => {
		vi.stubGlobal("navigator", {});
		try {
			const listener = createMicListener();
			await expect(listener.listen()).resolves.toEqual({
				kind: "unavailable",
				reason: "no-api",
			});
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it.each([
		["NotAllowedError", "denied"],
		["SecurityError", "denied"],
		["NotFoundError", "error"],
		["Error", "error"],
	] as const)(
		"S11/S12: getUserMedia rechaza con %s -> %s",
		async (nombre, motivo) => {
			const listener = createMicListener({
				getUserMedia: async () => {
					const e = new Error("no");
					e.name = nombre;
					throw e;
				},
			});
			await expect(listener.listen()).resolves.toEqual({
				kind: "unavailable",
				reason: motivo,
			});
		},
	);

	it("un rechazo que no es un Error también da error, sin lanzar", async () => {
		const listener = createMicListener({
			getUserMedia: () => Promise.reject("texto suelto"),
		});
		await expect(listener.listen()).resolves.toEqual({
			kind: "unavailable",
			reason: "error",
		});
	});
});

describe("createScriptedListener", () => {
	it("devuelve los resultados en orden y repite el último", async () => {
		const resultados: ListenResult[] = [{ kind: "silence" }, { kind: "heard" }];
		const l = createScriptedListener(resultados);
		expect(await l.listen()).toEqual({ kind: "silence" });
		expect(await l.listen()).toEqual({ kind: "heard" });
		expect(await l.listen()).toEqual({ kind: "heard" });
	});
});
