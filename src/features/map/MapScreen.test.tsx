// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { curriculum, emptyItemProgress, type TemplateId } from "@/engine";
import { MapScreen } from "@/features/map/MapScreen";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";
import { createMemoryAdapter } from "@/store";

afterEach(cleanup);

const LLEGA_DESPUES = "Llega en una próxima versión";

/** Un documento en disco con los cambios que pida el test, listo para un store nuevo. */
async function storeConDisco(
	cambios: (doc: {
		units: Record<string, unknown>;
		items: Record<string, unknown>;
	}) => void,
) {
	const base = crearStore();
	await base.getState().load();
	const doc = structuredClone(base.getState().doc) as unknown as {
		units: Record<string, unknown>;
		items: Record<string, unknown>;
	};
	cambios(doc);
	const store = crearStore(createMemoryAdapter(doc));
	await store.getState().load();
	return store;
}

function montar(
	store: Awaited<ReturnType<typeof storeConDisco>>,
	opciones: { implemented?: ReadonlySet<TemplateId> } = {},
) {
	const onStart = vi.fn();
	const { container } = render(
		conProveedores(
			store,
			fakeAudio(),
			<MapScreen
				onStart={onStart}
				download={vi.fn()}
				{...(opciones.implemented === undefined
					? {}
					: { implemented: opciones.implemented })}
			/>,
		),
	);
	const unidad = (id: string) => {
		const el = container.querySelector<HTMLElement>(`[data-unit="${id}"]`);
		if (el === null) throw new Error(`No hay unidad ${id}`);
		return el;
	};
	return { onStart, container, unidad };
}

function todoHechoSalvoFase3(doc: { units: Record<string, unknown> }) {
	for (const [id, unit] of curriculum.units) {
		if (unit.introduces.length > 0)
			doc.units[id] = { status: "done", bestStars: 3 };
	}
}

describe("MapScreen", () => {
	it("pinta las unidades agrupadas por fase, en el orden del currículo", async () => {
		const { container } = montar(await storeConDisco(() => {}));
		const ids = [...container.querySelectorAll("[data-unit]")].map((e) =>
			e.getAttribute("data-unit"),
		);
		expect(ids).toEqual(curriculum.unitOrder);
		for (const fase of [0, 1, 2, 3]) {
			const seccion = screen.getByRole("region", { name: `Fase ${fase}` });
			const esperadas = curriculum.unitOrder.filter(
				(id) => curriculum.units.get(id)?.phase === fase,
			);
			expect(
				[...seccion.querySelectorAll("[data-unit]")].map((e) =>
					e.getAttribute("data-unit"),
				),
			).toEqual(esperadas);
		}
	});

	it("U2: con progreso nuevo, phase0:clap es la activa y el resto está bloqueado", async () => {
		const { unidad } = montar(await storeConDisco(() => {}));
		expect(unidad("phase0:clap").getAttribute("data-status")).toBe("active");
		expect(unidad("phase0:clap").getAttribute("aria-current")).toBe("step");
		expect(unidad("phase0:rhyme").getAttribute("data-status")).toBe("locked");
	});

	it("U3: lo que el disco dice de la Fase 3 no cuenta: el mapa la pinta bloqueada", async () => {
		const store = await storeConDisco((doc) => {
			for (const [id, unit] of curriculum.units)
				if (unit.phase === 3) doc.units[id] = { status: "done", bestStars: 3 };
		});
		const { unidad } = montar(store);
		for (const [id, unit] of curriculum.units) {
			if (unit.phase !== 3) continue;
			expect(unidad(id).getAttribute("data-status")).toBe("locked");
			expect(within(unidad(id)).queryByText("★")).toBeNull();
		}
	});

	it("una unidad terminada muestra sus mejores estrellas", async () => {
		const store = await storeConDisco((doc) => {
			doc.units["phase0:clap"] = { status: "done", bestStars: 2 };
		});
		const { unidad } = montar(store);
		const clap = unidad("phase0:clap");
		expect(clap.getAttribute("data-status")).toBe("done");
		expect(clap.getAttribute("aria-label")).toContain("2 de 3 estrellas");
		expect(within(clap).getAllByText("★")).toHaveLength(2);
		expect(within(clap).getAllByText("☆")).toHaveLength(1);
	});

	it("una unidad bloqueada lleva candado y no arranca nada al tocarla", async () => {
		const { unidad, onStart } = montar(await storeConDisco(() => {}));
		const rhyme = unidad("phase0:rhyme");
		expect(within(rhyme).getByText("🔒")).toBeDefined();
		await userEvent.click(rhyme);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("trampa 4: no pinta ninguna barra de dominio", async () => {
		const store = await storeConDisco((doc) => {
			// Algo de dominio a medias en la unidad activa: no debe traducirse en barra.
			const id = curriculum.units.get("phase0:clap")?.introduces[0] ?? "";
			doc.items[id] = {
				...emptyItemProgress(),
				presented: true,
				firstTryCorrect: 2,
			};
		});
		const { container } = montar(store);
		expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
		expect(screen.queryAllByRole("meter")).toHaveLength(0);
		expect(
			container.querySelector("progress, meter, [style*='width']"),
		).toBeNull();
		expect(container.innerHTML).not.toMatch(/%/);
	});

	it("tocar la unidad activa jugable inicia la sesión", async () => {
		const { unidad, onStart } = montar(await storeConDisco(() => {}));
		expect(unidad("phase0:clap").getAttribute("aria-label")).not.toBe(
			LLEGA_DESPUES,
		);
		await userEvent.click(unidad("phase0:clap"));
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("U7: la unidad activa no jugable se ve atenuada y tocarla no hace nada", async () => {
		const { unidad, onStart } = montar(await storeConDisco(() => {}), {
			implemented: new Set(),
		});
		const clap = unidad("phase0:clap");
		expect(clap.getAttribute("aria-label")).toBe(LLEGA_DESPUES);
		expect(clap.getAttribute("aria-disabled")).toBe("true");
		expect(clap.className).toMatch(/opacity/);
		await userEvent.click(clap);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("sin unidad activa ofrece el repaso, sujeto a la misma comprobación", async () => {
		const store = await storeConDisco((doc) => {
			todoHechoSalvoFase3(doc);
			for (const id of curriculum.units.get("phase0:clap")?.introduces ?? [])
				doc.items[id] = { ...emptyItemProgress(), presented: true };
		});
		const { onStart } = montar(store);
		await userEvent.click(screen.getByRole("button", { name: "Repasar" }));
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("el repaso no jugable se atenúa y no arranca", async () => {
		const store = await storeConDisco((doc) => {
			todoHechoSalvoFase3(doc);
			for (const id of curriculum.units.get("phase0:clap")?.introduces ?? [])
				doc.items[id] = { ...emptyItemProgress(), presented: true };
		});
		const { onStart } = montar(store, { implemented: new Set() });
		const repaso = screen.getByLabelText(LLEGA_DESPUES);
		expect(repaso.getAttribute("aria-disabled")).toBe("true");
		await userEvent.click(repaso);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("con unidad activa no hay botón de repaso", async () => {
		montar(await storeConDisco(() => {}));
		expect(screen.queryByRole("button", { name: "Repasar" })).toBeNull();
	});

	it("nada de lo pintado usa lenguaje de castigo", async () => {
		const { container } = montar(await storeConDisco(() => {}));
		expect(container.innerHTML.toLowerCase()).not.toMatch(
			/error|fallo|incorrect|mal\b|perdiste|otra vez/,
		);
	});
});
