// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ANIMATION_MS_PER_UNIT,
	animationMs,
	TraceCanvas,
} from "@/components/TraceCanvas";
import { curriculum, type Glyph, glyphFor, type TraceStroke } from "@/engine";

beforeEach(() => {
	// jsdom no implementa la captura de puntero: un método vacío que los tests pueden espiar,
	// como en `build/Evaluation.test.tsx`. `Element` y no `HTMLElement`: el lienzo es un `<svg>`.
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
	vi.restoreAllMocks();
	vi.useRealTimers();
});

function letra(id: string): Glyph {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	return glyphFor(item, "upper");
}

function stubRect(
	svg: SVGSVGElement,
	rect: { left: number; top: number; width: number; height: number },
) {
	vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
		...rect,
		right: rect.left + rect.width,
		bottom: rect.top + rect.height,
		x: rect.left,
		y: rect.top,
		toJSON: () => rect,
	});
}

function montar(props: Partial<Parameters<typeof TraceCanvas>[0]> = {}) {
	const onStrokeStart = vi.fn();
	const onStrokeEnd = vi.fn();
	const glyph = props.glyph ?? letra("letter:a");
	const { container, rerender } = render(
		<TraceCanvas
			glyph={glyph}
			level={props.level ?? 1}
			strokes={props.strokes ?? []}
			animation={props.animation ?? "none"}
			disabled={props.disabled ?? false}
			{...(props.pulseStart !== undefined
				? { pulseStart: props.pulseStart }
				: {})}
			{...(props.onAnimationEnd !== undefined
				? { onAnimationEnd: props.onAnimationEnd }
				: {})}
			onStrokeStart={props.onStrokeStart ?? onStrokeStart}
			onStrokeEnd={props.onStrokeEnd ?? onStrokeEnd}
		/>,
	);
	const svg = container.querySelector("svg");
	if (svg === null) throw new Error("sin <svg>");
	return { container, svg, onStrokeStart, onStrokeEnd, rerender };
}

