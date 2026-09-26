import { describe, expect, it } from "vitest";
import { rimeOf } from "@/content/audio-keys";
import { buildCurriculum, curriculum } from "@/content/index";
import {
	accentIsFinalOnly,
	areMirrorConfusable,
	hasAdjacentVowels,
	hasOnlyOpenSyllables,
	itemsWithoutTemplate,
	stripDiacritics,
	syllabify,
} from "@/content/invariants";
import { pictures } from "@/content/pictures";
import { templates } from "@/content/templates";
import {
	checkAnswer,
	emptyItemProgress,
	emptyProgressState,
	expectedAnswer,
	type ProgressState,
	planSession,
} from "@/engine";

describe("stripDiacritics", () => {
	it("quita la tilde sin tocar la ñ", () => {
		expect(stripDiacritics("mamá")).toBe("mama");
		expect(stripDiacritics("uña")).toBe("uña");
	});
});

describe("syllabify", () => {
	it("parte palabras CV-CV", () => {
		expect(syllabify("mapa")).toEqual(["ma", "pa"]);
		expect(syllabify("mamá")).toEqual(["ma", "má"]);
	});

	it("reconoce una vocal suelta como sílaba", () => {
		expect(syllabify("ala")).toEqual(["a", "la"]);
		expect(syllabify("oso")).toEqual(["o", "so"]);
	});

	it("devuelve vacío si la palabra no es solo CV o V", () => {
		expect(syllabify("pan")).toEqual([]);
		expect(syllabify("plato")).toEqual([]);
	});

	it("reconoce la u, que ninguna otra palabra de prueba ejercita", () => {
		expect(syllabify("luna")).toEqual(["lu", "na"]);
		expect(syllabify("uso")).toEqual(["u", "so"]);
	});
});

describe("hasOnlyOpenSyllables", () => {
	it("acepta CV y V, rechaza CVC y CCV", () => {
		expect(hasOnlyOpenSyllables("mapa")).toBe(true);
		expect(hasOnlyOpenSyllables("ala")).toBe(true);
		expect(hasOnlyOpenSyllables("pan")).toBe(false);
		expect(hasOnlyOpenSyllables("plato")).toBe(false);
	});
});

describe("hasAdjacentVowels", () => {
	it("detecta hiatos y diptongos", () => {
		expect(hasAdjacentVowels("mío")).toBe(true);
		expect(hasAdjacentVowels("tiene")).toBe(true);
		expect(hasAdjacentVowels("mapa")).toBe(false);
	});
});

describe("accentIsFinalOnly", () => {
	it("acepta la tilde en la última sílaba", () => {
		expect(accentIsFinalOnly("mamá")).toBe(true);
		expect(accentIsFinalOnly("papá")).toBe(true);
	});

	it("rechaza la tilde en cualquier otra posición", () => {
		expect(accentIsFinalOnly("árbol")).toBe(false);
		expect(accentIsFinalOnly("página")).toBe(false);
	});

	it("acepta una palabra sin tilde", () => {
		expect(accentIsFinalOnly("mapa")).toBe(true);
	});

	it("acepta la tilde cuando la última sílaba es solo la vocal acentuada", () => {
		expect(accentIsFinalOnly("leí")).toBe(true);
		expect(accentIsFinalOnly("oí")).toBe(true);
	});
});

describe("areMirrorConfusable", () => {
	it("agrupa las seis parejas de b, d, p y q en los dos sentidos", () => {
		const grupo = ["b", "d", "p", "q"];
		for (const a of grupo) {
			for (const b of grupo) {
				expect([a, b, areMirrorConfusable(a, b)]).toEqual([a, b, a !== b]);
			}
		}
	});

	it("no agrupa letras de formas distintas", () => {
		expect(areMirrorConfusable("m", "a")).toBe(false);
		expect(areMirrorConfusable("b", "b")).toBe(false);
	});
});

describe("itemsWithoutTemplate", () => {
	it("T1.1: toda unidad del currículo real tiene plantilla para cada ítem que introduce", () => {
		expect(itemsWithoutTemplate(curriculum)).toEqual([]);
	});

	it("T1.2: detecta una unidad que introduce un ítem que ninguna de sus plantillas acepta", () => {
		const contenido = buildCurriculum({
			items: [
				{
					id: "oral:clap:sol",
					kind: "oral-skill",
					text: "sol",
					phonemes: [],
					audioKey: "word:sol",
					task: { answer: "1" },
				},
			],
			units: [
				{
					id: "solo-listen-tap",
					phase: 0,
					title: "Solo listen-tap",
					audioKey: "unit:solo-listen-tap",
					requires: [],
					introduces: ["oral:clap:sol"],
					exercises: [{ templateId: "listen-tap", weight: 1 }],
				},
			],
		});
		expect(itemsWithoutTemplate(contenido)).toEqual([
			{
				unitId: "solo-listen-tap",
				itemId: "oral:clap:sol",
				kind: "oral-skill",
			},
		]);
	});
});

