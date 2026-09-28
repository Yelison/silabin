// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { curriculum, type Glyph, type GlyphPoint, glyphFor } from "@/engine";
import {
	itemsDe,
	PLANTILLAS,
	PlantillasDev,
	planificar,
} from "@/features/dev/PlantillasDev";
import { COUNTDOWN_MS } from "@/features/session/voice/VoiceTurn";
import { fakeAudio } from "@/features/test-support";

beforeEach(() => {
	// jsdom no implementa la captura de puntero: un método vacío que los tests pueden espiar,
	// como en `TraceCanvas.test.tsx`. `trace` es la única plantilla que dibuja con el dedo.
	if (!("setPointerCapture" in Element.prototype)) {
		Object.defineProperty(Element.prototype, "setPointerCapture", {
			configurable: true,
			writable: true,
			value: () => {},
		});
	}
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

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
	it("say-it: se monta con el micrófono y el rung 1 enseña la boca", () => {
		montar();
		elegirPlantilla("say-it");
		expect(
			within(evaluacion()).getByRole("button", { name: "Micrófono" }),
		).toBeTruthy();
		expect(evaluacion().querySelector("svg[data-shape]")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Rung 1" }));
		expect(evaluacion().querySelector("svg[data-shape]")).not.toBeNull();
	});

	describe("W8: las plantillas de voz con un micrófono de guion", () => {
		const mic = () =>
			within(evaluacion()).getByRole("button", { name: "Micrófono" });
		const elegirMicrofono = (m: string) =>
			fireEvent.change(
				screen.getByRole("combobox", { name: "Micrófono simulado" }),
				{ target: { value: m } },
			);
		const tocarMicrofono = async () => {
			fireEvent.click(mic());
			await act(async () => {
				await vi.advanceTimersByTimeAsync(COUNTDOWN_MS + 50);
			});
		};
		const botonesDelAdulto = () =>
			within(evaluacion()).queryByRole("button", { name: "Lo dijo bien" });
		function montarConAudio() {
			const audio = fakeAudio();
			render(<PlantillasDev audio={audio} />);
			return { audio };
		}

		it("say-it y read-word están en el selector", () => {
			montar();
			const opciones = within(
				screen.getByRole("combobox", { name: "Plantilla" }),
			)
				.getAllByRole("option")
				.map((o) => o.textContent);
			expect(opciones).toContain("say-it");
			expect(opciones).toContain("read-word");
		});

		it("read-word monta con micrófono, la imagen tapada, y el rung 1 separa las sílabas", () => {
			montar();
			elegirPlantilla("read-word");
			expect(mic()).toBeTruthy();
			expect(
				within(evaluacion()).getByRole("img", { name: "Imagen tapada" }),
			).toBeTruthy();
			expect(evaluacion().querySelector("img[src*='/images/']")).toBeNull();
			expect(within(evaluacion()).queryByText(/·/)).toBeNull();
			fireEvent.click(screen.getByRole("button", { name: "Rung 1" }));
			expect(within(evaluacion()).getByText(/·/)).toBeTruthy();
		});

		it("read-word: el rung 3 descubre la imagen", () => {
			montar();
			elegirPlantilla("read-word");
			fireEvent.click(screen.getByRole("button", { name: "Rung 3" }));
			expect(evaluacion().querySelector("img[src*='/images/']")).not.toBeNull();
			expect(
				within(evaluacion()).queryByRole("img", { name: "Imagen tapada" }),
			).toBeNull();
		});

		it("«Oído»: tras tocar el micrófono salen los botones del adulto y el veredicto se anota", async () => {
			vi.useFakeTimers();
			montarConAudio();
			elegirPlantilla("read-word");
			elegirMicrofono("oido");
			await tocarMicrofono();
			fireEvent.click(botonesDelAdulto() as HTMLElement);
			expect(screen.getByRole("status").textContent).toBe("Veredicto: ok");
		});

		it("«Silencio»: no salen los botones, suena «No te oí» y el micrófono vuelve a estar listo", async () => {
			vi.useFakeTimers();
			const { audio } = montarConAudio();
			elegirPlantilla("say-it");
			elegirMicrofono("silencio");
			await tocarMicrofono();
			expect(botonesDelAdulto()).toBeNull();
			const claves = audio.play.mock.calls.map((c) => c[0].key);
			expect(claves).toContain("feedback:no-speech");
			expect(mic().getAttribute("aria-disabled")).not.toBe("true");
		});

		it("«Sin micrófono»: salen los botones del adulto en cuanto se intenta", async () => {
			vi.useFakeTimers();
			montarConAudio();
			elegirPlantilla("say-it");
			elegirMicrofono("sin-microfono");
			await tocarMicrofono();
			expect(botonesDelAdulto()).not.toBeNull();
		});

		it("el selector de micrófono solo aparece con las plantillas de voz", () => {
			montar();
			elegirPlantilla("listen-tap");
			expect(
				screen.queryByRole("combobox", { name: "Micrófono simulado" }),
			).toBeNull();
			elegirPlantilla("say-it");
			expect(
				screen.getByRole("combobox", { name: "Micrófono simulado" }),
			).toBeTruthy();
		});
	});

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

	function svgDeEvaluacion(): SVGSVGElement {
		const svg = evaluacion().querySelector("svg");
		if (svg === null) throw new Error("sin <svg> en Evaluation");
		return svg;
	}

	it("D1: trace ofrece las 9 letras y un selector de nivel 1/2/3 que cambia el data-level de la evaluación", () => {
		montar();
		elegirPlantilla("trace");
		const ids = within(screen.getByRole("combobox", { name: "Ítem" }))
			.getAllByRole("option")
			.map((o) => o.getAttribute("value"));
		expect(ids).toEqual(
			[...curriculum.items.values()]
				.filter((i) => i.kind === "letter")
				.map((i) => i.id),
		);
		expect(ids).toHaveLength(9);
		// Nivel 1 por defecto (caja 0, sin pistas): el mismo nivel que la Presentación, que
		// siempre enseña el nivel 1 (T4).
		expect(svgDeEvaluacion().getAttribute("data-level")).toBe("1");
		fireEvent.click(screen.getByRole("button", { name: "Nivel 2" }));
		expect(svgDeEvaluacion().getAttribute("data-level")).toBe("2");
		fireEvent.click(screen.getByRole("button", { name: "Nivel 3" }));
		expect(svgDeEvaluacion().getAttribute("data-level")).toBe("3");
		fireEvent.click(screen.getByRole("button", { name: "Nivel 1" }));
		expect(svgDeEvaluacion().getAttribute("data-level")).toBe("1");
		// El nivel también baja con las pistas del rung simulado, no solo con la caja
		// (guideLevel(caja, pistas)): caja 2 (nivel 3 base) con 1 pista muestra nivel 2.
		fireEvent.click(screen.getByRole("button", { name: "Nivel 3" }));
		expect(svgDeEvaluacion().getAttribute("data-level")).toBe("3");
		fireEvent.click(screen.getByRole("button", { name: "Rung 1" }));
		expect(svgDeEvaluacion().getAttribute("data-level")).toBe("2");
	});

	// La misma conversión de coordenadas que TraceCanvas usa por dentro (viewBoxOf +
	// toLetterSpace), invertida: de un punto del glifo a un punto de pantalla. Con un
	// rect de 400×400 no hay bandas que compensar salvo el propio ajuste de aspecto.
	function clientDe(
		p: GlyphPoint,
		glyph: Glyph,
		rect: { left: number; top: number; width: number; height: number },
	) {
		const MARGIN = 0.2;
		const vb = {
			x: -MARGIN,
			y: -MARGIN,
			w: glyph.width + 2 * MARGIN,
			h: 1 + 2 * MARGIN,
		};
		const s = Math.min(rect.width / vb.w, rect.height / vb.h);
		const ox = rect.left + (rect.width - vb.w * s) / 2;
		const oy = rect.top + (rect.height - vb.h * s) / 2;
		return { clientX: ox + (p.x - vb.x) * s, clientY: oy + (p.y - vb.y) * s };
	}

	function trazarGlifo(svg: SVGSVGElement, glyph: Glyph) {
		const rect = { left: 0, top: 0, width: 400, height: 400 };
		vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
			...rect,
			right: rect.width,
			bottom: rect.height,
			x: 0,
			y: 0,
			toJSON: () => rect,
		});
		let pointerId = 1;
		for (const stroke of glyph.strokes) {
			const [first, ...resto] = stroke;
			if (first === undefined) continue;
			const c0 = clientDe(first, glyph, rect);
			fireEvent.pointerDown(svg, {
				pointerId,
				isPrimary: true,
				clientX: c0.clientX,
				clientY: c0.clientY,
			});
			for (const p of resto) {
				const c = clientDe(p, glyph, rect);
				fireEvent.pointerMove(svg, {
					pointerId,
					isPrimary: true,
					clientX: c.clientX,
					clientY: c.clientY,
				});
			}
			const last = resto.at(-1) ?? first;
			const cLast = clientDe(last, glyph, rect);
			fireEvent.pointerUp(svg, {
				pointerId,
				isPrimary: true,
				clientX: cLast.clientX,
				clientY: cLast.clientY,
			});
			pointerId += 1;
		}
	}

	function marcadorTrace(): string {
		const el = evaluacion().querySelector('[data-testid="marcador-trace"]');
		return el?.textContent ?? "";
	}

	it("D2: un trazo sintético sobre la A y 1500 ms: el marcador enseña los números exactos de scoreTrace y «vale»", () => {
		vi.useFakeTimers();
		montar();
		elegirPlantilla("trace");
		const item = curriculum.items.get("letter:a");
		if (item === undefined) throw new Error("Falta letter:a");
		const glyph = glyphFor(item, "upper");
		trazarGlifo(svgDeEvaluacion(), glyph);
		act(() => {
			vi.advanceTimersByTime(1500);
		});
		// Trazo exacto sobre los puntos del glifo: cobertura y precisión perfectas.
		expect(marcadorTrace()).toBe(
			`cobertura ${glyph.strokes.map(() => "100%").join(", ")} · precisión 100% · vale`,
		);
	});

	it("D2: un trazo fuera de la letra dice «no vale»; reintentar con un trazo bueno cambia a «vale» (attemptKey)", () => {
		vi.useFakeTimers();
		montar();
		elegirPlantilla("trace");
		const svg = svgDeEvaluacion();
		const rect = { left: 0, top: 0, width: 400, height: 400 };
		vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
			...rect,
			right: rect.width,
			bottom: rect.height,
			x: 0,
			y: 0,
			toJSON: () => rect,
		});
		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 399,
			clientY: 399,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 399,
			clientY: 399,
		});
		act(() => {
			vi.advanceTimersByTime(1500);
		});
		expect(marcadorTrace()).toContain("no vale");

		// Sin el attemptKey + 1 de Panel, el intento seguiría `submitted` y el lienzo
		// deshabilitado: este segundo trazo no llegaría a puntuarse ni a cambiar el marcador.
		const item = curriculum.items.get("letter:a");
		if (item === undefined) throw new Error("Falta letter:a");
		const glyph = glyphFor(item, "upper");
		trazarGlifo(svg, glyph);
		act(() => {
			vi.advanceTimersByTime(1500);
		});
		expect(marcadorTrace()).toBe(
			`cobertura ${glyph.strokes.map(() => "100%").join(", ")} · precisión 100% · vale`,
		);
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
