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
	curriculum,
	glyphFor,
	type Item,
	type PlannedExercise,
} from "@/engine";
import { Presentation } from "@/features/session/trace/Presentation";
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
		expect(playOrder.length).toBeGreaterThanOrEqual(1);
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

	it("P3: con un audio que nunca resuelve, «Siguiente» aparece justo a los animationMs y onDone llega al tocarlo", () => {
		vi.useFakeTimers();
		const audio = fakeAudio();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		const { onDone } = montar(audio);
		const ms = animationMs(glyphFor(LETRA_A, "upper"));
		act(() => {
			vi.advanceTimersByTime(ms - 1);
		});
		expect(siguiente()).toBeNull();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(siguiente()).not.toBeNull();
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
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
});