describe("TraceCanvas", () => {
	it("V1: convierte coordenadas de pantalla a la caja de la letra; con bandas, un toque en el borde cae fuera", () => {
		const { svg, onStrokeEnd } = montar({ glyph: letra("letter:a") });
		stubRect(svg, { left: 10, top: 20, width: 400, height: 300 });

		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 210,
			clientY: 170,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 210,
			clientY: 170,
		});
		expect(onStrokeEnd).toHaveBeenCalledTimes(1);
		const centro = onStrokeEnd.mock.calls[0]?.[0] as TraceStroke;
		expect(centro).toHaveLength(1);
		expect(centro[0]?.x).toBeCloseTo(0.4, 5);
		expect(centro[0]?.y).toBeCloseTo(0.5, 5);

		onStrokeEnd.mockClear();
		fireEvent.pointerDown(svg, {
			pointerId: 2,
			isPrimary: true,
			clientX: 10,
			clientY: 170,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 2,
			isPrimary: true,
			clientX: 10,
			clientY: 170,
		});
		const borde = onStrokeEnd.mock.calls[0]?.[0] as TraceStroke;
		expect(borde[0]?.x).toBeLessThan(-0.2);
	});

	it("V2: un lienzo sin tamaño (rect 0×0) ignora la entrada, sin tinta ni llamadas", () => {
		const { svg, container, onStrokeStart, onStrokeEnd } = montar();
		stubRect(svg, { left: 0, top: 0, width: 0, height: 0 });

		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 5,
			clientY: 5,
		});
		fireEvent.pointerMove(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 6,
			clientY: 6,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 6,
			clientY: 6,
		});
		expect(onStrokeStart).not.toHaveBeenCalled();
		expect(onStrokeEnd).not.toHaveBeenCalled();
		expect(container.querySelectorAll('[data-testid="ink"]')).toHaveLength(0);
	});

	it("V3: un segundo dedo (isPrimary false) no corta el trazo del primero ni pinta", () => {
		const { svg, onStrokeStart, onStrokeEnd } = montar();
		stubRect(svg, { left: 0, top: 0, width: 400, height: 300 });

		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 100,
			clientY: 100,
		});
		fireEvent.pointerDown(svg, {
			pointerId: 2,
			isPrimary: false,
			clientX: 50,
			clientY: 50,
		});
		fireEvent.pointerMove(svg, {
			pointerId: 2,
			isPrimary: false,
			clientX: 60,
			clientY: 60,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 2,
			isPrimary: false,
			clientX: 60,
			clientY: 60,
		});
		expect(onStrokeEnd).not.toHaveBeenCalled();
		expect(onStrokeStart).toHaveBeenCalledTimes(1);

		fireEvent.pointerMove(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 110,
			clientY: 110,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 110,
			clientY: 110,
		});
		expect(onStrokeEnd).toHaveBeenCalledTimes(1);
		const trazo = onStrokeEnd.mock.calls[0]?.[0] as TraceStroke;
		// Solo los 2 puntos del puntero 1 (down + move); el move del puntero 2 no entró.
		expect(trazo).toHaveLength(2);
	});

	it("V4: pointercancel a mitad de trazo cierra una sola vez con los puntos hasta entonces", () => {
		const { svg, onStrokeEnd } = montar();
		stubRect(svg, { left: 0, top: 0, width: 400, height: 300 });

		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 100,
			clientY: 100,
		});
		fireEvent.pointerMove(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 120,
			clientY: 100,
		});
		fireEvent.pointerCancel(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 120,
			clientY: 100,
		});
		expect(onStrokeEnd).toHaveBeenCalledTimes(1);
		expect(onStrokeEnd.mock.calls[0]?.[0]).toHaveLength(2);

		// Un `pointerup` de sistema tras el cancel no cierra un segundo trazo vacío.
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 120,
			clientY: 100,
		});
		expect(onStrokeEnd).toHaveBeenCalledTimes(1);
	});

	it("V5: los niveles pintan inicios, flechas y punteada según la tabla, y data-level es el nivel", () => {
		const glyph = letra("letter:e"); // 4 trazos
		const tabla = [
			{ level: 1 as const, inicios: 4, flechas: 4, punteada: true },
			{ level: 2 as const, inicios: 4, flechas: 0, punteada: false },
			{ level: 3 as const, inicios: 1, flechas: 0, punteada: false },
		];
		for (const caso of tabla) {
			const { svg, container } = montar({ glyph, level: caso.level });
			expect(svg.getAttribute("data-level")).toBe(String(caso.level));
			expect(
				container.querySelectorAll('[data-testid^="guide-start-"]'),
			).toHaveLength(caso.inicios);
			expect(
				container.querySelectorAll('[data-testid^="guide-arrow-"]'),
			).toHaveLength(caso.flechas);
			expect(
				container.querySelectorAll('[data-testid="guide-dash"]').length > 0,
			).toBe(caso.punteada);
			cleanup();
		}
	});

	it("V6: disabled ignora toda la entrada, igual que el lienzo sin tamaño", () => {
		const { svg, container, onStrokeStart, onStrokeEnd } = montar({
			disabled: true,
		});
		stubRect(svg, { left: 0, top: 0, width: 400, height: 300 });

		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 100,
			clientY: 100,
		});
		fireEvent.pointerMove(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 110,
			clientY: 100,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 110,
			clientY: 100,
		});
		expect(onStrokeStart).not.toHaveBeenCalled();
		expect(onStrokeEnd).not.toHaveBeenCalled();
		expect(container.querySelectorAll('[data-testid="ink"]')).toHaveLength(0);
	});

	it("V7: 'dot' llama a onAnimationEnd una sola vez, a los animationMs(glyph), ni antes ni dos veces", () => {
		vi.useFakeTimers();
		const glyph = letra("letter:i"); // 1 trazo vertical de longitud 1
		expect(animationMs(glyph)).toBe(900);
		const onAnimationEnd = vi.fn();
		montar({ glyph, animation: "dot", onAnimationEnd });

		act(() => {
			vi.advanceTimersByTime(899);
		});
		expect(onAnimationEnd).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onAnimationEnd).toHaveBeenCalledTimes(1);
		act(() => {
			vi.advanceTimersByTime(10_000);
		});
		expect(onAnimationEnd).toHaveBeenCalledTimes(1);
	});

	it("'none' no arranca ningún temporizador de animación", () => {
		vi.useFakeTimers();
		const onAnimationEnd = vi.fn();
		montar({ animation: "none", onAnimationEnd });
		act(() => {
			vi.advanceTimersByTime(10_000);
		});
		expect(onAnimationEnd).not.toHaveBeenCalled();
	});

	it("cambiar 'animation' antes de que acabe cancela el temporizador anterior, sin llamar dos veces", () => {
		vi.useFakeTimers();
		const glyph = letra("letter:i");
		const onAnimationEnd = vi.fn();
		const { rerender } = montar({ glyph, animation: "dot", onAnimationEnd });
		act(() => {
			vi.advanceTimersByTime(400);
		});
		rerender(
			<TraceCanvas
				glyph={glyph}
				level={1}
				strokes={[]}
				animation="full"
				disabled={false}
				onAnimationEnd={onAnimationEnd}
				onStrokeStart={() => {}}
				onStrokeEnd={() => {}}
			/>,
		);
		// El temporizador de "dot" habría vencido en t=900 (400 + 500) si no se hubiera cancelado.
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(onAnimationEnd).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(onAnimationEnd).toHaveBeenCalledTimes(1);
	});

	it("pulseStart marca el inicio 1 y no toca los demás", () => {
		const glyph = letra("letter:e");
		const { container } = montar({ glyph, level: 2, pulseStart: true });
		const inicio1 = container.querySelector('[data-testid="guide-start-1"]');
		const inicio2 = container.querySelector('[data-testid="guide-start-2"]');
		expect(inicio1?.getAttribute("data-pulse")).toBe("true");
		expect(inicio2?.getAttribute("data-pulse")).toBeNull();
	});

	it("pinta la tinta ya cerrada que le pasa el padre", () => {
		const strokes: TraceStroke[] = [
			[
				{ x: 0.1, y: 0.1 },
				{ x: 0.2, y: 0.2 },
			],
		];
		const { container } = montar({ strokes });
		expect(container.querySelectorAll('[data-testid="ink"]')).toHaveLength(1);
	});

	it("T6-1: 'full' y 'dot' llevan motion-reduce:transition-none junto a su motion-safe: (bug confirmado con Playwright, ver registro de la Tarea 5)", () => {
		const glyph = letra("letter:e");
		const { container } = montar({ glyph, animation: "full" });
		const full = container.querySelector('[data-testid="anim-full"]');
		expect(full?.getAttribute("class")).toContain(
			"motion-safe:transition-[stroke-dashoffset]",
		);
		expect(full?.getAttribute("class")).toContain(
			"motion-reduce:transition-none",
		);
		cleanup();

		const { container: container2 } = montar({ glyph, animation: "dot" });
		const dot = container2.querySelector('[data-testid="anim-dot"]');
		expect(dot?.getAttribute("class")).toContain(
			"motion-safe:transition-[offset-distance]",
		);
		expect(dot?.getAttribute("class")).toContain(
			"motion-reduce:transition-none",
		);
	});
});

describe("animationMs", () => {
	it("ANIMATION_MS_PER_UNIT es 900 y el mínimo es 800", () => {
		expect(ANIMATION_MS_PER_UNIT).toBe(900);
		const puntito: Glyph = {
			width: 0.1,
			strokes: [
				[
					{ x: 0, y: 0 },
					{ x: 0.01, y: 0 },
				],
			],
		};
		expect(animationMs(puntito)).toBe(800);
	});

	it("suma las longitudes de todos los trazos", () => {
		const dosLineas: Glyph = {
			width: 1,
			strokes: [
				[
					{ x: 0, y: 0 },
					{ x: 0, y: 1 },
				],
				[
					{ x: 0, y: 0 },
					{ x: 1, y: 0 },
				],
			],
		};
		expect(animationMs(dosLineas)).toBe(2 * ANIMATION_MS_PER_UNIT);
	});
});
