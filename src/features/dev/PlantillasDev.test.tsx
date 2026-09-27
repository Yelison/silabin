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
import {
	itemsDe,
	PLANTILLAS,
	PlantillasDev,
	planificar,
} from "@/features/dev/PlantillasDev";
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

	it("R29/D15: con el ítem de arranque (2 opciones) rung 1 repite el audio sin atenuar; rung 3 marca el modelo (listen-tap)", () => {
		montar();
		elegirPlantilla("listen-tap");
		// El ítem de arranque (caja 0, nivel fácil) trae 2 opciones: R29 hace que la pista 1
		// repita el audio en vez de atenuar (dejaría una sola opción tocable).
		expect(atenuados()).toHaveLength(0);
		fireEvent.click(screen.getByRole("button", { name: "Rung 1" }));
		expect(atenuados()).toHaveLength(0);
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

describe("PlantillasDev: barrido de todas las combinaciones del selector", () => {
	const combinaciones = PLANTILLAS.flatMap((t) =>
		itemsDe(t).map((i) => [t, i.id] as const),
	);

	it("las tareas orales solo se ofrecen con la plantilla de su unidad", () => {
		const de = (t: Parameters<typeof itemsDe>[0]) =>
			itemsDe(t).map((i) => i.id);
		expect(
			de("count-syllables").every((id) => id.startsWith("oral:clap:")),
		).toBe(true);
		expect(de("rhyme").every((id) => id.startsWith("oral:rhyme:"))).toBe(true);
		expect(de("hear-it").every((id) => id.startsWith("oral:hear:"))).toBe(true);
		const inicial = de("initial-sound");
		expect(inicial).toContain("phoneme:a");
		expect(inicial.some((id) => id.startsWith("oral:initial:"))).toBe(true);
		expect(inicial.some((id) => id.startsWith("oral:clap:"))).toBe(false);
		// Las que ninguna unidad ofrece aún siguen a la vista.
		expect(de("listen-tap").length).toBeGreaterThan(0);
		expect(de("build").length).toBeGreaterThan(0);
	});

	it("hay combinaciones que barrer", () => {
		expect(combinaciones.length).toBeGreaterThan(50);
	});

	it("el motor planifica un ejercicio de cada plantilla para cada ítem que el selector ofrece", () => {
		const fallos: string[] = [];
		for (const [t, id] of combinaciones) {
			const item = curriculum.items.get(id);
			if (item === undefined) continue;
			for (const seed of [1, 2, 3, 4]) {
				try {
					const plan = planificar(t, item, seed);
					if (plan.evaluacion === undefined)
						fallos.push(`${t} ${id}: sin evaluación`);
				} catch (e) {
					fallos.push(`${t} ${id} (seed ${seed}): ${(e as Error).message}`);
				}
			}
		}
		expect(fallos).toEqual([]);
	});

	it("cada combinación se monta con todos los rungs y locked, sin reventar", {
		timeout: 120_000,
	}, () => {
		const fallos: string[] = [];
		for (const [t, id] of combinaciones) {
			try {
				const { unmount } = montar();
				elegirPlantilla(t);
				fireEvent.change(screen.getByRole("combobox", { name: "Ítem" }), {
					target: { value: id },
				});
				for (const nombre of [
					"Rung 1",
					"Rung 2",
					"Rung 3",
					"Sin feedback",
					"locked",
				])
					fireEvent.click(screen.getByRole("button", { name: nombre }));
				unmount();
			} catch (e) {
				fallos.push(`${t} ${id}: ${(e as Error).message}`);
				cleanup();
			}
		}
		expect(fallos).toEqual([]);
	});
});
