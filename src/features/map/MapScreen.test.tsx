// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	curriculum,
	emptyItemProgress,
	type ProgressState,
	type TemplateId,
} from "@/engine";
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
				onOpenPanel={vi.fn()}
				onOpenRewards={vi.fn()}
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

/**
 * Un `ProgressState` con `total` estrellas repartidas en unidades sintéticas (fuera del
 * currículo real, que no llega a sumar tanto): a `totalStars` le basta con `bestStars` por
 * unidad, no le importa si el id existe en `curriculum`.
 */
function conEstrellas(base: ProgressState, total: number): ProgressState {
	const units: ProgressState["units"] = { ...base.units };
	let restante = total;
	let i = 0;
	while (restante > 0) {
		const stars = Math.min(3, restante) as 0 | 1 | 2 | 3;
		units[`prueba:estrellas-${i}`] = { status: "done", bestStars: stars };
		restante -= stars;
		i += 1;
	}
	return { ...base, units };
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

	it("M1: los botones de unidad miden al menos 72 px de alto (objetivo táctil)", async () => {
		const { container } = montar(await storeConDisco(() => {}));
		const botones = [...container.querySelectorAll<HTMLElement>("[data-unit]")];
		expect(botones.length).toBeGreaterThan(0);
		for (const b of botones)
			expect(b.className, b.dataset.unit).toContain("min-h-18");
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
		const candado = rhyme.querySelector('img[src="/icons/ui-lock.png"]');
		expect(candado?.getAttribute("aria-hidden")).toBe("true");
		expect(candado?.getAttribute("width")).toBe("32");
		expect(rhyme.textContent).not.toContain("🔒");
		await userEvent.click(rhyme);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("FI6: «Mis premios» pinta el icono de galería, sin 🎁", async () => {
		const { container } = montar(await storeConDisco(() => {}));
		const premios = screen.getByRole("button", { name: "Mis premios" });
		expect(
			premios.querySelector('img[src="/icons/ui-gallery.png"]'),
		).not.toBeNull();
		expect(container.textContent).not.toContain("🎁");
	});

	it("trampa 4: no pinta ninguna barra de dominio dentro de las unidades", async () => {
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
		// La barra de la Tarea 7 es del hito de estrellas, fuera de los botones de unidad: aquí
		// solo importa que ninguna unidad, por sí misma, pinte una barra de dominio.
		for (const unidad of container.querySelectorAll("[data-unit]")) {
			expect(
				within(unidad as HTMLElement).queryAllByRole("progressbar"),
			).toHaveLength(0);
			expect(
				within(unidad as HTMLElement).queryAllByRole("meter"),
			).toHaveLength(0);
			expect(
				(unidad as HTMLElement).querySelector(
					"progress, meter, [style*='width']",
				),
			).toBeNull();
			expect((unidad as HTMLElement).innerHTML).not.toMatch(/%/);
		}
	});

	it("E1: el contador de estrellas se ve como número, con barra hasta el próximo hito", async () => {
		montar(await storeConDisco(() => {}));
		expect(screen.getByText("0")).toBeDefined();
		const barra = screen.getByRole("progressbar");
		expect(barra.getAttribute("aria-valuemin")).toBe("0");
		expect(barra.getAttribute("aria-valuemax")).toBe("10");
		expect(barra.getAttribute("aria-valuenow")).toBe("0");
	});

	it("E1: con 27 estrellas la barra va de 25 a 50 con valuenow 27", async () => {
		const store = await storeConDisco(() => {});
		act(() => {
			store.setState((s) => ({ progress: conEstrellas(s.progress, 27) }));
		});
		montar(store);
		expect(screen.getByText("27")).toBeDefined();
		const barra = screen.getByRole("progressbar");
		expect(barra.getAttribute("aria-valuemin")).toBe("25");
		expect(barra.getAttribute("aria-valuemax")).toBe("50");
		expect(barra.getAttribute("aria-valuenow")).toBe("27");
	});

	it("E1: pasado el hito de 100 solo se ve el total, sin barra", async () => {
		const store = await storeConDisco(() => {});
		act(() => {
			store.setState((s) => ({ progress: conEstrellas(s.progress, 120) }));
		});
		montar(store);
		expect(screen.getByText("120")).toBeDefined();
		expect(screen.queryByRole("progressbar")).toBeNull();
	});

	it("E2: la unidad activa muestra un punto por ítem dominado, con aria-label para el adulto", async () => {
		const store = await storeConDisco((doc) => {
			const items = curriculum.units.get("phase0:clap")?.introduces ?? [];
			for (const id of items.slice(0, 2))
				doc.items[id] = {
					...emptyItemProgress(),
					presented: true,
					firstTryCorrect: 3,
				};
		});
		montar(store);
		const puntos = screen.getByLabelText("2 letras aprendidas");
		expect(puntos.children).toHaveLength(2);
	});

	it("E2: sin ítems dominados no se pinta ningún punto", async () => {
		montar(await storeConDisco(() => {}));
		expect(screen.queryByLabelText(/letras aprendidas/)).toBeNull();
	});

	it("E3: la marca de guardado muestra la hora local de lastSavedAt", async () => {
		const store = await storeConDisco(() => {});
		const iso = "2026-09-28T14:05:00.000Z";
		act(() => {
			store.setState({ lastSavedAt: iso, saveFailed: false });
		});
		montar(store);
		const fecha = new Date(iso);
		const hh = String(fecha.getHours()).padStart(2, "0");
		const mm = String(fecha.getMinutes()).padStart(2, "0");
		const marca = screen.getByLabelText(`Guardado a las ${hh}:${mm}`);
		expect(marca.getAttribute("title")).toBe(`Guardado a las ${hh}:${mm}`);
	});

	it("E3: con lastSavedAt null o saveFailed no sale la marca de guardado", async () => {
		const sinGuardar = await storeConDisco(() => {});
		montar(sinGuardar);
		expect(screen.queryByLabelText(/Guardado a las/)).toBeNull();
		cleanup();

		const conFallo = await storeConDisco(() => {});
		act(() => {
			conFallo.setState({
				lastSavedAt: "2026-09-28T14:05:00.000Z",
				saveFailed: true,
			});
		});
		montar(conFallo);
		expect(screen.queryByLabelText(/Guardado a las/)).toBeNull();
	});

	it("E4: el mapa sigue sin scroll horizontal (sin anchos fijos en píxeles)", async () => {
		const store = await storeConDisco((doc) => {
			// Menos del 80% de la unidad (UNIT_COMPLETION_THRESHOLD), para que siga activa y
			// muestre puntos en vez de pasar a "done".
			const items = curriculum.units.get("phase0:clap")?.introduces ?? [];
			for (const id of items.slice(0, 3))
				doc.items[id] = {
					...emptyItemProgress(),
					presented: true,
					firstTryCorrect: 3,
				};
		});
		const { container } = montar(store);
		expect(container.querySelector("main")?.className).toContain("max-w-xl");
		const puntos = screen.getByLabelText(/letras aprendidas/);
		expect(puntos.className).toContain("flex-wrap");
		expect(container.querySelector("[style*='px']")).toBeNull();
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

	it("N9: mantener el logo 3 s llama a onOpenPanel", async () => {
		const store = await storeConDisco(() => {});
		vi.useFakeTimers();
		try {
			const onOpenPanel = vi.fn();
			render(
				conProveedores(
					store,
					fakeAudio(),
					<MapScreen
						onStart={vi.fn()}
						onOpenPanel={onOpenPanel}
						onOpenRewards={vi.fn()}
					/>,
				),
			);
			const logo = screen.getByText("Silabín");
			fireEvent.pointerDown(logo);
			act(() => {
				vi.advanceTimersByTime(3000);
			});
			expect(onOpenPanel).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});
