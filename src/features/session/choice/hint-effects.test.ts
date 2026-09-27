import { describe, expect, it } from "vitest";
import {
	curriculum,
	emptyProgressState,
	expectedAnswer,
	type Item,
	type PlannedExercise,
	planSession,
} from "@/engine";
import {
	choiceEffect,
	onsetSplit,
} from "@/features/session/choice/hint-effects";

function item(id: string): Item {
	const found = curriculum.items.get(id);
	if (found === undefined) throw new Error(`Falta ${id}`);
	return found;
}

function ejercicio(
	it: Item,
	templateId: PlannedExercise["templateId"],
	optionIds: string[],
	correctOptionId: string,
): PlannedExercise {
	return {
		id: `ev:${it.id}`,
		kind: "evaluation",
		templateId,
		itemId: it.id,
		optionIds,
		correctOptionId,
		source: "active-unit",
	};
}

function efecto(action: string, it: Item, exercise: PlannedExercise) {
	const expected = expectedAnswer(exercise, it);
	if (expected === null) throw new Error("sin respuesta");
	return choiceEffect({
		action,
		exercise,
		item: it,
		optionIds: exercise.optionIds,
		expected,
		lookup: (id) => curriculum.items.get(id),
	});
}

// El motor mezcla: aquí la correcta va la segunda y el distractor el primero.
const RIMA = item("oral:rhyme:gato");
const EV_RIMA = ejercicio(
	RIMA,
	"rhyme",
	["picture:mesa", "picture:pato"],
	"picture:pato",
);
const INICIAL = item("oral:initial:avión");
const EV_INICIAL = ejercicio(
	INICIAL,
	"initial-sound",
	["picture:oso", "picture:avión", "picture:uva"],
	"picture:avión",
);

describe("choiceEffect", () => {
	it("X1 rhyme: repite el final del objetivo", () => {
		expect(efecto("replay-target-ending", RIMA, EV_RIMA)).toEqual({
			kind: "replay",
			request: { key: "ending:gato" },
		});
	});

	it("X1 rhyme: suena el final de cada opción en el orden de pantalla", () => {
		expect(efecto("replay-each-option-ending", RIMA, EV_RIMA)).toEqual({
			kind: "sequence",
			steps: [
				{ optionId: "picture:mesa", request: { key: "ending:mesa" } },
				{ optionId: "picture:pato", request: { key: "ending:pato" } },
			],
		});
	});

	it("X1 rhyme: marca la respuesta que da el motor", () => {
		expect(efecto("mark-correct+await-tap", RIMA, EV_RIMA)).toEqual({
			kind: "mark",
			optionId: "picture:pato",
		});
	});

	it("X1 initial-sound: atenúa el primer distractor de optionIds y repite el fonema", () => {
		expect(
			efecto("dim-one-distractor+replay-phoneme", INICIAL, EV_INICIAL),
		).toEqual({
			kind: "dim",
			optionId: "picture:oso",
			replay: { key: "phoneme:a" },
		});
		// Si la correcta va primera, el distractor es el siguiente: nunca la respuesta.
		const otra = ejercicio(
			INICIAL,
			"initial-sound",
			["picture:avión", "picture:oso", "picture:uva"],
			"picture:avión",
		);
		expect(
			efecto("dim-one-distractor+replay-phoneme", INICIAL, otra),
		).toMatchObject({ kind: "dim", optionId: "picture:oso" });
	});

	it("X1 initial-sound: cada opción suena partida en inicio y resto", () => {
		expect(efecto("replay-each-option-onset", INICIAL, EV_INICIAL)).toEqual({
			kind: "sequence",
			steps: [
				{
					optionId: "picture:oso",
					request: {
						key: "word:oso",
						style: "by-syllable",
						syllables: ["o", "so"],
					},
				},
				{
					optionId: "picture:avión",
					request: {
						key: "word:avión",
						style: "by-syllable",
						syllables: ["a", "vión"],
					},
				},
				{
					optionId: "picture:uva",
					request: {
						key: "word:uva",
						style: "by-syllable",
						syllables: ["u", "va"],
					},
				},
			],
		});
	});

	it("X1 initial-sound: marca la respuesta que da el motor, no la primera opción", () => {
		expect(efecto("mark-correct+await-tap", INICIAL, EV_INICIAL)).toEqual({
			kind: "mark",
			optionId: "picture:avión",
		});
	});

	it("una palabra de una sola sílaba suena entera, sin partir", () => {
		const sol = item("picture:sol");
		expect(onsetSplit(sol.syllables)).toBeNull();
		const ex = ejercicio(
			INICIAL,
			"initial-sound",
			["picture:sol", "picture:avión"],
			"picture:avión",
		);
		expect(efecto("replay-each-option-onset", INICIAL, ex)).toMatchObject({
			steps: [
				{ request: { key: "word:sol" } },
				{ request: { style: "by-syllable" } },
			],
		});
	});

	it("X2: una acción desconocida no hace nada y no lanza", () => {
		expect(efecto("accion-inventada", RIMA, EV_RIMA)).toEqual({ kind: "none" });
	});
});

