import { describe, expect, it } from "vitest";
import { phase0Items, phase0Units } from "@/content/phase0";
import { pictureId, pictures } from "@/content/pictures";
import { templates } from "@/content/templates";
import { itemSchema, unitSchema } from "@/content/types";

describe("Fase 0", () => {
	it("tiene 4 unidades", () => {
		expect(phase0Units.map((u) => u.id)).toEqual([
			"phase0:clap",
			"phase0:rhyme",
			"phase0:initial",
			"phase0:hear-it",
		]);
	});

	it("todas las unidades y los ítems validan", () => {
		for (const unit of phase0Units)
			expect(unitSchema.safeParse(unit).success).toBe(true);
		for (const item of phase0Items)
			expect(itemSchema.safeParse(item).success).toBe(true);
	});

	it("no introduce ningún ítem de letra, sílaba ni palabra legible", () => {
		for (const item of phase0Items) expect(item.kind).toBe("oral-skill");
	});

	it("la primera unidad no tiene prerrequisitos y las demás encadenan", () => {
		expect(phase0Units[0]?.requires).toEqual([]);
		expect(phase0Units[1]?.requires).toEqual(["phase0:clap"]);
		expect(phase0Units[3]?.requires).toEqual(["phase0:initial"]);
	});

	it("cada unidad introduce exactamente los ítems que existen", () => {
		const ids = new Set(phase0Items.map((i) => i.id));
		for (const unit of phase0Units) {
			for (const id of unit.introduces) expect(ids.has(id)).toBe(true);
		}
	});

	it("las respuestas de contar sílabas son las correctas", () => {
		// Comparar task.answer contra picture.syllables.length sería tautológico, porque el
		// dato calcula answer a partir de eso mismo: ese test no podría fallar nunca. Se
		// contrasta contra una tabla explícita de recuentos verificados a mano.
		const ESPERADO: Record<string, string> = {
			sol: "1",
			pan: "1",
			mesa: "2",
			casa: "2",
			gato: "2",
			mano: "2",
			pelota: "3",
			banana: "3",
			tomate: "3",
		};
		const items = phase0Items.filter((i) => i.id.startsWith("oral:clap:"));
		expect(items).toHaveLength(9);
		for (const item of items) {
			expect([item.text, item.task?.answer]).toEqual([
				item.text,
				ESPERADO[item.text],
			]);
		}
	});

	it("cada palabra del juego de palmas existe en el catálogo de imágenes", () => {
		for (const item of phase0Items.filter((i) =>
			i.id.startsWith("oral:clap:"),
		)) {
			expect(pictures.some((p) => p.id === pictureId(item.text))).toBe(true);
		}
	});

	it("cada tarea de rima y de sonido inicial ofrece opciones que existen", () => {
		const ids = new Set(pictures.map((p) => p.id));
		const conOpciones = phase0Items.filter(
			(i) => i.task?.optionIds !== undefined,
		);
		expect(conOpciones.length).toBeGreaterThan(0);
		for (const item of conOpciones) {
			for (const optionId of item.task?.optionIds ?? [])
				expect(ids.has(optionId)).toBe(true);
			expect(item.task?.optionIds).toContain(item.task?.answer);
		}
	});

	it("la unidad de sí o no usa la plantilla hear-it, no la de sonido inicial", () => {
		const unidad = phase0Units.find((u) => u.id === "phase0:hear-it");
		expect(unidad?.exercises.map((e) => e.templateId)).toEqual(["hear-it"]);
	});

	it("las tareas de sí o no responden solo si o no", () => {
		for (const item of phase0Items.filter((i) =>
			i.id.startsWith("oral:hear:"),
		)) {
			expect(["si", "no"]).toContain(item.task?.answer);
		}
	});

	it("cada bloque de datos tiene la cantidad de ítems que debe", () => {
		const contar = (prefijo: string) =>
			phase0Items.filter((i) => i.id.startsWith(prefijo)).length;
		expect(contar("oral:clap:")).toBe(9);
		expect(contar("oral:rhyme:")).toBe(6);
		expect(contar("oral:initial:")).toBe(10);
		expect(contar("oral:hear:")).toBe(8);
		expect(phase0Items).toHaveLength(33);
	});

	it("todas las unidades son de fase 0 y encadenan una tras otra", () => {
		expect(phase0Units.map((u) => u.phase)).toEqual([0, 0, 0, 0]);
		expect(phase0Units.map((u) => u.requires)).toEqual([
			[],
			["phase0:clap"],
			["phase0:rhyme"],
			["phase0:initial"],
		]);
	});

	it("cada ítem lo introduce exactamente una unidad, sin huérfanos", () => {
		const introducidos = phase0Units.flatMap((u) => u.introduces);
		expect([...introducidos].sort()).toEqual(
			[...phase0Items.map((i) => i.id)].sort(),
		);
	});

	it("en rimas, la respuesta rima de verdad y los distractores no", () => {
		const final = (palabra: string) => palabra.slice(-2);
		for (const item of phase0Items.filter((i) =>
			i.id.startsWith("oral:rhyme:"),
		)) {
			const respuesta = pictures.find((p) => p.id === item.task?.answer);
			expect([item.text, final(respuesta?.text ?? "")]).toEqual([
				item.text,
				final(item.text),
			]);
			for (const id of (item.task?.optionIds ?? []).filter(
				(x) => x !== item.task?.answer,
			)) {
				const distractor = pictures.find((p) => p.id === id);
				expect([
					item.text,
					distractor?.text,
					final(distractor?.text ?? "") === final(item.text),
				]).toEqual([item.text, distractor?.text, false]);
			}
		}
	});

	it("en sonido inicial, ningún distractor comparte el sonido del objetivo", () => {
		for (const item of phase0Items.filter((i) =>
			i.id.startsWith("oral:initial:"),
		)) {
			const respuesta = pictures.find((p) => p.id === item.task?.answer);
			expect([item.text, item.task?.answer]).toEqual([
				item.text,
				pictureId(item.text),
			]);
			for (const id of (item.task?.optionIds ?? []).filter(
				(x) => x !== item.task?.answer,
			)) {
				const distractor = pictures.find((p) => p.id === id);
				expect([
					item.text,
					distractor?.text,
					distractor?.phonemes[0] === respuesta?.phonemes[0],
				]).toEqual([item.text, distractor?.text, false]);
			}
		}
	});

	it("en sí o no, la respuesta coincide con si el sonido está en la palabra", () => {
		for (const item of phase0Items.filter((i) =>
			i.id.startsWith("oral:hear:"),
		)) {
			const fonema = item.id.split(":")[2]?.split("-")[0] ?? "";
			const esperado = item.text.includes(fonema) ? "si" : "no";
			expect([item.id, item.task?.answer]).toEqual([item.id, esperado]);
		}
	});

	it("la cantidad de opciones respeta el rango de la plantilla de su unidad", () => {
		for (const unidad of phase0Units) {
			const plantilla = unidad.exercises[0]?.templateId;
			const rango =
				plantilla === undefined ? undefined : templates[plantilla].options;
			for (const id of unidad.introduces) {
				const item = phase0Items.find((i) => i.id === id);
				const opciones = item?.task?.optionIds;
				if (rango === undefined) {
					expect([id, opciones]).toEqual([id, undefined]);
				} else {
					expect([id, (opciones ?? []).length >= rango.min]).toEqual([
						id,
						true,
					]);
					expect([id, (opciones ?? []).length <= rango.max]).toEqual([
						id,
						true,
					]);
				}
			}
		}
	});

	it("las imágenes que menciona cada ítem existen en el catálogo", () => {
		const ids = new Set(pictures.map((p) => p.id));
		for (const item of phase0Items) {
			for (const id of item.task?.optionIds ?? [])
				expect([item.id, ids.has(id)]).toEqual([item.id, true]);
			if (item.imageKey !== undefined) {
				expect([
					item.id,
					pictures.some((p) => p.imageKey === item.imageKey),
				]).toEqual([item.id, true]);
			}
		}
	});
});
