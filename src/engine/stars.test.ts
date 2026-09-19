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
	});
});

describe("firstTryRatio", () => {
	it("es la fracción de aciertos sin ayuda", () => {
		expect(firstTryRatio([perfecto, conPista])).toBe(0.5);
		expect(firstTryRatio([])).toBe(0);
	});
});
