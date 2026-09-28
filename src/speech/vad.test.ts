import { describe, expect, it } from "vitest";
import { createVad, rms, stepVad, VAD, type VadState } from "@/speech/vad";

const FRAME = 50;
const RUIDO = 0.001;
const VOZ = 0.3;

/** Alimenta el VAD con frames de `FRAME` ms; `niveles` da el rms de cada uno. */
function correr(
	niveles: number[],
	t0 = 0,
	frameMs = FRAME,
): { estados: VadState[]; ts: number[] } {
	let s = createVad(t0);
	const estados: VadState[] = [];
	const ts: number[] = [];
	niveles.forEach((nivel, i) => {
		const t = t0 + (i + 1) * frameMs;
		s = stepVad(s, { rms: nivel, t });
		estados.push(s);
		ts.push(t);
	});
	return { estados, ts };
}

const repetir = (nivel: number, n: number) => Array<number>(n).fill(nivel);
const primeroHecho = (r: ReturnType<typeof correr>) => {
	const i = r.estados.findIndex((e) => e.done);
	return i < 0 ? null : r.ts[i];
};

describe("rms", () => {
	it("S1: ceros dan 0 y una onda cuadrada de ±0.5 da 0.5", () => {
		expect(rms(new Float32Array(64))).toBe(0);
		const cuadrada = Float32Array.from({ length: 64 }, (_, i) =>
			i % 2 === 0 ? 0.5 : -0.5,
		);
		expect(rms(cuadrada)).toBeCloseTo(0.5, 6);
	});

	it("un buffer vacío da 0, no NaN", () => {
		expect(rms(new Float32Array(0))).toBe(0);
	});
});

describe("stepVad", () => {
	it("S2: 3 s de silencio terminan en MAX_MS sin haber oído nada", () => {
		const r = correr(repetir(RUIDO, 60));
		expect(primeroHecho(r)).toBe(VAD.MAX_MS);
		expect(r.estados.at(-1)?.heard).toBe(false);
		expect(r.estados.at(-2)?.done).toBe(false);
	});

	it("S3: clics sueltos de un frame nunca cuentan como voz", () => {
		// Tres clics separados: sin el reinicio de runMs sumarían 150 ms y pasarían de 120.
		const niveles = [
			...repetir(RUIDO, 3),
			VOZ,
			...repetir(RUIDO, 3),
			VOZ,
			...repetir(RUIDO, 3),
			VOZ,
			...repetir(RUIDO, 50),
		];
		const r = correr(niveles);
		expect(r.estados.some((e) => e.heard)).toBe(false);
	});

	it("S4: 400 ms de habla y silencio terminan a los 600 ms del último frame de voz, ni antes", () => {
		const r = correr([...repetir(VOZ, 8), ...repetir(RUIDO, 20)]);
		const ultimaVoz = 8 * FRAME;
		expect(r.estados[7]?.heard).toBe(true);
		expect(primeroHecho(r)).toBe(ultimaVoz + VAD.SILENCE_AFTER_MS);
	});

	it("S5: una pausa de 300 ms entre habla no termina; el silencio se mide desde la última voz", () => {
		const r = correr([
			...repetir(VOZ, 6), // 0-300 ms
			...repetir(RUIDO, 6), // pausa de 300 ms
			...repetir(VOZ, 6), // sigue hablando hasta 900 ms
			...repetir(RUIDO, 20),
		]);
		const durantePausa = r.estados.slice(0, 18);
		expect(durantePausa.some((e) => e.done)).toBe(false);
		expect(primeroHecho(r)).toBe(18 * FRAME + VAD.SILENCE_AFTER_MS);
	});

	it("S6: habla continua de 5 s termina en MAX_MS con heard", () => {
		const r = correr(repetir(VOZ, 100));
		expect(primeroHecho(r)).toBe(VAD.MAX_MS);
		expect(r.estados.find((e) => e.done)?.heard).toBe(true);
	});

	it("un rms justo en SPEECH_RMS cuenta como voz", () => {
		const r = correr(repetir(VAD.SPEECH_RMS, 3), 0, 40);
		expect(r.estados.at(-1)?.heard).toBe(true); // 3 x 40 = 120 = MIN_SPEECH_MS
		const justoDebajo = correr(repetir(VAD.SPEECH_RMS - 1e-6, 10));
		expect(justoDebajo.estados.at(-1)?.heard).toBe(false);
	});

	it("MIN_SPEECH_MS es inclusivo: 120 ms seguidos oyen y 110 no", () => {
		expect(correr(repetir(VOZ, 3), 0, 40).estados.at(-1)?.heard).toBe(true);
		expect(correr(repetir(VOZ, 2), 0, 55).estados.at(-1)?.heard).toBe(false);
	});

	it("heard no retrocede aunque llegue silencio", () => {
		const r = correr([...repetir(VOZ, 4), ...repetir(RUIDO, 5)]);
		expect(r.estados.at(-1)?.heard).toBe(true);
		expect(r.estados.at(-1)?.done).toBe(false);
	});

	it("una vez done, el estado no cambia", () => {
		const r = correr(repetir(RUIDO, 60));
		const fin = r.estados.at(-1);
		if (fin === undefined) throw new Error("sin estados");
		expect(stepVad(fin, { rms: VOZ, t: fin.prevT + FRAME })).toEqual(fin);
	});

	it("un frame lento no infla runMs más allá del tiempo real transcurrido", () => {
		const s = stepVad(createVad(1000), { rms: VOZ, t: 1050 });
		expect(s.runMs).toBe(50);
		expect(s.lastVoiceAt).toBe(1050);
	});
});
