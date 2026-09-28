// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ANIMATION_MS_PER_UNIT,
	animationMs,
	TRACE_ARROW_POINTS,
	TraceCanvas,
} from "@/components/TraceCanvas";
import { curriculum, type Glyph, glyphFor, type TraceStroke } from "@/engine";

/**
 * Las 9 letras con trazo de referencia (`UPPER_GLYPHS` en `@/content/glyphs`), alcanzadas por el
 * barril `@/engine` — este fichero vive en `components/`, que no importa `@/content` (U8).
 */
function letrasConTrazo(): [string, Glyph][] {
	const salida: [string, Glyph][] = [];
	for (const item of curriculum.items.values()) {
		if (item.kind !== "letter") continue;
		salida.push([item.text, glyphFor(item, "upper")]);
	}
	return salida;
}

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
			{...(props.dotDurationMs !== undefined
				? { dotDurationMs: props.dotDurationMs }
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

	it("T6-2: en las 9 letras de UPPER_GLYPHS, ningún par de marcadores guide-start-* queda a menos de 0.14 de distancia (A, E, M y P tienen dos trazos que empiezan en el mismo punto)", () => {
		const letras = letrasConTrazo();
		expect(letras).toHaveLength(9);
		for (const [nombre, glyph] of letras) {
			const { container } = montar({ glyph, level: 1 });
			const marcadores = Array.from(
				container.querySelectorAll('[data-testid^="guide-start-"] circle'),
			);
			for (let i = 0; i < marcadores.length; i += 1) {
				for (let j = i + 1; j < marcadores.length; j += 1) {
					const a = marcadores[i];
					const b = marcadores[j];
					const ax = Number(a?.getAttribute("cx"));
					const ay = Number(a?.getAttribute("cy"));
					const bx = Number(b?.getAttribute("cx"));
					const by = Number(b?.getAttribute("cy"));
					const distancia = Math.hypot(ax - bx, ay - by);
					expect(
						distancia,
						`${nombre}: marcadores ${i + 1} y ${j + 1} a ${distancia.toFixed(4)}`,
					).toBeGreaterThanOrEqual(0.14);
				}
			}
			cleanup();
		}
	});

	it("T6-2b (hallazgo del revisor, ronda 1: T6-2 solo mide distancia, no dirección): en 'm', el marcador de inicio 2 se desplaza hacia la dirección inicial de su propio trazo — (0,0)→(0.45,0.6), no hacia el final del trazo (0.9,0) ni en sentido contrario", () => {
		const glyph = letra("letter:m");
		const { container } = montar({ glyph, level: 1 });
		const inicio2 = container.querySelector(
			'[data-testid="guide-start-2"] circle',
		);
		// Trazo 2 de 'm': (0,0)→(0.45,0.6)→(0.9,0), coincide en el inicio con el trazo 1 (0,0).
		// Dirección inicial (0,0)→(0.45,0.6): un triángulo 3-4-5 (0.45,0.6,0.75), cos=0.6,
		// sen=0.8. Con START_MARKER_OFFSET=0.24: marcador esperado en (0.144, 0.192). Usar la
		// dirección *final* del trazo (hacia (0.9,0): ángulo -53.13°) o invertir el signo del
		// ángulo inicial dan los dos (0.144, -0.192) — rompen esta aserción exacta.
		expect(Number(inicio2?.getAttribute("cx"))).toBeCloseTo(0.144, 5);
		expect(Number(inicio2?.getAttribute("cy"))).toBeCloseTo(0.192, 5);
	});

	it("T6-4: la flecha estática de fin de trazo crece a 0.06-0.08 unidades, sin cambiar de color", () => {
		const glyph = letra("letter:i");
		const { container } = montar({ glyph, level: 1 });
		const flecha = container.querySelector('[data-testid="guide-arrow-1"]');
		expect(flecha?.getAttribute("class")).toBe("fill-calm-border");
		expect(flecha?.getAttribute("points")).toBe(TRACE_ARROW_POINTS);
		const coordenadas = TRACE_ARROW_POINTS.split(/\s+/).flatMap((par) =>
			par.split(",").map(Number),
		);
		expect(coordenadas.length).toBeGreaterThan(0);
		for (const coordenada of coordenadas) {
			if (coordenada === 0) continue;
			expect(Math.abs(coordenada)).toBeGreaterThanOrEqual(0.06);
			expect(Math.abs(coordenada)).toBeLessThanOrEqual(0.08);
		}
	});

	it("T6-3: 'dot' pinta el mismo triángulo que la flecha estática, viajando por offsetPath con offset-rotate:auto", () => {
		const glyph = letra("letter:i");
		const { container } = montar({ glyph, animation: "dot" });
		const flecha = container.querySelector('[data-testid="anim-dot"]');
		expect(flecha?.tagName.toLowerCase()).toBe("polygon");
		expect(flecha?.getAttribute("points")).toBe(TRACE_ARROW_POINTS);
		const estilo = flecha?.getAttribute("style") ?? "";
		// letter:i es un solo trazo de (0.1,0) a (0.1,1): combinedPathD lo deja tal cual.
		expect(estilo).toContain("offset-path: path('M0.1 0 L0.1 1')");
		expect(estilo).toContain("offset-rotate: auto");
		expect(estilo).toContain("offset-distance: 0%");
	});

	it("T6-3b: 'dotDurationMs', si se pasa, sustituye a animationMs(glyph) en el temporizador y en la duración de la transición de 'dot'", () => {
		vi.useFakeTimers();
		const glyph = letra("letter:i"); // animationMs(glyph) = 900
		const onAnimationEnd = vi.fn();
		const { container } = montar({
			glyph,
			animation: "dot",
			onAnimationEnd,
			dotDurationMs: 300,
		});
		const flecha = container.querySelector('[data-testid="anim-dot"]');
		expect(flecha?.getAttribute("style")).toContain(
			"transition-duration: 300ms",
		);
		act(() => {
			vi.advanceTimersByTime(299);
		});
		expect(onAnimationEnd).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onAnimationEnd).toHaveBeenCalledTimes(1);
	});

	it("sin 'dotDurationMs', 'dot' sigue acabando a animationMs(glyph) como antes (pista 2 de Evaluation no cambia de duración)", () => {
		vi.useFakeTimers();
		const glyph = letra("letter:i");
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
