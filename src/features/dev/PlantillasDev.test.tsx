// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { curriculum } from "@/engine";
import { PlantillasDev } from "@/features/dev/PlantillasDev";
import { fakeAudio } from "@/features/test-support";

afterEach(cleanup);

const montar = () => render(<PlantillasDev audio={fakeAudio()} />);
const evaluacion = () => screen.getByRole("region", { name: "Evaluation" });
const presentacion = () => screen.getByRole("region", { name: "Presentation" });
const elegirPlantilla = (t: string) =>
	fireEvent.change(screen.getByRole("combobox", { name: "Plantilla" }), {
		target: { value: t },
	});
const marcados = () =>
	evaluacion().querySelectorAll('button[data-state="marked"]');
const atenuados = () =>
	evaluacion().querySelectorAll('button[data-state="dimmed"]');

describe("PlantillasDev", () => {
	it("ofrece listen-tap y build, que ninguna unidad ofrece todavía, además de las de la Fase 0", () => {
		montar();
		const opciones = within(screen.getByRole("combobox", { name: "Plantilla" }))
			.getAllByRole("option")
			.map((o) => o.getAttribute("value"));
		expect(opciones).toEqual(
			expect.arrayContaining([
				"listen-tap",
				"build",
				"count-syllables",
				"rhyme",
				"initial-sound",
				"hear-it",
			]),
		);
	});

	it("monta Presentation y Evaluation con un ejercicio del motor para el ítem elegido", () => {
		montar();
		elegirPlantilla("listen-tap");
		const item = screen.getByRole("combobox", {
			name: "Ítem",
		}) as HTMLSelectElement;
		expect(curriculum.items.get(item.value)?.kind).toMatch(
			/letter|syllable|word/,
		);
		expect(presentacion()).toBeDefined();
		// La evaluación de listen-tap: opciones para tocar (2 o 3 según el motor).
		const opciones = within(evaluacion())
			.getAllByRole("button")
			.filter((b) => b.hasAttribute("data-state"));
		expect(opciones.length).toBeGreaterThanOrEqual(2);
	});

	it("el selector de ítem solo ofrece lo que la plantilla acepta: build, sílabas", () => {
		montar();
		elegirPlantilla("build");
		const item = screen.getByRole("combobox", { name: "Ítem" });
		const ids = within(item)
			.getAllByRole("option")
			.map((o) => o.getAttribute("value") ?? "");
		expect(ids.length).toBeGreaterThan(0);
		for (const id of ids)
			expect(curriculum.items.get(id)?.kind).toBe("syllable");
		expect(evaluacion().querySelectorAll("button").length).toBeGreaterThan(0);
	});

	it("rung 1 atenúa un distractor; rung 3 marca el modelo (listen-tap)", () => {
		montar();
		elegirPlantilla("listen-tap");
		expect(atenuados()).toHaveLength(0);
		fireEvent.click(screen.getByRole("button", { name: "Rung 1" }));
		expect(atenuados().length).toBe(1);
		expect(marcados()).toHaveLength(0);
		fireEvent.click(screen.getByRole("button", { name: "Rung 3" }));
		expect(marcados().length).toBe(1);
	});

	it("rung 3 en build marca una pieza, y «Sin feedback» la vuelve a soltar", () => {
		montar();
		elegirPlantilla("build");
		fireEvent.click(screen.getByRole("button", { name: "Rung 3" }));
		expect(marcados().length).toBeGreaterThan(0);
		fireEvent.click(screen.getByRole("button", { name: "Sin feedback" }));
		expect(screen.getByRole("status").textContent).toBe("Sin feedback");
	});

	it("«locked» bloquea las opciones de la evaluación", () => {
		montar();
		elegirPlantilla("listen-tap");
		const opciones = () =>
			[...evaluacion().querySelectorAll("button[data-state]")] as HTMLElement[];
		expect(
			opciones().every((b) => b.getAttribute("aria-disabled") === "false"),
		).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: "locked" }));
		expect(
			opciones().every((b) => b.getAttribute("aria-disabled") === "true"),
		).toBe(true);
	});

	it("responder y terminar la presentación se anota, sin tocar ningún progreso", async () => {
		const { container } = montar();
		elegirPlantilla("listen-tap");
		const primera =
			evaluacion().querySelector<HTMLElement>("button[data-state]");
		expect(primera).not.toBeNull();
		await act(async () => {
			fireEvent.click(primera as HTMLElement);
		});
		expect(screen.getByRole("status").textContent).toMatch(/^Respuesta: /);
		expect(container.querySelector("[data-screen]")).toBeNull();
	});
});