describe("rima: el objetivo y la opción correcta comparten final, el distractor no", () => {
	it("M9: pasa con el contenido actual", () => {
		const rimaItems = [...curriculum.items.values()].filter((i) =>
			i.id.startsWith("oral:rhyme:"),
		);
		expect(rimaItems.length).toBeGreaterThan(0);
		for (const item of rimaItems) {
			const correcta = pictures.find((p) => p.id === item.task?.answer);
			expect([item.id, correcta]).toEqual([item.id, expect.anything()]);
			expect([item.id, stripDiacritics(rimeOf(item.text))]).toEqual([
				item.id,
				stripDiacritics(rimeOf(correcta?.text ?? "")),
			]);
			for (const optionId of (item.task?.optionIds ?? []).filter(
				(id) => id !== item.task?.answer,
			)) {
				const distractor = pictures.find((p) => p.id === optionId);
				const mismaRima =
					stripDiacritics(rimeOf(item.text)) ===
					stripDiacritics(rimeOf(distractor?.text ?? ""));
				expect([item.id, distractor?.text, mismaRima]).toEqual([
					item.id,
					distractor?.text,
					false,
				]);
			}
		}
	});
});

describe("sonido y no nombre: letras y fonemas", () => {
	it("M10: toda letra y todo fonema tiene audioKey que empieza por phoneme:", () => {
		let revisados = 0;
		for (const item of curriculum.items.values()) {
			if (item.kind !== "letter" && item.kind !== "phoneme") continue;
			revisados += 1;
			expect([item.id, item.audioKey.startsWith("phoneme:")]).toEqual([
				item.id,
				true,
			]);
		}
		expect(revisados).toBeGreaterThan(0);
	});
});

describe("trampa 9: expectedAnswer nunca deja lanzar a tap, taps o drag", () => {
	it("M11: cada unidad resuelve correct para cada ítem que cada una de esas plantillas acepta", () => {
		const evaluacionesObjetivo = new Set(["tap", "taps", "drag"]);

		function presentedState(unitId: string): ProgressState {
			const unit = curriculum.units.get(unitId);
			const state = emptyProgressState();
			for (const id of unit?.introduces ?? []) {
				state.items[id] = {
					...emptyItemProgress(),
					presented: true,
					box: 1,
					firstTryCorrect: 1,
					lastSessionIndex: 0,
				};
			}
			return state;
		}

		// Lo que cada unidad debe cubrir: cada plantilla tap/taps/drag que declara, cruzada
		// con cada ítem que introduce y que esa plantilla acepta por su clase.
		const pendiente = new Map<string, Set<string>>();
		for (const unitId of curriculum.unitOrder) {
			const unit = curriculum.units.get(unitId);
			if (unit === undefined) continue;
			const combos = new Set<string>();
			for (const exercise of unit.exercises) {
				if (
					!evaluacionesObjetivo.has(templates[exercise.templateId].evaluation)
				)
					continue;
				for (const itemId of unit.introduces) {
					const item = curriculum.items.get(itemId);
					if (item === undefined) continue;
					if (!templates[exercise.templateId].itemKinds.includes(item.kind))
						continue;
					combos.add(`${exercise.templateId}:${itemId}`);
				}
			}
			if (combos.size > 0) pendiente.set(unitId, combos);
		}
		expect(pendiente.size).toBeGreaterThan(0);

		const cubiertos = new Map<string, Set<string>>();
		for (const unitId of pendiente.keys()) cubiertos.set(unitId, new Set());

		for (let seed = 1; seed <= 200; seed += 1) {
			for (const [unitId, combos] of pendiente) {
				const yaCubiertos = cubiertos.get(unitId);
				if (yaCubiertos !== undefined && yaCubiertos.size >= combos.size)
					continue;
				const ejercicios = planSession({
					content: curriculum,
					state: presentedState(unitId),
					activeUnitId: unitId,
					sessionLength: 6,
					seed,
				});
				for (const ex of ejercicios) {
					if (ex.kind !== "evaluation") continue;
					if (!evaluacionesObjetivo.has(templates[ex.templateId].evaluation))
						continue;
					const item = curriculum.items.get(ex.itemId);
					if (item === undefined) continue;
					const esperado = expectedAnswer(ex, item);
					expect([ex.templateId, ex.itemId, esperado === null]).toEqual([
						ex.templateId,
						ex.itemId,
						false,
					]);
					if (esperado === null) continue;
					expect([
						ex.templateId,
						ex.itemId,
						checkAnswer(ex, item, esperado),
					]).toEqual([ex.templateId, ex.itemId, "correct"]);
					cubiertos.get(unitId)?.add(`${ex.templateId}:${ex.itemId}`);
				}
			}
		}

		for (const [unitId, combos] of pendiente) {
			expect([unitId, [...(cubiertos.get(unitId) ?? [])].sort()]).toEqual([
				unitId,
				[...combos].sort(),
			]);
		}
	});
});