// hear-it: no hay opciones de ejercicio; en pantalla son siempre «si» y «no».
const HEAR_PATO = item("oral:hear:a-pato");
const HEAR_SOL = item("oral:hear:a-sol");
const EV_HEAR_PATO = ejercicio(HEAR_PATO, "hear-it", [], "si");
const EV_HEAR_SOL = ejercicio(HEAR_SOL, "hear-it", [], "no");
// El motor no da correctOptionId a hear-it: la respuesta viene de item.task.answer.
const sinCorrecta = (e: PlannedExercise): PlannedExercise => ({
	...e,
	correctOptionId: null,
});

function efectoHear(action: string, it: Item, exercise: PlannedExercise) {
	const ex = sinCorrecta(exercise);
	const expected = expectedAnswer(ex, it);
	if (expected === null) throw new Error("sin respuesta");
	return choiceEffect({
		action,
		exercise: ex,
		item: it,
		optionIds: ["si", "no"],
		expected,
		lookup: (id) => curriculum.items.get(id),
	});
}

describe("choiceEffect: hear-it", () => {
	it("H3: replay-word-slowly repite la palabra separada en sus sílabas", () => {
		expect(efectoHear("replay-word-slowly", HEAR_PATO, EV_HEAR_PATO)).toEqual({
			kind: "replay",
			request: {
				key: "word:pato",
				style: "by-syllable",
				syllables: ["pa", "to"],
			},
		});
	});

	it("H4: con respuesta «si», la pista 2 alarga el sonido dentro de la palabra, sin opción", () => {
		expect(
			efectoHear("lengthen-target-phoneme-in-word", HEAR_PATO, EV_HEAR_PATO),
		).toEqual({
			kind: "pulse",
			optionId: null,
			request: { key: "stretch-in:a-pato" },
		});
	});

	it("H4: con respuesta «no», la pista 2 repite la palabra normal y no pide stretch-in", () => {
		expect(
			efectoHear("lengthen-target-phoneme-in-word", HEAR_SOL, EV_HEAR_SOL),
		).toEqual({
			kind: "pulse",
			optionId: null,
			request: { key: "word:sol" },
		});
	});

	it("H5: mark-correct-button+await-tap marca lo que da el motor, sea «si» o «no»", () => {
		expect(
			efectoHear("mark-correct-button+await-tap", HEAR_PATO, EV_HEAR_PATO),
		).toEqual({ kind: "mark", optionId: "si" });
		expect(
			efectoHear("mark-correct-button+await-tap", HEAR_SOL, EV_HEAR_SOL),
		).toEqual({ kind: "mark", optionId: "no" });
	});
});

// listen-tap: la correcta va la segunda y el distractor a atenuar es el primero.
const LETRA = item("letter:a");
const EV_LETRA = ejercicio(
	LETRA,
	"listen-tap",
	["letter:e", "letter:a", "letter:i"],
	"letter:a",
);
const SILABA = item("syllable:ma");
const EV_SILABA = ejercicio(
	SILABA,
	"listen-tap",
	["syllable:pa", "syllable:ma"],
	"syllable:ma",
);

