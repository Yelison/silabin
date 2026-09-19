import { describe, expect, it } from "vitest";
import { buildCurriculum, curriculum } from "@/content/index";
import type { Curriculum } from "@/content/types";

describe("currículo ensamblado", () => {
	it("carga sin lanzar y contiene las unidades de las fases 0 a 3", () => {
		expect(curriculum.units.size).toBeGreaterThanOrEqual(13);
		expect(curriculum.units.has("phase0:clap")).toBe(true);
		expect(curriculum.units.has("phase2:p")).toBe(true);
		expect([...curriculum.units.values()].some((u) => u.phase === 3)).toBe(
			true,
		);
	});

	it("indexa los ítems por id", () => {
		expect(curriculum.items.get("syllable:ma")?.text).toBe("ma");
		expect(curriculum.items.get("letter:a")?.display?.upper).toBe("A");
	});

	it("ordena las unidades de forma topológica: ningún prerrequisito aparece después", () => {
		const position = new Map(
			curriculum.unitOrder.map((id, index) => [id, index]),
		);
		for (const unit of curriculum.units.values()) {
			for (const required of unit.requires) {
				expect(position.get(required)!).toBeLessThan(position.get(unit.id)!);
			}
		}
	});

	it("empieza por la primera unidad de la Fase 0", () => {
		expect(curriculum.unitOrder[0]).toBe("phase0:clap");
	});

	it("todo ítem que una unidad introduce existe", () => {
		for (const unit of curriculum.units.values()) {
			for (const id of unit.introduces)
				expect(curriculum.items.has(id)).toBe(true);
		}
	});

	it("todo prerrequisito apunta a una unidad existente", () => {
		for (const unit of curriculum.units.values()) {
			for (const required of unit.requires)
				expect(curriculum.units.has(required)).toBe(true);
		}
	});

	it("el texto de todo ítem está en minúsculas", () => {
		// Los invariantes de content/invariants.ts asumen minúsculas: con mayúsculas no lanzan,
		// devuelven respuestas vacuamente coherentes sin avisar de que la entrada estaba mal.
		for (const item of curriculum.items.values()) {
			expect([item.id, item.text]).toEqual([item.id, item.text.toLowerCase()]);
		}
	});

	it("el orden topológico contiene todas las unidades, una sola vez", () => {
		expect(curriculum.unitOrder).toHaveLength(curriculum.units.size);
		expect(new Set(curriculum.unitOrder).size).toBe(
			curriculum.unitOrder.length,
		);
		for (const id of curriculum.units.keys())
			expect(curriculum.unitOrder).toContain(id);
	});

	it("todo ítem que no sea una imagen lo enseña alguna unidad", () => {
		// Las imágenes existen para ilustrar y no las introduce ninguna unidad, a propósito.
		// Cualquier otro ítem que ninguna unidad enseñe es contenido muerto.
		const introducidos = new Set(
			[...curriculum.units.values()].flatMap((u) => u.introduces),
		);
		for (const item of curriculum.items.values()) {
			if (item.kind === "picture") continue;
			expect([item.id, introducidos.has(item.id)]).toEqual([item.id, true]);
		}
	});

	it("ninguna unidad depende de otra de una fase posterior", () => {
		for (const unit of curriculum.units.values()) {
			for (const required of unit.requires) {
				const previa = curriculum.units.get(required);
				expect([unit.id, required, (previa?.phase ?? 0) <= unit.phase]).toEqual(
					[unit.id, required, true],
				);
			}
		}
	});

	it("ningún ítem se introduce en dos unidades", () => {
		const seen = new Set<string>();
		for (const unit of curriculum.units.values()) {
			for (const id of unit.introduces) {
				expect(seen.has(id), `${id} se introduce dos veces`).toBe(false);
				seen.add(id);
			}
		}
	});
});

describe("buildCurriculum, validaciones", () => {
	const item = {
		id: "letter:a",
		kind: "letter" as const,
		text: "a",
		phonemes: ["a"],
		audioKey: "phoneme:a",
		display: { upper: "A", lower: "a" },
	};
	const unit = {
		id: "u1",
		phase: 1 as const,
		title: "U1",
		audioKey: "unit:u1",
		requires: [],
		introduces: ["letter:a"],
		exercises: [{ templateId: "listen-tap" as const, weight: 1 }],
	};

	it("rechaza ids de ítem repetidos", () => {
		const raw: Curriculum = { items: [item, item], units: [unit] };
		expect(() => buildCurriculum(raw)).toThrow(/repetido/i);
	});

	it("rechaza un prerrequisito inexistente", () => {
		const raw: Curriculum = {
			items: [item],
			units: [{ ...unit, requires: ["no-existe"] }],
		};
		expect(() => buildCurriculum(raw)).toThrow(/prerrequisito/i);
	});

	it("rechaza un ítem introducido que no existe", () => {
		const raw: Curriculum = {
			items: [item],
			units: [{ ...unit, introduces: ["letter:z"] }],
		};
		expect(() => buildCurriculum(raw)).toThrow(/introduce/i);
	});

	it("rechaza un ciclo de prerrequisitos", () => {
		const raw: Curriculum = {
			items: [item],
			units: [
				{ ...unit, id: "a", requires: ["b"] },
				{
					...unit,
					id: "b",
					requires: ["a"],
					introduces: [] as string[],
					phase: 3 as const,
					exercises: [],
				},
			],
		};
		expect(() => buildCurriculum(raw)).toThrow(/ciclo/i);
	});
});
