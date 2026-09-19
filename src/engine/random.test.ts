import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/random";
import { emptyItemProgress, emptyProgressState } from "@/engine/types";

describe("createRng", () => {
	it("produce la misma secuencia con la misma semilla", () => {
		const a = createRng(42);
		const b = createRng(42);
		expect([a.next(), a.next(), a.next()]).toEqual([
			b.next(),
			b.next(),
			b.next(),
		]);
	});

	it("produce secuencias distintas con semillas distintas", () => {
		expect(createRng(1).next()).not.toBe(createRng(2).next());
	});

	it("devuelve valores dentro de [0, 1)", () => {
		const rng = createRng(7);
		for (let i = 0; i < 200; i += 1) {
			const value = rng.next();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	it("int devuelve enteros dentro del rango", () => {
		const rng = createRng(3);
		for (let i = 0; i < 100; i += 1) {
			const value = rng.int(5);
			expect(Number.isInteger(value)).toBe(true);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(5);
		}
	});

	it("pick elige un elemento del arreglo", () => {
		const rng = createRng(9);
		const items = ["a", "b", "c"];
		for (let i = 0; i < 50; i += 1) expect(items).toContain(rng.pick(items));
	});

	it("pick lanza con un arreglo vacío", () => {
		expect(() => createRng(1).pick([])).toThrow(/vacío/i);
	});

	it("pick no devuelve siempre el mismo elemento", () => {
		// Que el resultado pertenezca al arreglo es necesario pero no suficiente: una
		// implementación que devolviera siempre el primero lo cumpliría igual.
		const rng = createRng(5);
		const items = ["a", "b", "c", "d"];
		const vistos = new Set(Array.from({ length: 200 }, () => rng.pick(items)));
		expect([...vistos].sort()).toEqual(items);
	});

	it("shuffle conserva todos los elementos y no muta el original", () => {
		const original = [1, 2, 3, 4, 5];
		const shuffled = createRng(11).shuffle(original);
		expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
		expect(original).toEqual([1, 2, 3, 4, 5]);
	});

	it("shuffle realmente reordena, no devuelve la entrada tal cual", () => {
		// Conservar los elementos y ser determinista son condiciones necesarias pero no
		// suficientes: una función que devolviera la entrada sin tocarla las cumpliría las dos.
		const original = Array.from({ length: 20 }, (_, index) => index);
		const reordenado = [1, 2, 3, 4, 5].some(
			(seed) =>
				createRng(seed).shuffle(original).join(",") !== original.join(","),
		);
		expect(reordenado).toBe(true);
	});

	it("int lanza si el máximo no es positivo", () => {
		expect(() => createRng(1).int(0)).toThrow(/mayor que cero/i);
		expect(() => createRng(1).int(-3)).toThrow(/mayor que cero/i);
	});

	it("shuffle es determinista con la misma semilla", () => {
		const items = [1, 2, 3, 4, 5, 6, 7, 8];
		expect(createRng(21).shuffle(items)).toEqual(createRng(21).shuffle(items));
	});
});

describe("estados iniciales", () => {
	it("emptyItemProgress arranca sin progreso y sin haberse presentado", () => {
		expect(emptyItemProgress()).toEqual({
			box: 0,
			presented: false,
			firstTryCorrect: 0,
			assisted: 0,
			lastSessionIndex: -1,
			lastCreditSession: null,
			masteredAt: null,
		});
	});

	it("emptyProgressState arranca vacío y con los contadores a cero", () => {
		expect(emptyProgressState()).toEqual({
			items: {},
			units: {},
			sessionCounter: 0,
			counters: { traces: 0, sessions: 0, voiceOk: 0, wordsRead: 0 },
		});
	});

	it("cada llamada devuelve un objeto nuevo, no una referencia compartida", () => {
		// Si devolvieran un singleton, el progreso de un ítem se filtraría a todos los demás.
		const a = emptyItemProgress();
		const b = emptyItemProgress();
		a.box = 3;
		expect(b.box).toBe(0);

		const uno = emptyProgressState();
		const dos = emptyProgressState();
		uno.counters.traces = 7;
		expect(dos.counters.traces).toBe(0);
	});
});