describe("choiceEffect: listen-tap", () => {
	it("L2: dim-one-distractor+replay atenúa el primer distractor y repite el audio del ítem", () => {
		expect(efecto("dim-one-distractor+replay", LETRA, EV_LETRA)).toEqual({
			kind: "dim",
			optionId: "letter:e",
			replay: { key: "phoneme:a" },
		});
		// Si la correcta va primera, el distractor es el siguiente: nunca la respuesta.
		const otra = ejercicio(
			LETRA,
			"listen-tap",
			["letter:a", "letter:i", "letter:e"],
			"letter:a",
		);
		expect(efecto("dim-one-distractor+replay", LETRA, otra)).toMatchObject({
			kind: "dim",
			optionId: "letter:i",
		});
	});

	it("L3: pulse-correct+lengthen-first-phoneme pulsa la correcta (no la primera) y alarga el ítem", () => {
		expect(
			efecto("pulse-correct+lengthen-first-phoneme", SILABA, EV_SILABA),
		).toEqual({
			kind: "pulse",
			optionId: "syllable:ma",
			request: { key: "stretch:syllable:ma" },
		});
	});

	it("L3: mark-correct+await-tap marca la respuesta que da el motor", () => {
		expect(efecto("mark-correct+await-tap", SILABA, EV_SILABA)).toEqual({
			kind: "mark",
			optionId: "syllable:ma",
		});
	});

	it("L4: ninguna de sus pistas pide el nombre de la letra", () => {
		for (const a of [
			"dim-one-distractor+replay",
			"pulse-correct+lengthen-first-phoneme",
		]) {
			const e = efecto(a, LETRA, EV_LETRA);
			const request =
				e.kind === "dim" ? e.replay : e.kind === "pulse" ? e.request : null;
			expect(request).not.toBeNull();
			expect(request?.key.startsWith("letter:")).toBe(false);
		}
	});
});

// R29 (D15): con solo 2 opciones no queda nada que atenuar sin dejar una única opción tocable,
// así que la pista 1 repite el audio en vez de apagar un distractor.
const FONEMA_A = item("phoneme:a");
const EV_FONEMA_2 = ejercicio(
	FONEMA_A,
	"initial-sound",
	["picture:oso", "picture:avión"],
	"picture:avión",
);

describe("choiceEffect: R29 (D15)", () => {
	it("X1: listen-tap con 2 opciones, pista 1: repite el audio del ítem, no atenúa", () => {
		expect(efecto("dim-one-distractor+replay", SILABA, EV_SILABA)).toEqual({
			kind: "replay",
			request: { key: "syllable:ma" },
		});
	});

	it("X2: initial-sound con un ítem fonema y 2 opciones, pista 1: repite el audio del ítem", () => {
		expect(
			efecto("dim-one-distractor+replay-phoneme", FONEMA_A, EV_FONEMA_2),
		).toEqual({
			kind: "replay",
			request: { key: "phoneme:a" },
		});
	});

	it("X3: con 3 opciones (listen-tap letter:a) sigue atenuando un distractor, nunca la correcta", () => {
		const e = efecto("dim-one-distractor+replay", LETRA, EV_LETRA);
		expect(e.kind).toBe("dim");
		if (e.kind === "dim") expect(e.optionId).not.toBe("letter:a");
	});

	it("X3: initial-sound con un ítem fonema y 3 opciones tampoco cambia nada", () => {
		const ev3 = ejercicio(
			FONEMA_A,
			"initial-sound",
			["picture:oso", "picture:avión", "picture:uva"],
			"picture:avión",
		);
		const e = efecto("dim-one-distractor+replay-phoneme", FONEMA_A, ev3);
		expect(e.kind).toBe("dim");
		if (e.kind === "dim") expect(e.optionId).not.toBe("picture:avión");
	});

	it("X3: phase0:initial por el planificador real siempre trae 3 opciones y nunca da replay (único ítem oral jugable hoy)", () => {
		// No a mano: se planifica de verdad, como hace `buildOptions` al pasar
		// `item.task.optionIds` completo a `exercise.optionIds`. Si algún día una unidad
		// planificara este ítem con solo 2 opciones, este test lo notaría.
		const evaluacionesIniciales: PlannedExercise[] = [];
		for (const seed of [1, 2, 3, 4, 5]) {
			const plan = planSession({
				content: curriculum,
				state: emptyProgressState(),
				activeUnitId: "phase0:initial",
				sessionLength: 6,
				seed,
			});
			for (const ex of plan) {
				if (ex.kind === "evaluation" && ex.templateId === "initial-sound")
					evaluacionesIniciales.push(ex);
			}
		}
		expect(evaluacionesIniciales.length).toBeGreaterThan(0);
		for (const ex of evaluacionesIniciales) {
			const it = curriculum.items.get(ex.itemId);
			if (it === undefined) throw new Error(`Falta ${ex.itemId}`);
			const expected = expectedAnswer(ex, it);
			if (expected === null) throw new Error("sin respuesta");
			expect(ex.optionIds).toHaveLength(3);
			const e = choiceEffect({
				action: "dim-one-distractor+replay-phoneme",
				exercise: ex,
				item: it,
				optionIds: ex.optionIds,
				expected,
				lookup: (id) => curriculum.items.get(id),
			});
			expect(e.kind).toBe("dim");
			if (e.kind === "dim") expect(e.optionId).not.toBe(expected);
		}
	});
});
