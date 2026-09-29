import { describe, expect, it } from "vitest";
import { adultChallenge } from "@/features/adult/challenge";

function secuencia(valores: readonly number[]): () => number {
	let i = 0;
	return () => valores[i++ % valores.length] ?? 0;
}

describe("adultChallenge", () => {
	it("N5: con random fijo, la pregunta y la respuesta coinciden, con factores entre 6 y 9", () => {
		// random() = 0 da el factor mínimo (6); un valor justo bajo 1 da el máximo (9).
		const { question, answer } = adultChallenge(secuencia([0, 0.999]));
		expect(question).toBe("¿Cuánto es 6 × 9?");
		expect(answer).toBe(54);
	});

	it("los dos factores siempre caen entre 6 y 9, para cualquier random en [0,1)", () => {
		for (const r of [0, 0.1, 0.24, 0.25, 0.5, 0.75, 0.99]) {
			const { question, answer } = adultChallenge(() => r);
			const match = /¿Cuánto es (\d+) × (\d+)\?/.exec(question);
			expect(match).not.toBeNull();
			const [, aTexto, bTexto] = match as RegExpExecArray;
			const a = Number(aTexto);
			const b = Number(bTexto);
			expect(a).toBeGreaterThanOrEqual(6);
			expect(a).toBeLessThanOrEqual(9);
			expect(b).toBeGreaterThanOrEqual(6);
			expect(b).toBeLessThanOrEqual(9);
			expect(answer).toBe(a * b);
		}
	});

	it("dos llamadas con el mismo random repiten la misma pregunta", () => {
		const uno = adultChallenge(secuencia([0.4, 0.6]));
		const dos = adultChallenge(secuencia([0.4, 0.6]));
		expect(uno).toEqual(dos);
	});
});
