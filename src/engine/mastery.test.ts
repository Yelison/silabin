import { describe, expect, it } from "vitest";
import { buildCurriculum } from "@/content/index";
import {
	isMastered,
	isUnitComplete,
	itemProgressOf,
	MASTERY_TARGET,
	UNIT_COMPLETION_THRESHOLD,
	unitMasteryRatio,
} from "@/engine/mastery";
import {
	emptyItemProgress,
	emptyProgressState,
	type ProgressState,
} from "@/engine/types";

const content = buildCurriculum({
	items: [1, 2, 3, 4, 5].map((n) => ({
		id: `syllable:m${n}`,
		kind: "syllable" as const,
		text: `m${n}`,
		phonemes: ["m", "a"],
		audioKey: `syllable:m${n}`,
	})),
	units: [
		{
			id: "u",
			phase: 2 as const,
			title: "U",
			audioKey: "unit:u",
			requires: [],
			introduces: [1, 2, 3, 4, 5].map((n) => `syllable:m${n}`),
			exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
		},
	],
});

function stateWithMastered(count: number): ProgressState {
	const state = emptyProgressState();
	for (let n = 1; n <= count; n += 1) {
		state.items[`syllable:m${n}`] = {
			...emptyItemProgress(),
			firstTryCorrect: MASTERY_TARGET,
			box: 3,
		};
	}
	return state;
}

describe("isMastered", () => {
	it("exige 3 aciertos al primer intento", () => {
		expect(MASTERY_TARGET).toBe(3);
		expect(isMastered({ ...emptyItemProgress(), firstTryCorrect: 2 })).toBe(
			false,
		);
		expect(isMastered({ ...emptyItemProgress(), firstTryCorrect: 3 })).toBe(
			true,
		);
	});

	it("no cuenta las resoluciones con ayuda", () => {
		expect(isMastered({ ...emptyItemProgress(), assisted: 9 })).toBe(false);
	});
});

describe("unitMasteryRatio", () => {
	it("es la fracción de ítems dominados", () => {
		expect(unitMasteryRatio(content, stateWithMastered(0), "u")).toBe(0);
		expect(unitMasteryRatio(content, stateWithMastered(4), "u")).toBeCloseTo(
			0.8,
		);
		expect(unitMasteryRatio(content, stateWithMastered(5), "u")).toBe(1);
	});

	it("una unidad sin ítems cuenta como completa, es el caso de la Fase 3", () => {
		const vacio = buildCurriculum({
			items: [],
			units: [
				{
					id: "v",
					phase: 3 as const,
					title: "V",
					audioKey: "unit:v",
					requires: [],
					introduces: [],
					exercises: [],
				},
			],
		});
		expect(unitMasteryRatio(vacio, emptyProgressState(), "v")).toBe(1);
	});
});

describe("isUnitComplete", () => {
	it("el umbral es el 80 por ciento", () => {
		expect(UNIT_COMPLETION_THRESHOLD).toBe(0.8);
		expect(isUnitComplete(content, stateWithMastered(3), "u")).toBe(false);
		expect(isUnitComplete(content, stateWithMastered(4), "u")).toBe(true);
	});
});

describe("robustez ante datos que no existen", () => {
	it("unitMasteryRatio lanza con una unidad desconocida en vez de inventarse un valor", () => {
		expect(() =>
			unitMasteryRatio(content, emptyProgressState(), "no-existe"),
		).toThrow(/desconocida/i);
	});

	it("itemProgressOf devuelve el progreso vacío para un ítem que nunca se ha visto", () => {
		const state = emptyProgressState();
		expect(itemProgressOf(state, "syllable:jamas")).toEqual(
			emptyItemProgress(),
		);
	});

	it("itemProgressOf no escribe en el estado al consultarlo", () => {
		// Si el acceso creara la entrada, el estado crecería solo por leerlo y la
		// persistencia guardaría progreso de ítems que el niño nunca vio.
		const state = emptyProgressState();
		itemProgressOf(state, "syllable:jamas");
		itemProgressOf(state, "letter:z");
		expect(Object.keys(state.items)).toEqual([]);
	});
});
