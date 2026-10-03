// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { TraceCanvas } from "@/components/TraceCanvas";
import { curriculum, glyphFor, type PlannedExercise } from "@/engine";
import { MAX_PARTICLES, TrailLayer } from "@/features/rewards/TrailLayer";
import { Evaluation as BuildEvaluation } from "@/features/session/build/Evaluation";
import {
	conProveedores,
	crearStore,
	documentoConUnidadesHechas,
	fakeAudio,
} from "@/features/test-support";
import { type AppState, createMemoryAdapter } from "@/store";

function movimientoReducido(activo: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: activo && query.includes("prefers-reduced-motion"),
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
		})),
	);
}

const RECT = {
	left: 0,
	top: 0,
	width: 300,
	height: 300,
	right: 300,
	bottom: 300,
	x: 0,
	y: 0,
	toJSON: () => ({}),
};

async function storeConTrail(
	cosmeticId: string | null,
	opciones: { reducedCelebrations?: boolean } = {},
): Promise<StoreApi<AppState>> {
	const doc = documentoConUnidadesHechas(null);
	const store = crearStore(
		createMemoryAdapter({
			...doc,
			settings: {
				...doc.settings,
				reducedCelebrations: opciones.reducedCelebrations ?? false,
			},
			rewards: {
				unlockedAt: {
					"word-reader": "2026-09-26T12:00:00.000Z",
					"first-syllable-voice": "2026-09-26T12:00:00.000Z",
				},
				equipped: { background: null, companion: null, trail: cosmeticId },
			},
		}),
	);
	await store.getState().load();
	return store;
}

function conProveedoresDefault(
	children: ReactNode,
	store?: StoreApi<AppState>,
) {
	return conProveedores(store ?? crearStore(), fakeAudio(), children);
}

