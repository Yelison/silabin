// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { animationMs } from "@/components/TraceCanvas";
import {
	createAttemptState,
	curriculum,
	emptyProgressState,
	glyphFor,
	type Item,
	type PlannedExercise,
	type SessionRun,
} from "@/engine";
import {
	ARROW_ANIMATION_RATIO,
	Presentation,
} from "@/features/session/trace/Presentation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

beforeEach(() => {
	// jsdom no implementa la captura de puntero: un método vacío que los tests pueden espiar.
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

function item(id: string): Item {
	const found = curriculum.items.get(id);
	if (found === undefined) throw new Error(`Falta ${id}`);
	return found;
}

function ejercicio(itemId: string): PlannedExercise {
	return {
		id: `pr:${itemId}`,
		kind: "presentation",
		templateId: "trace",
		itemId,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
}

const LETRA_A = item("letter:a");

function montar(
	audio = fakeAudio(),
	elItem = LETRA_A,
	wrapper: "plain" | "strict" = "plain",
) {
	const onDone = vi.fn();
	const ui = conProveedores(
		crearStore(),
		audio,
		<Presentation
			exercise={ejercicio(elItem.id)}
			item={elItem}
			onDone={onDone}
		/>,
	);
	const view = render(
		wrapper === "strict" ? <StrictMode>{ui}</StrictMode> : ui,
	);
	return { onDone, audio, ...view };
}

/** Una corrida mínima, válida, con el `traceCase` que se quiera probar (D28). */
function corridaCon(traceCase: SessionRun["traceCase"]): SessionRun {
	return {
		sessionIndex: 0,
		unitId: null,
		exercises: [],
		cursor: 0,
		attempt: createAttemptState(),
		resolutions: [],
		progress: emptyProgressState(),
		...(traceCase === undefined ? {} : { traceCase }),
	};
}

/** Igual que `montar`, pero con `run.traceCase` ya fijado en el store antes de pintar. */
function montarConCaso(traceCase: SessionRun["traceCase"]) {
	const audio = fakeAudio();
	const onDone = vi.fn();
	const store = crearStore();
	store.setState({ run: corridaCon(traceCase) });
	const view = render(
		conProveedores(
			store,
			audio,
			<Presentation
				exercise={ejercicio(LETRA_A.id)}
				item={LETRA_A}
				onDone={onDone}
			/>,
		),
	);
	return { onDone, audio, ...view };
}

const svgDelLienzo = (container: HTMLElement): SVGSVGElement => {
	const svg = container.querySelector("svg");
	if (svg === null) throw new Error("sin <svg>");
	return svg;
};

const siguiente = () => screen.queryByRole("button", { name: "Siguiente" });

function stubRect(svg: SVGSVGElement) {
	vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
		left: 0,
		top: 0,
		width: 400,
		height: 400,
		right: 400,
		bottom: 400,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	});
}

describe("trace / Presentation", () => {
	it("P1: letter:a enseña su par a/A y el lienzo pinta en nivel 1 con la animación completa", () => {
		const { container } = montar();
		expect(container.textContent).toContain("a");
		expect(container.textContent).toContain("A");
		const svg = svgDelLienzo(container);
		expect(svg.getAttribute("data-level")).toBe("1");
		expect(svg.querySelectorAll('[data-testid="anim-full"]').length).toBe(
			glyphFor(LETRA_A, "upper").strokes.length,
		);
	});

	it("P2: en modo estricto, el audio suena una sola vez: la pasada que se corta no llega a sonar", () => {
		const audio = fakeAudio();
		montar(audio, LETRA_A, "strict");
		const playOrder = audio.play.mock.invocationCallOrder;
		const stopOrder = audio.stop.mock.invocationCallOrder;
		// El doble invocado de StrictMode: si React dejara de duplicar el montaje, este
		// test dejaría de probar nada (pasaría igual con un solo play).
		expect(playOrder.length).toBe(2);
		// Cada play salvo el último va seguido de un stop (la pasada que el modo estricto
		// descarta), y el último play llega después del último stop: es el que suena de verdad.
		for (let i = 0; i < playOrder.length - 1; i += 1) {
			const propio = playOrder[i] as number;
			const elSiguiente = playOrder[i + 1] as number;
			expect(
				stopOrder.some((s) => s > propio && s < elSiguiente),
				`play #${i} debería cortarse con stop antes del siguiente play`,
			).toBe(true);
		}
		const ultimoPlay = playOrder[playOrder.length - 1] as number;
		const ultimoStop = stopOrder[stopOrder.length - 1];
		if (ultimoStop !== undefined)
			expect(ultimoPlay).toBeGreaterThan(ultimoStop);
		expect(audio.play).toHaveBeenCalledWith({ key: "phoneme:a" });
	});

	it("al desmontar se corta el sonido", () => {
		const audio = fakeAudio();
		const { unmount } = montar(audio);
		unmount();
		expect(audio.stop).toHaveBeenCalled();
	});

	it("P3: con un audio que nunca resuelve, «Siguiente» aparece tras el dibujo completo y la flecha de dirección que lo sigue, y onDone llega al tocarlo", () => {
		vi.useFakeTimers();
		const audio = fakeAudio();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		const { onDone } = montar(audio);
		const ms = animationMs(glyphFor(LETRA_A, "upper"));
		const arrowMs = ms * ARROW_ANIMATION_RATIO;
		act(() => {
			vi.advanceTimersByTime(ms - 1);
		});
		expect(siguiente()).toBeNull();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		// El dibujo completo acabó: antes de «Siguiente» viene la flecha de dirección (Tarea 6,
		// punto 3), más corta que el dibujo, con la letra ya quieta.
		expect(siguiente()).toBeNull();
		act(() => {
			vi.advanceTimersByTime(arrowMs - 1);
		});
		expect(siguiente()).toBeNull();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(siguiente()).not.toBeNull();
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("P3b: entre el dibujo completo y «Siguiente» se ve la guía de dirección animada, no el dibujo repetido", () => {
		vi.useFakeTimers();
		const { container } = montar();
		const ms = animationMs(glyphFor(LETRA_A, "upper"));
		act(() => {
			vi.advanceTimersByTime(ms - 1);
		});
		expect(container.querySelector('[data-testid="anim-full"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="anim-dot"]')).toBeNull();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(container.querySelector('[data-testid="anim-full"]')).toBeNull();
		expect(container.querySelector('[data-testid="anim-dot"]')).not.toBeNull();
	});

	it("P4: el niño puede repasar la letra mientras se presenta: se ve su tinta y no se llama a nada", () => {
		const audio = fakeAudio();
		const { container, onDone } = montar(audio);
		const svg = svgDelLienzo(container);
		stubRect(svg);
		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 200,
			clientY: 100,
		});
		fireEvent.pointerMove(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 220,
			clientY: 300,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 220,
			clientY: 300,
		});
		expect(svg.querySelectorAll('[data-testid="ink"]').length).toBe(1);
		expect(onDone).not.toHaveBeenCalled();
		expect(audio.play).toHaveBeenCalledTimes(1);
	});

	it("P6: el lienzo lleva el tamaño de tableta en vertical (Tarea 6, punto 5: 47.6 % medido en 768×1024, min-width 768 + portrait para no rozar el 1024×768 apaisado)", () => {
		const { container } = montar();
		const contenedorLienzo = svgDelLienzo(container).closest("div");
		expect(contenedorLienzo?.className).toContain("md:portrait:h-[65vh]");
	});

	it("P7: con la corrida en minúscula (D28) pinta el glifo de LOWER_GLYPHS, no el de UPPER_GLYPHS; el par a/A sigue visible", () => {
		const { container } = montarConCaso("lower");
		const carriles = svgDelLienzo(container).querySelectorAll(
			'[data-testid="guide-lane"]',
		);
		const lowerA = glyphFor(LETRA_A, "lower");
		const upperA = glyphFor(LETRA_A, "upper");
		expect(carriles.length).toBe(lowerA.strokes.length);
		expect(carriles.length).not.toBe(0);
		for (const [i, carril] of carriles.entries()) {
			const esperado = lowerA.strokes[i]
				?.map((p, j) => `${j === 0 ? "M" : "L"}${p.x} ${p.y}`)
				.join(" ");
			expect(carril.getAttribute("d")).toBe(esperado);
		}
		// Ninguno de los trazos coincide con los de la mayúscula (formas bien distintas).
		const dsMinuscula = [...carriles].map((c) => c.getAttribute("d"));
		const dsMayuscula = upperA.strokes.map((s) =>
			s.map((p, j) => `${j === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" "),
		);
		expect(dsMinuscula).not.toEqual(dsMayuscula);
		// El par a/A sigue visible en la presentación (spec §2), sea cual sea el caso trazado.
		expect(container.textContent).toContain("a");
		expect(container.textContent).toContain("A");
	});

	it("P7b: sin traceCase en la corrida (o con 'upper'), sigue pintando la mayúscula", () => {
		const { container } = montarConCaso(undefined);
		const carriles = svgDelLienzo(container).querySelectorAll(
			'[data-testid="guide-lane"]',
		);
		const upperA = glyphFor(LETRA_A, "upper");
		expect(carriles.length).toBe(upperA.strokes.length);
		for (const [i, carril] of carriles.entries()) {
			const esperado = upperA.strokes[i]
				?.map((p, j) => `${j === 0 ? "M" : "L"}${p.x} ${p.y}`)
				.join(" ");
			expect(carril.getAttribute("d")).toBe(esperado);
		}
	});
});
