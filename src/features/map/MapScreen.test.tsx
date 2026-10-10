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
import {
	COLUMNAS,
	DISPOSICIONES,
	layoutCells,
	layoutPath,
	layoutRows,
} from "@/features/map/serpentine";
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

/** Todo hecho salvo la Fase 3 y con la fase 0 por repasar: no queda unidad activa. */
function sinActivaConRepaso(doc: {
	units: Record<string, unknown>;
	items: Record<string, unknown>;
}) {
	todoHechoSalvoFase3(doc);
	for (const id of curriculum.units.get("phase0:clap")?.introduces ?? [])
		doc.items[id] = { ...emptyItemProgress(), presented: true };
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

	it("M1: los nodos de unidad miden al menos 72 px de alto (objetivo táctil)", async () => {
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
		expect(within(clap).queryByText("☆")).toBeNull();
	});

	it("una unidad bloqueada lleva candado y no arranca nada al tocarla", async () => {
		const { unidad, onStart } = montar(await storeConDisco(() => {}));
		const rhyme = unidad("phase0:rhyme");
		const candado = rhyme.querySelector('[data-badge="lock"]');
		expect(candado).not.toBeNull();
		expect(candado?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
		// El símbolo de la unidad sigue a la vista; el candado es la insignia, no sustituye al icono.
		expect(rhyme.querySelector("[data-symbol] svg")).not.toBeNull();
		expect(rhyme.textContent).not.toContain("🔒");
		await userEvent.click(rhyme);
		expect(onStart).not.toHaveBeenCalled();
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

	it("E1: el mapa pasa a la cabecera las estrellas del store: con 27 la barra va de 25 a 50", async () => {
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

	it("CA4: los puntos de avance van en la tarjeta del mundo de la unidad activa, no en otra", async () => {
		// Fase 0 entera terminada: la activa es la primera vocal (Fase 1), con 1 de 2 ítems dominado.
		const store = await storeConDisco((doc) => {
			for (const [id, unit] of curriculum.units)
				if (unit.phase === 0 && unit.introduces.length > 0)
					doc.units[id] = { status: "done", bestStars: 3 };
			const id = curriculum.units.get("phase1:vowel-a")?.introduces[0] ?? "";
			doc.items[id] = {
				...emptyItemProgress(),
				presented: true,
				firstTryCorrect: 3,
			};
		});
		const { unidad } = montar(store);
		expect(unidad("phase1:vowel-a").getAttribute("data-status")).toBe("active");
		const puntos = screen.getAllByLabelText(/letras aprendidas/);
		expect(puntos).toHaveLength(1);
		const fase1 = screen.getByRole("region", { name: "Fase 1" });
		expect(within(fase1).getByLabelText("1 letras aprendidas")).toBe(puntos[0]);
		for (const otra of [0, 2, 3])
			expect(
				within(
					screen.getByRole("region", { name: `Fase ${otra}` }),
				).queryByLabelText(/letras aprendidas/),
			).toBeNull();
	});

	it("CA5: cada fase abre con su tarjeta de mundo y no queda ningún separador discontinuo", async () => {
		const { container } = montar(await storeConDisco(() => {}));
		expect(container.innerHTML).not.toContain("border-dashed");
		for (const [fase, nombre] of [
			[0, "Oído de explorador"],
			[1, "Las vocales"],
			[2, "Las sílabas"],
			[3, "Más letras"],
		] as const) {
			const seccion = screen.getByRole("region", { name: `Fase ${fase}` });
			expect(within(seccion).getByText(`MUNDO ${fase + 1}`)).toBeDefined();
			expect(within(seccion).getByText(nombre)).toBeDefined();
		}
	});

	it("E3: el mapa pasa a la cabecera la hora guardada del store", async () => {
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

	it("E5: un aviso de guardado en el store hace que la cabecera deje libre el rincón del candado", async () => {
		const store = await storeConDisco(() => {});
		const { container } = montar(store);
		const cabecera = container.querySelector("main > header");
		expect(cabecera?.className).not.toContain("pr-12");
		act(() => {
			store.setState({ recovered: true });
		});
		expect(cabecera?.className).toContain("pr-12");
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
		// La cabecera ya no es una columna estrecha (`max-w-xl`): ocupa todo el ancho de `main`.
		const cabecera = container.querySelector("main > header");
		expect(cabecera).not.toBeNull();
		expect(
			cabecera?.contains(screen.getByRole("heading", { name: "Silabín" })),
		).toBe(true);
		expect(cabecera?.className).not.toContain("max-w-xl");
		const puntos = screen.getByLabelText(/letras aprendidas/);
		expect(puntos.className).toContain("flex-wrap");
		expect(container.querySelector("[style*='px']")).toBeNull();
		expect(container.innerHTML).not.toMatch(/\bw-\[[^\]]*px\]/);
	});

	it("tocar la unidad activa jugable inicia la sesión", async () => {
		const { unidad, onStart } = montar(await storeConDisco(() => {}));
		expect(unidad("phase0:clap").getAttribute("aria-label")).not.toBe(
			LLEGA_DESPUES,
		);
		await userEvent.click(unidad("phase0:clap"));
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("U7: la unidad activa no jugable se ve como «soon» y tocarla no hace nada", async () => {
		const { unidad, onStart } = montar(await storeConDisco(() => {}), {
			implemented: new Set(),
		});
		const clap = unidad("phase0:clap");
		expect(clap.getAttribute("aria-label")).toBe(LLEGA_DESPUES);
		expect(clap.getAttribute("aria-disabled")).toBe("true");
		expect(clap.getAttribute("data-look")).toBe("soon");
		expect(clap.querySelector('[data-badge="soon"]')).not.toBeNull();
		expect(clap.querySelector('[data-badge="lock"]')).toBeNull();
		// La ficha sigue opaca (V13): el estado no se marca con opacidad.
		expect(clap.className).not.toMatch(/opacity/);
		await userEvent.click(clap);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("U7b: una unidad bloqueada se ve «locked» y su botón no lleva opacidad", async () => {
		const { unidad } = montar(await storeConDisco(() => {}));
		const rimas = unidad("phase0:rhyme");
		expect(rimas.getAttribute("data-status")).toBe("locked");
		expect(rimas.getAttribute("data-look")).toBe("locked");
		expect(rimas.getAttribute("aria-disabled")).toBe("true");
		expect(rimas.className).not.toMatch(/opacity/);
		// La activa jugable no se atenúa ni lleva insignia.
		const clap = unidad("phase0:clap");
		expect(clap.getAttribute("data-look")).toBe("available");
		expect(clap.querySelector("[data-badge]")).toBeNull();
	});

	it("MS1: con la activa jugable, «Jugar» en el pie inicia, igual que el nodo activo", async () => {
		const { unidad, onStart, container } = montar(
			await storeConDisco(() => {}),
		);
		const pie = container.querySelector("footer") as HTMLElement;
		await userEvent.click(within(pie).getByRole("button", { name: "Jugar" }));
		expect(onStart).toHaveBeenCalledTimes(1);
		await userEvent.click(unidad("phase0:clap"));
		expect(onStart).toHaveBeenCalledTimes(2);
		expect(within(pie).queryByRole("button", { name: "Repasar" })).toBeNull();
	});

	it("MS2: sin activa y jugable, el pie ofrece «Repasar» y un clic inicia", async () => {
		const { onStart, container } = montar(
			await storeConDisco(sinActivaConRepaso),
		);
		const pie = container.querySelector("footer") as HTMLElement;
		expect(within(pie).queryByRole("button", { name: "Jugar" })).toBeNull();
		await userEvent.click(within(pie).getByRole("button", { name: "Repasar" }));
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it("MS3: sin activa y sin plantilla jugable, el pie está en «soon» y no arranca", async () => {
		const { onStart, container } = montar(
			await storeConDisco(sinActivaConRepaso),
			{
				implemented: new Set(),
			},
		);
		const pie = container.querySelector("footer") as HTMLElement;
		const boton = within(pie).getByRole("button", { name: LLEGA_DESPUES });
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		await userEvent.click(boton);
		expect(onStart).not.toHaveBeenCalled();
	});

	it("MS4: con la activa sin plantilla (U7) el pie está en «soon» y el nodo también", async () => {
		const { unidad, onStart, container } = montar(
			await storeConDisco(() => {}),
			{
				implemented: new Set(),
			},
		);
		const pie = container.querySelector("footer") as HTMLElement;
		const boton = within(pie).getByRole("button", { name: LLEGA_DESPUES });
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		expect(within(pie).queryByRole("button", { name: "Jugar" })).toBeNull();
		expect(unidad("phase0:clap").getAttribute("data-look")).toBe("soon");
		await userEvent.click(boton);
		await userEvent.click(unidad("phase0:clap"));
		expect(onStart).not.toHaveBeenCalled();
	});

	it("LY1: «main» es una pantalla de alto fijo en tres filas; solo la zona del camino se desplaza", async () => {
		const { container } = montar(await storeConDisco(() => {}));
		const main = container.querySelector("main") as HTMLElement;
		expect(main.className.split(/\s+/)).toEqual(
			expect.arrayContaining(["h-dvh", "flex", "flex-col"]),
		);
		const hijos = [...main.children];
		expect(hijos.map((e) => e.tagName)).toEqual(["HEADER", "DIV", "FOOTER"]);
		const [cabecera, zona, pie] = hijos as HTMLElement[];
		expect(cabecera?.className).toContain("shrink-0");
		expect(pie?.className).toContain("shrink-0");
		expect(zona?.className.split(/\s+/)).toEqual(
			expect.arrayContaining(["min-h-0", "flex-1", "overflow-y-auto"]),
		);
		expect(zona?.contains(screen.getByRole("region", { name: "Fase 0" }))).toBe(
			true,
		);
	});

	it("nada de lo pintado usa lenguaje de castigo", async () => {
		const { container } = montar(await storeConDisco(() => {}));
		expect(container.innerHTML.toLowerCase()).not.toMatch(
			/error|fallo|incorrect|mal\b|perdiste|otra vez/,
		);
	});

	it("S1: cada nodo declara su celda en las tres rejillas (base 1): la séptima de la Fase 3 es (3, 7) en base", async () => {
		const { unidad } = montar(await storeConDisco(() => {}));
		const ids = curriculum.unitOrder.filter(
			(id) => curriculum.units.get(id)?.phase === 3,
		);
		expect(ids).toHaveLength(8);
		const celdas = layoutCells(ids.length);
		// Las variables CSS: --cb/--rb en base y --c3/--r3 y --c5/--r5 en md y lg.
		const sufijo = { base: "b", md: "3", lg: "5" } as const;
		for (const d of DISPOSICIONES) {
			ids.forEach((id, i) => {
				const estilo = unidad(id).parentElement?.style;
				const s = sufijo[d];
				expect(estilo?.getPropertyValue(`--c${s}`), `${id} ${d} col`).toBe(
					String((celdas[d][i]?.col ?? -2) + 1),
				);
				expect(estilo?.getPropertyValue(`--r${s}`), `${id} ${d} fila`).toBe(
					String((celdas[d][i]?.row ?? -2) + 1),
				);
			});
		}
		const septima = unidad(ids[6] ?? "").parentElement?.style;
		expect(septima?.getPropertyValue("--cb")).toBe("3");
		expect(septima?.getPropertyValue("--rb")).toBe("7");
		expect(septima?.getPropertyValue("--c5")).toBe("4");
		expect(septima?.getPropertyValue("--r5")).toBe("2");
		expect(septima?.getPropertyValue("--c2")).toBe("");
	});

	it("S2: cada fase trae tres caminos (base, md y lg) con el viewBox y el trazo de su rejilla", async () => {
		montar(await storeConDisco(() => {}));
		for (const fase of [0, 1, 2, 3]) {
			const seccion = screen.getByRole("region", { name: `Fase ${fase}` });
			const n = curriculum.unitOrder.filter(
				(id) => curriculum.units.get(id)?.phase === fase,
			).length;
			const celdas = layoutCells(n);
			const svgs = [...seccion.querySelectorAll("svg[data-layout]")];
			expect(
				svgs.map((e) => e.getAttribute("data-layout")),
				`Fase ${fase}`,
			).toEqual(["base", "md", "lg"]);
			const esperado = {
				base: `0 0 5 ${n}`,
				md: `0 0 3 ${Math.ceil(n / 3)}`,
				lg: `0 0 5 ${Math.ceil(n / 5)}`,
			};
			for (const svg of svgs) {
				const d = svg.getAttribute("data-layout") as keyof typeof esperado;
				expect(svg.getAttribute("aria-hidden")).toBe("true");
				expect(svg.getAttribute("viewBox"), `${fase} ${d}`).toBe(esperado[d]);
				expect(svg.getAttribute("viewBox")).toBe(
					`0 0 ${COLUMNAS[d]} ${layoutRows(d, n)}`,
				);
				expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
				expect(svg.getAttribute("class")).toContain("pointer-events-none");
				const trazo = svg.querySelector("path");
				if (n < 2) expect(trazo).toBeNull();
				else {
					expect(trazo?.getAttribute("d")).toBe(layoutPath(d, celdas[d]));
					expect(trazo?.getAttribute("fill")).toBe("none");
					expect(trazo?.getAttribute("vector-effect")).toBe(
						"non-scaling-stroke",
					);
					expect(trazo?.getAttribute("class")?.split(/\s+/)).toContain(
						"stroke-node-locked-depth",
					);
				}
			}
		}
	});

	it("S3: al montar centra la celda de la unidad activa, una sola vez aunque se vuelva a pintar", async () => {
		const original = Element.prototype.scrollIntoView;
		const espia = vi.fn();
		Element.prototype.scrollIntoView = espia;
		try {
			const store = await storeConDisco(() => {});
			const { unidad } = montar(store);
			expect(espia).toHaveBeenCalledTimes(1);
			expect(espia).toHaveBeenCalledWith({ block: "center" });
			const celda = espia.mock.contexts[0] as HTMLElement;
			expect(celda).not.toBe(unidad("phase0:clap"));
			expect(celda).toBe(unidad("phase0:clap").parentElement);
			// Otro pintado del mapa (la marca de guardado cambia) no vuelve a mover la vista.
			act(() => {
				store.setState({
					lastSavedAt: "2026-09-28T14:05:00.000Z",
					saveFailed: false,
				});
			});
			expect(screen.getByLabelText(/Guardado a las/)).toBeDefined();
			expect(espia).toHaveBeenCalledTimes(1);
		} finally {
			Element.prototype.scrollIntoView = original;
		}
	});

	it("S4: sin unidad activa no se centra nada y el pie ofrece «Repasar»", async () => {
		const original = Element.prototype.scrollIntoView;
		const espia = vi.fn();
		Element.prototype.scrollIntoView = espia;
		try {
			const store = await storeConDisco((doc) => {
				todoHechoSalvoFase3(doc);
				for (const id of curriculum.units.get("phase0:clap")?.introduces ?? [])
					doc.items[id] = { ...emptyItemProgress(), presented: true };
			});
			const { container } = montar(store);
			expect(espia).not.toHaveBeenCalled();
			const pie = container.querySelector("footer") as HTMLElement;
			expect(
				within(pie).getByRole("button", { name: "Repasar" }),
			).toBeDefined();
		} finally {
			Element.prototype.scrollIntoView = original;
		}
	});

	it("N9: mantener el candado «Panel de padres» 3 s llama a onOpenPanel; el título no", async () => {
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
			fireEvent.pointerDown(screen.getByRole("heading", { name: "Silabín" }));
			act(() => {
				vi.advanceTimersByTime(3000);
			});
			expect(onOpenPanel).not.toHaveBeenCalled();
			fireEvent.pointerDown(
				screen.getByRole("img", { name: "Panel de padres" }),
			);
			act(() => {
				vi.advanceTimersByTime(3000);
			});
			expect(onOpenPanel).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});