beforeEach(() => {
	movimientoReducido(false);
	if (!("setPointerCapture" in Element.prototype)) {
		Object.defineProperty(Element.prototype, "setPointerCapture", {
			configurable: true,
			writable: true,
			value: () => {},
		});
	}
	Object.defineProperty(document, "elementsFromPoint", {
		configurable: true,
		writable: true,
		value: vi.fn(() => []),
	});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

const ITEM_A = curriculum.items.get("letter:a");
if (ITEM_A === undefined) throw new Error("Falta letter:a");
const GLYPH_A = glyphFor(ITEM_A, "lower");

function montarTrazo(opts: {
	onStrokeStart: () => void;
	onStrokeEnd: (s: unknown) => void;
	withTrail: boolean;
	store?: StoreApi<AppState>;
}) {
	const canvas = (
		<TraceCanvas
			glyph={GLYPH_A}
			level={1}
			strokes={[]}
			animation="none"
			disabled={false}
			onStrokeStart={opts.onStrokeStart}
			onStrokeEnd={opts.onStrokeEnd}
		/>
	);
	const contenido = opts.withTrail ? (
		<>
			{canvas}
			<TrailLayer />
		</>
	) : (
		canvas
	);
	const { container } = render(conProveedoresDefault(contenido, opts.store));
	const svg = container.querySelector("svg");
	if (svg === null) throw new Error("no hay svg");
	vi.spyOn(svg, "getBoundingClientRect").mockReturnValue(RECT as DOMRect);
	return svg;
}

function trazar(svg: SVGSVGElement) {
	fireEvent.pointerDown(svg, {
		pointerId: 1,
		isPrimary: true,
		clientX: 10,
		clientY: 10,
	});
	fireEvent.pointerMove(svg, {
		pointerId: 1,
		isPrimary: true,
		clientX: 60,
		clientY: 90,
	});
	fireEvent.pointerUp(svg, {
		pointerId: 1,
		isPrimary: true,
		clientX: 60,
		clientY: 90,
	});
}

function datosBuild(itemId: string, optionIds: string[]) {
	const item = curriculum.items.get(itemId);
	if (item === undefined) throw new Error(`Falta ${itemId}`);
	const exercise: PlannedExercise = {
		id: `ev:${itemId}`,
		kind: "evaluation",
		templateId: "build",
		itemId,
		optionIds,
		correctOptionId: null,
		source: "active-unit",
	};
	return { item, exercise };
}

describe("TrailLayer", () => {
	describe("F6: rastro sobre trazo y arrastre", () => {
		it("un trazo en TraceCanvas llega igual a onTrace, con los mismos puntos que sin rastro", async () => {
			const sinRastro = { onStrokeStart: vi.fn(), onStrokeEnd: vi.fn() };
			const svgSin = montarTrazo({
				onStrokeStart: sinRastro.onStrokeStart,
				onStrokeEnd: sinRastro.onStrokeEnd,
				withTrail: false,
			});
			trazar(svgSin);
			cleanup();

			const store = await storeConTrail("trail:burbujas");
			const conRastro = { onStrokeStart: vi.fn(), onStrokeEnd: vi.fn() };
			const svgCon = montarTrazo({
				onStrokeStart: conRastro.onStrokeStart,
				onStrokeEnd: conRastro.onStrokeEnd,
				withTrail: true,
				store,
			});
			trazar(svgCon);

			expect(conRastro.onStrokeStart).toHaveBeenCalledTimes(1);
			expect(conRastro.onStrokeEnd).toHaveBeenCalledTimes(1);
			expect(conRastro.onStrokeEnd.mock.calls[0]).toEqual(
				sinRastro.onStrokeEnd.mock.calls[0],
			);
		});

		it("un arrastre de build coloca la pieza igual con el rastro montado", async () => {
			const { item, exercise } = datosBuild("syllable:ma", [
				"letter:m",
				"letter:a",
				"letter:e",
				"letter:l",
				"letter:i",
				"letter:o",
				"letter:u",
			]);
			const store = await storeConTrail("trail:burbujas");
			const onAnswer = vi.fn();
			const { container } = render(
				conProveedoresDefault(
					<>
						<BuildEvaluation
							exercise={exercise}
							item={item}
							attemptKey={0}
							feedback={null}
							locked={false}
							onAnswer={onAnswer}
							onModelDone={vi.fn()}
						/>
						<TrailLayer />
					</>,
					store,
				),
			);
			const botonDe = (nombre: string) =>
				[...container.querySelectorAll("button")].find(
					(b) => b.getAttribute("aria-label") === nombre,
				);
			const casilla1 = container.querySelector('[data-casilla="0"]');
			const casilla2 = container.querySelector('[data-casilla="1"]');
			if (casilla1 === null || casilla2 === null)
				throw new Error("faltan las casillas");

			/** Arrastra la pieza `nombre` y la suelta sobre `destino`. */
			function arrastrar(nombre: string, destino: Element) {
				const pieza = botonDe(nombre);
				if (pieza === undefined) throw new Error(`falta ${nombre}`);
				(
					document.elementsFromPoint as ReturnType<typeof vi.fn>
				).mockImplementation(() => [pieza, destino]);
				fireEvent.pointerDown(pieza, {
					pointerId: 1,
					clientX: 10,
					clientY: 10,
				});
				fireEvent.pointerMove(pieza, {
					pointerId: 1,
					clientX: 80,
					clientY: 90,
				});
				fireEvent.pointerUp(pieza, { pointerId: 1, clientX: 80, clientY: 90 });
			}

			arrastrar("a", casilla2);
			arrastrar("m", casilla1);

			expect(onAnswer).toHaveBeenCalledWith("ma");
		});

		it("la capa no bloquea el trazo ni el arrastre: pointer-events-none, y nunca preventDefault ni stopPropagation", async () => {
			const store = await storeConTrail("trail:burbujas");
			const { container } = render(
				conProveedoresDefault(<TrailLayer />, store),
			);
			const capa = container.querySelector('[data-testid="trail-layer"]');
			expect(capa).not.toBeNull();
			// Mutación: la capa sin pointer-events-none debe hacer fallar esta prueba.
			expect(capa?.className).toContain("pointer-events-none");

			let burbujeo = false;
			const oyente = () => {
				burbujeo = true;
			};
			document.body.addEventListener("pointerdown", oyente);
			// Se espía la llamada, no solo `defaultPrevented`: el propio listener es `passive`
			// (a propósito), así que un `preventDefault()` dentro no cambiaría ese valor —el
			// navegador lo ignora en un oyente pasivo—, pero si el código lo llama igualmente es
			// la señal exacta de la mutación que hay que atrapar.
			const preventDefaultSpy = vi.spyOn(Event.prototype, "preventDefault");
			const evento = new PointerEvent("pointerdown", {
				bubbles: true,
				cancelable: true,
				clientX: 5,
				clientY: 5,
			});
			act(() => {
				document.body.dispatchEvent(evento);
			});
			document.body.removeEventListener("pointerdown", oyente);
			// Mutación: preventDefault en pointerdown debe hacer fallar esta prueba.
			expect(preventDefaultSpy).not.toHaveBeenCalled();
			// Si la capa llamara a stopPropagation en la fase de captura de window, este oyente
			// (más abajo en el árbol) nunca vería el evento.
			expect(burbujeo).toBe(true);
		});
	});

	describe("el tope de partículas vivas se cumple en el DOM", () => {
		it("30 pointermove disparados por separado (no en un único lote de estado) nunca montan más de MAX_PARTICLES nodos", async () => {
			const store = await storeConTrail("trail:burbujas");
			const { container } = render(
				conProveedoresDefault(<TrailLayer />, store),
			);
			// Cada fireEvent aquí es su propio act()/render, tal y como ocurre en producción con
			// gestos reales: no se agrupan en un solo array de estado. Si `AnimatePresence`
			// retuviera los nodos recortados por el tope durante su animación de salida, el DOM
			// tendría más de MAX_PARTICLES <span> aquí.
			for (let i = 0; i < 30; i++) {
				fireEvent.pointerMove(window, { clientX: i, clientY: i });
			}
			const nodos = container.querySelectorAll(
				'[data-testid="trail-layer"] span',
			);
			expect(nodos.length).toBeLessThanOrEqual(MAX_PARTICLES);
		});
	});

	describe("AR13: la partícula es la imagen del rastro", () => {
		it("con trail:estrellitas un pointerdown crea una partícula que es una imagen de 28 px, sin emoji", async () => {
			const store = await storeConTrail("trail:estrellitas");
			const { container } = render(
				conProveedoresDefault(<TrailLayer />, store),
			);
			act(() => {
				document.body.dispatchEvent(
					new PointerEvent("pointerdown", {
						bubbles: true,
						clientX: 5,
						clientY: 5,
					}),
				);
			});
			const capa = container.querySelector('[data-testid="trail-layer"]');
			const img = capa?.querySelector("img");
			expect(img?.getAttribute("src")).toMatch(/\/particle-estrellita\.webp$/);
			expect(img?.getAttribute("width")).toBe("28");
			expect(capa?.textContent).not.toContain("✨");
		});
	});

	describe("F7: sin trail:none ni con movimiento reducido", () => {
		it("con trail:none no monta la capa ni tras un pointerdown", async () => {
			const store = await storeConTrail("trail:none");
			const { container } = render(
				conProveedoresDefault(<TrailLayer />, store),
			);
			expect(container.querySelector('[data-testid="trail-layer"]')).toBeNull();
			act(() => {
				document.body.dispatchEvent(
					new PointerEvent("pointerdown", {
						bubbles: true,
						clientX: 1,
						clientY: 1,
					}),
				);
			});
			expect(container.querySelector('[data-testid="trail-layer"]')).toBeNull();
		});

		it("con reducedCelebrations no monta la capa aunque haya rastro equipado", async () => {
			const store = await storeConTrail("trail:burbujas", {
				reducedCelebrations: true,
			});
			const { container } = render(
				conProveedoresDefault(<TrailLayer />, store),
			);
			expect(container.querySelector('[data-testid="trail-layer"]')).toBeNull();
		});
	});
});

/** matchMedia con `(pointer: …)` controlable: `cambiar` dispara `change` a quien escucha. */
function conPuntero(tipo: "fine" | "coarse") {
	let actual = tipo;
	const oyentes = new Set<() => void>();
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			get matches() {
				return query.includes("pointer: fine") && actual === "fine";
			},
			media: query,
			addEventListener: (_: string, f: () => void) => oyentes.add(f),
			removeEventListener: (_: string, f: () => void) => oyentes.delete(f),
		})),
	);
	return {
		cambiar(nuevo: "fine" | "coarse") {
			actual = nuevo;
			act(() => {
				for (const f of [...oyentes]) f();
			});
		},
	};
}

