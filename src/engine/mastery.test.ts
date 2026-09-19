import { describe, expect, it } from "vitest";
import { buildCurriculum, curriculum } from "@/content/index";
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

/** Una unidad de la Fase 3 tal y como está en el currículo real: sin ítems y sin plantillas. */
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

/** Estado en el que están dominados exactamente los ítems que se le pasan. */
function dominados(ids: readonly string[]): ProgressState {
	const state = emptyProgressState();
	for (const id of ids) {
		state.items[id] = {
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

	it("con una unidad sin ítems devuelve 1, que es solo la salvaguarda de no dividir entre cero", () => {
		// Ese 1 no significa "terminada": las unidades vacías de la Fase 3 existen para que el
		// mapa enseñe el camino bloqueado, y isUnitComplete lo dice claro justo debajo.
		expect(unitMasteryRatio(vacio, emptyProgressState(), "v")).toBe(1);
		expect(isUnitComplete(vacio, emptyProgressState(), "v")).toBe(false);
	});
});

describe("isUnitComplete", () => {
	it("el umbral es el 80 por ciento", () => {
		expect(UNIT_COMPLETION_THRESHOLD).toBe(0.8);
		expect(isUnitComplete(content, stateWithMastered(3), "u")).toBe(false);
		expect(isUnitComplete(content, stateWithMastered(4), "u")).toBe(true);
	});

	it("el 0,8 exacto del currículo real completa la unidad, y un ítem menos no", () => {
		// El punto exacto es alcanzable en producción, no solo en un currículo de prueba:
		// phase2:l introduce 15 ítems (12/15 = 0,8) y phase2:p introduce 20 (16/20 = 0,8).
		// Con el umbral probado solo por encima y por debajo, cambiar >= por > pasaría
		// desapercibido justo en las dos unidades donde el niño se lo juega.
		for (const [unitId, justos] of [
			["phase2:l", 12],
			["phase2:p", 16],
		] as const) {
			const introduce = curriculum.units.get(unitId)?.introduces ?? [];
			expect(justos / introduce.length).toBe(UNIT_COMPLETION_THRESHOLD);
			expect([
				unitId,
				isUnitComplete(
					curriculum,
					dominados(introduce.slice(0, justos)),
					unitId,
				),
			]).toEqual([unitId, true]);
			expect([
				unitId,
				isUnitComplete(
					curriculum,
					dominados(introduce.slice(0, justos - 1)),
					unitId,
				),
			]).toEqual([unitId, false]);
		}
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
