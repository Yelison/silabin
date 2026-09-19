import { describe, expect, it } from "vitest";
import { firstTryRatio, starsForSession } from "@/engine/stars";
import type { ExerciseResolution } from "@/engine/types";

const perfecto: ExerciseResolution = { status: "mastery-credit" };
const conPista: ExerciseResolution = {
	status: "correct-with-hint",
	hintsUsed: 1,
};
const asistido: ExerciseResolution = { status: "assisted" };

describe("starsForSession", () => {
	it("da 3 estrellas si todo se acertó al primer intento", () => {
		expect(
			starsForSession([perfecto, perfecto, perfecto, perfecto, perfecto]),
		).toBe(3);
	});

	it("da 2 estrellas con el 80 por ciento al primer intento", () => {
		expect(
			starsForSession([perfecto, perfecto, perfecto, perfecto, conPista]),
		).toBe(2);
	});

	it("da 1 estrella por completar cuando no llega al 80 por ciento", () => {
		expect(
			starsForSession([perfecto, conPista, asistido, asistido, asistido]),
		).toBe(1);
	});

	it("da 1 estrella aunque no haya acertado nada al primer intento", () => {
		expect(starsForSession([asistido, asistido, asistido])).toBe(1);
	});

	it("no da estrellas si no hubo ejercicios evaluados", () => {
		expect(starsForSession([])).toBe(0);
	});

	it("no premia la velocidad: dos sesiones con los mismos resultados dan lo mismo", () => {
		const a = starsForSession([perfecto, perfecto, conPista]);
		const b = starsForSession([conPista, perfecto, perfecto]);
		expect(a).toBe(b);
		expect(a).toBe(1);
	});
});

describe("firstTryRatio", () => {
	it("es la fracción de aciertos sin ayuda", () => {
		expect(firstTryRatio([perfecto, conPista])).toBe(0.5);
		expect(firstTryRatio([])).toBe(0);
	});
});

describe("los umbrales están anclados por arriba y por abajo", () => {
	const rep = (n: number, r: ExerciseResolution) =>
		Array.from({ length: n }, () => r);

	it("el umbral de tres estrellas es el 100 por cien, no el 90", () => {
		// Con sesiones de 5 ejercicios ninguna proporción cae entre el 80 y el 100, así que el
		// umbral podía bajarse al 90 % sin que ningún test fallara: el premio máximo habría
		// dejado de significar "todo perfecto" en silencio.
		expect(starsForSession([...rep(9, perfecto), conPista])).toBe(2);
		expect(starsForSession([...rep(19, perfecto), conPista])).toBe(2);
		expect(starsForSession(rep(10, perfecto))).toBe(3);
	});

	it("el umbral de dos estrellas es el 80 por ciento, no menos", () => {
		// Se comprueba justo por debajo del umbral en tres tamaños de sesión distintos: con
		// solo sesiones de 5, el umbral podía valer cualquier cosa entre el 20 y el 80 %.
		expect(starsForSession([...rep(3, perfecto), conPista])).toBe(1); // 75 %
		expect(starsForSession([...rep(7, perfecto), ...rep(3, conPista)])).toBe(1); // 70 %
		expect(starsForSession([...rep(8, perfecto), ...rep(2, conPista)])).toBe(2); // 80 % justo
	});

	it("nada resta: la proporción nunca es negativa ni con la peor sesión", () => {
		// Si los ejercicios resueltos con ayuda restaran, la proporción se volvería negativa y
		// ningún umbral lo notaría, porque el resultado seguiría siendo una estrella.
		expect(firstTryRatio(rep(5, asistido))).toBe(0);
		expect(firstTryRatio([perfecto, ...rep(9, asistido)])).toBeCloseTo(0.1);
		expect(
			firstTryRatio([perfecto, conPista, ...rep(3, asistido)]),
		).toBeCloseTo(0.2);
		for (const resultados of [
			rep(1, asistido),
			rep(8, asistido),
			[conPista, asistido],
		]) {
			expect(firstTryRatio(resultados)).toBeGreaterThanOrEqual(0);
			expect(starsForSession(resultados)).toBe(1);
		}
	});
});
