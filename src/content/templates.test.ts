import { describe, expect, it } from "vitest";
import { templateIds, templates } from "@/content/templates";

describe("plantillas de ejercicio", () => {
	it("define las 9 plantillas de la v1", () => {
		expect(templateIds).toHaveLength(9);
	});

	it("cada plantilla tiene exactamente 3 rungs en el orden reduce, sound, model", () => {
		for (const id of templateIds) {
			expect(templates[id].hints.map((h) => h.rung)).toEqual([
				"reduce",
				"sound",
				"model",
			]);
		}
	});

	it("ningún rung queda sin acción ni nota", () => {
		for (const id of templateIds) {
			for (const hint of templates[id].hints) {
				expect(hint.action.length).toBeGreaterThan(0);
				expect(hint.note.length).toBeGreaterThan(0);
			}
		}
	});

	it("initial-sound acepta fonemas y habilidades orales", () => {
		expect(templates["initial-sound"].itemKinds).toEqual([
			"phoneme",
			"oral-skill",
		]);
	});

	it("cada unidad de la Fase 0 encuentra una plantilla que acepta sus ítems orales", () => {
		const orales = templateIds.filter((id) =>
			templates[id].itemKinds.includes("oral-skill"),
		);
		expect(orales).toEqual([
			"hear-it",
			"count-syllables",
			"rhyme",
			"initial-sound",
		]);
	});

	it("las plantillas de opciones declaran cuántas opciones admiten", () => {
		for (const id of ["listen-tap", "rhyme", "initial-sound"] as const) {
			expect(templates[id].options).toBeDefined();
			expect(templates[id].options?.min).toBeGreaterThanOrEqual(2);
		}
	});

	it("say-it y read-word se evalúan por voz", () => {
		expect(templates["say-it"].evaluation).toBe("voice");
		expect(templates["read-word"].evaluation).toBe("voice");
	});

	it("listen-tap es la plantilla más fácil y read-word la más difícil", () => {
		const ordenadas = [...templateIds].sort(
			(a, b) => templates[a].difficulty - templates[b].difficulty,
		);
		expect(ordenadas[0]).toBe("listen-tap");
		expect(ordenadas.at(-1)).toBe("read-word");
	});

	it("cada plantilla tiene una dificultad distinta, para que el cierre de sesión sea inequívoco", () => {
		const dificultades = templateIds.map((id) => templates[id].difficulty);
		expect(new Set(dificultades).size).toBe(templateIds.length);
	});

	it("hear-it no tiene opciones: sus dos botones son fijos y la respuesta está en el dato", () => {
		expect(templates["hear-it"].options).toBeUndefined();
		expect(templates["hear-it"].itemKinds).toEqual(["oral-skill"]);
	});

	it("cada id de plantilla coincide con su clave en el registro", () => {
		for (const id of templateIds) expect(templates[id].id).toBe(id);
	});
});