const html = () => document.documentElement;
const CURSOR_ESTRELLITA = 'url("/icons/cursor-estrellita.png") 16 16';

describe("TrailLayer: cursor de PC por rastro (V11)", () => {
	afterEach(() => {
		html().removeAttribute("data-trail-cursor");
		html().style.removeProperty("--trail-cursor");
	});

	it("RA1: con (pointer: fine) pone el atributo y la propiedad en <html>", async () => {
		conPuntero("fine");
		const store = await storeConTrail("trail:estrellitas");
		render(conProveedoresDefault(<TrailLayer />, store));
		expect(html().getAttribute("data-trail-cursor")).toBe("trail:estrellitas");
		expect(html().style.getPropertyValue("--trail-cursor")).toBe(
			CURSOR_ESTRELLITA,
		);
	});

	it("RA2: con (pointer: coarse) no toca <html>", async () => {
		conPuntero("coarse");
		const store = await storeConTrail("trail:estrellitas");
		render(conProveedoresDefault(<TrailLayer />, store));
		expect(html().hasAttribute("data-trail-cursor")).toBe(false);
		expect(html().style.getPropertyValue("--trail-cursor")).toBe("");
	});

	it("RA3: al equipar trail:none quita el atributo y la propiedad", async () => {
		conPuntero("fine");
		const store = await storeConTrail("trail:estrellitas");
		render(conProveedoresDefault(<TrailLayer />, store));
		expect(html().hasAttribute("data-trail-cursor")).toBe(true);
		await act(async () => {
			await store.getState().equip("trail:none");
		});
		expect(html().hasAttribute("data-trail-cursor")).toBe(false);
		expect(html().style.getPropertyValue("--trail-cursor")).toBe("");
	});

	it("RA3: al desmontar quita el atributo y la propiedad", async () => {
		conPuntero("fine");
		const store = await storeConTrail("trail:estrellitas");
		const { unmount } = render(conProveedoresDefault(<TrailLayer />, store));
		expect(html().hasAttribute("data-trail-cursor")).toBe(true);
		unmount();
		expect(html().hasAttribute("data-trail-cursor")).toBe(false);
		expect(html().style.getPropertyValue("--trail-cursor")).toBe("");
	});

	it("RA4: con reducedCelebrations el cursor sigue puesto y no sale ninguna partícula", async () => {
		conPuntero("fine");
		const store = await storeConTrail("trail:estrellitas", {
			reducedCelebrations: true,
		});
		const { container } = render(conProveedoresDefault(<TrailLayer />, store));
		act(() => {
			document.body.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
					clientX: 5,
					clientY: 5,
				}),
			);
		});
		expect(html().getAttribute("data-trail-cursor")).toBe("trail:estrellitas");
		expect(html().style.getPropertyValue("--trail-cursor")).toBe(
			CURSOR_ESTRELLITA,
		);
		expect(container.querySelector('[data-testid="trail-layer"]')).toBeNull();
		expect(container.querySelector("img")).toBeNull();
	});

	it("RA6: cambiar directo de un rastro con cursor a otro cambia el cursor, sin pasar por trail:none", async () => {
		conPuntero("fine");
		const store = await storeConTrail("trail:estrellitas");
		render(conProveedoresDefault(<TrailLayer />, store));
		expect(html().getAttribute("data-trail-cursor")).toBe("trail:estrellitas");
		await act(async () => {
			await store.getState().equip("trail:burbujas");
		});
		expect(html().getAttribute("data-trail-cursor")).toBe("trail:burbujas");
		expect(html().style.getPropertyValue("--trail-cursor")).toBe(
			'url("/icons/cursor-burbuja.png") 16 16',
		);
	});

	it("RA5: si el puntero pasa de coarse a fine, el cursor aparece sin volver a montar", async () => {
		const mq = conPuntero("coarse");
		const store = await storeConTrail("trail:estrellitas");
		render(conProveedoresDefault(<TrailLayer />, store));
		expect(html().hasAttribute("data-trail-cursor")).toBe(false);
		mq.cambiar("fine");
		expect(html().getAttribute("data-trail-cursor")).toBe("trail:estrellitas");
		mq.cambiar("coarse");
		expect(html().hasAttribute("data-trail-cursor")).toBe(false);
	});
});
