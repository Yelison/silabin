import { describe, expect, it } from "vitest";
import { createAttemptState, recordAttempt } from "@/engine/attempts";

describe("primer intento", () => {
	it("acertar da crédito de dominio y no muestra pista", () => {
		const step = recordAttempt("listen-tap", createAttemptState(), "correct");
		expect(step.resolution).toEqual({ status: "mastery-credit" });
		expect(step.hint).toBeNull();
		expect(step.state.resolved).toBe(true);
	});

	it("fallar muestra el rung reduce y pasa al segundo intento", () => {
		const step = recordAttempt("listen-tap", createAttemptState(), "wrong");
		expect(step.resolution).toBeNull();
		expect(step.hint?.rung).toBe("reduce");
		expect(step.state).toEqual({ attempt: 2, hintsShown: 1, resolved: false });
	});
});

describe("segundo intento", () => {
	const tras1Fallo = recordAttempt(
		"listen-tap",
		createAttemptState(),
		"wrong",
	).state;

	it("acertar cuenta como correcto con una pista", () => {
		const step = recordAttempt("listen-tap", tras1Fallo, "correct");
		expect(step.resolution).toEqual({
			status: "correct-with-hint",
			hintsUsed: 1,
		});
	});

	it("fallar muestra el rung sound y pasa al tercer intento", () => {
		const step = recordAttempt("listen-tap", tras1Fallo, "wrong");
		expect(step.hint?.rung).toBe("sound");
		expect(step.state).toEqual({ attempt: 3, hintsShown: 2, resolved: false });
	});
});

describe("tercer intento", () => {
	const tras2Fallos = recordAttempt(
		"listen-tap",
		recordAttempt("listen-tap", createAttemptState(), "wrong").state,
		"wrong",
	).state;

	it("acertar cuenta como correcto con dos pistas", () => {
		const step = recordAttempt("listen-tap", tras2Fallos, "correct");
		expect(step.resolution).toEqual({
			status: "correct-with-hint",
			hintsUsed: 2,
		});
	});

	it("fallar muestra el modelo y resuelve como asistido", () => {
		const step = recordAttempt("listen-tap", tras2Fallos, "wrong");
		expect(step.hint?.rung).toBe("model");
		expect(step.resolution).toEqual({ status: "assisted" });
		expect(step.state).toEqual({ attempt: 3, hintsShown: 3, resolved: true });
	});
});

describe("invariantes de la escalera", () => {
	it("nunca hay un cuarto intento: tres fallos siempre resuelven", () => {
		let state = createAttemptState();
		for (let i = 0; i < 3; i += 1) {
			const step = recordAttempt("say-it", state, "wrong");
			state = step.state;
		}
		expect(state.resolved).toBe(true);
	});

	it("lanza si se registra un intento sobre un ejercicio ya resuelto", () => {
		const resuelto = recordAttempt(
			"listen-tap",
			createAttemptState(),
			"correct",
		).state;
		expect(() => recordAttempt("listen-tap", resuelto, "wrong")).toThrow(
			/resuelto/i,
		);
	});

	it("sirve igual para las plantillas sin opciones, donde no hay nada que resaltar", () => {
		const step = recordAttempt("say-it", createAttemptState(), "wrong");
		expect(step.hint?.action).toBe("show-mouth+replay-instruction");
	});

	it("el rung model de las plantillas de voz acepta cualquier habla", () => {
		let state = createAttemptState();
		for (let i = 0; i < 2; i += 1)
			state = recordAttempt("read-word", state, "wrong").state;
		const step = recordAttempt("read-word", state, "wrong");
		expect(step.hint?.action).toBe("play-full+accept-any-speech");
	});
});
