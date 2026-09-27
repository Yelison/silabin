import { describe, expect, it } from "vitest";
import {
	curriculum,
	expectedAnswer,
	type Item,
	type PlannedExercise,
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
	templateId: "rhyme" | "initial-sound",
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
