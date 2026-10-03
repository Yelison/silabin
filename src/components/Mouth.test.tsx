// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BOCAS_PUBLICADAS,
	MOUTH_SHAPES,
	MOUTH_STEP_MS,
	Mouth,
	mouthFrameSrc,
} from "@/components/Mouth";
import type { MouthShape } from "@/engine";

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

beforeEach(() => {
	vi.useFakeTimers();
	movimientoReducido(false);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

const FORMAS: MouthShape[] = ["closed", "open", "round"];
const forma = (c: HTMLElement) =>
	c.querySelector("[data-shape]")?.getAttribute("data-shape");

const fotogramas = (c: HTMLElement) =>
	Array.from(c.querySelectorAll<HTMLImageElement>("img[data-frame]"));
const visibles = (c: HTMLElement) =>
	fotogramas(c)
		.filter((i) => i.className.split(" ").includes("opacity-100"))
		.map((i) => i.getAttribute("data-frame"));

describe("Mouth: fotogramas apilados (V12), con las bocas publicadas", () => {
	it("BO1: pinta los seis fotogramas desde el primer pintado, con su src", () => {
		const { container } = render(
			<Mouth shapes={["open", "closed"]} playing={true} publicadas={true} />,
		);
		const imgs = fotogramas(container);
		expect(imgs).toHaveLength(6);
		for (const img of imgs) {
			const f = img.getAttribute("data-frame");
			expect(img.getAttribute("src")).toBe(`/images/arte/mouth-${f}.webp`);
			expect(img.getAttribute("alt")).toBe("");
			expect(img.getAttribute("draggable")).toBe("false");
			expect(img.className).toContain("absolute");
			expect(img.className).toContain("inset-0");
		}
		expect(imgs.map((i) => i.getAttribute("data-frame")).sort()).toEqual(
			[...MOUTH_SHAPES].sort(),
		);
	});

	it("BO2: solo la forma actual es opaca, y avanza cada MOUTH_STEP_MS hasta onDone", () => {
		const onDone = vi.fn();
		const { container } = render(
			<Mouth
				shapes={["open", "closed"]}
				playing={true}
				publicadas={true}
				onDone={onDone}
			/>,
		);
		expect(forma(container)).toBe("open");
		expect(visibles(container)).toEqual(["open"]);
		expect(
			fotogramas(container).filter((i) => i.className.includes("opacity-0")),
		).toHaveLength(5);
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(forma(container)).toBe("closed");
		expect(visibles(container)).toEqual(["closed"]);
		expect(onDone).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("BO2: el contenedor es decorativo, relative size-32, y el cambio solo anima con motion-safe", () => {
		const { container } = render(
			<Mouth shapes={["open", "closed"]} playing={true} publicadas={true} />,
		);
		const raiz = container.firstElementChild;
		expect(raiz?.getAttribute("aria-hidden")).toBe("true");
		expect(raiz?.className).toContain("relative");
		expect(raiz?.className).toContain("size-32");
		const clases = fotogramas(container)[0]?.className ?? "";
		expect(clases).toContain("motion-safe:transition-opacity");
		expect(clases).toContain("motion-safe:duration-150");
	});

	it("BO3: con movimiento reducido, la última forma quieta y onDone al tiempo total", () => {
		movimientoReducido(true);
		const onDone = vi.fn();
		const { container } = render(
			<Mouth
				shapes={["open", "closed"]}
				playing={true}
				publicadas={true}
				onDone={onDone}
			/>,
		);
		expect(forma(container)).toBe("closed");
		expect(visibles(container)).toEqual(["closed"]);
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS * 2 - 1));
		expect(onDone).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(1));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("BO4: si un fotograma no carga, pinta el SVG esquemático y mantiene el paso y los tiempos", () => {
		const onDone = vi.fn();
		const { container } = render(
			<Mouth
				shapes={["open", "closed"]}
				playing={true}
				publicadas={true}
				onDone={onDone}
			/>,
		);
		const tercero = fotogramas(container)[2];
		if (tercero === undefined) throw new Error("sin fotograma");
		fireEvent.error(tercero);
		expect(fotogramas(container)).toHaveLength(0);
		const svg = container.querySelector("svg[data-shape]");
		expect(svg?.getAttribute("data-shape")).toBe("open");
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(
			container.querySelector("svg[data-shape]")?.getAttribute("data-shape"),
		).toBe("closed");
		expect(onDone).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("BO5: MOUTH_SHAPES tiene seis valores sin repetir y mouthFrameSrc apunta al WebP", () => {
		expect(MOUTH_SHAPES).toHaveLength(6);
		expect(new Set(MOUTH_SHAPES).size).toBe(6);
		expect(mouthFrameSrc("round")).toBe("/images/arte/mouth-round.webp");
	});
});

describe("Mouth: interruptor BOCAS_PUBLICADAS", () => {
	it("BP1: sin la prop, Mouth sigue a BOCAS_PUBLICADAS (con cualquier valor de la constante)", () => {
		const { container } = render(<Mouth shapes={["open"]} playing={false} />);
		expect(container.querySelectorAll("img").length).toBe(
			BOCAS_PUBLICADAS ? MOUTH_SHAPES.length : 0,
		);
	});

	it("BP2: con el interruptor apagado no pide ninguna imagen: ni un <img>", () => {
		const { container } = render(
			<Mouth shapes={["open", "closed"]} playing={true} publicadas={false} />,
		);
		expect(container.querySelectorAll("img")).toHaveLength(0);
		expect(container.innerHTML).not.toContain("mouth-");
	});

	it("BP3: con el interruptor apagado pinta la boca esquemática de cada forma", () => {
		for (const f of MOUTH_SHAPES) {
			const { container, unmount } = render(
				<Mouth shapes={[f]} playing={false} publicadas={false} />,
			);
			const svg = container.querySelector("svg[data-shape]");
			expect(svg?.getAttribute("data-shape"), f).toBe(f);
			expect(svg?.getAttribute("aria-hidden")).toBe("true");
			expect(container.querySelectorAll("img")).toHaveLength(0);
			unmount();
		}
	});

	it("BP4: apagado, el recorrido sigue igual: cambia de forma y llama onDone", () => {
		const onDone = vi.fn();
		const { container } = render(
			<Mouth
				shapes={["open", "closed"]}
				playing={true}
				publicadas={false}
				onDone={onDone}
			/>,
		);
		expect(forma(container)).toBe("open");
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(forma(container)).toBe("closed");
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(onDone).toHaveBeenCalledTimes(1);
	});
});

describe("Mouth", () => {
	it("V2: es decorativa (aria-hidden)", () => {
		const { container } = render(<Mouth shapes={FORMAS} playing={false} />);
		expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("V2: recorre las formas una vez y llama onDone una sola vez a formas × MOUTH_STEP_MS", () => {
		const onDone = vi.fn();
		const { container } = render(
			<Mouth shapes={FORMAS} playing={true} onDone={onDone} />,
		);
		expect(forma(container)).toBe("closed");
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(forma(container)).toBe("open");
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(forma(container)).toBe("round");
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS - 1));
		expect(onDone).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(1));
		expect(onDone).toHaveBeenCalledTimes(1);
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS * 5));
		expect(onDone).toHaveBeenCalledTimes(1);
		expect(forma(container)).toBe("round");
	});

	it("V2: con movimiento reducido muestra la última forma quieta y llama onDone al mismo tiempo total", () => {
		movimientoReducido(true);
		const onDone = vi.fn();
		const { container } = render(
			<Mouth shapes={FORMAS} playing={true} onDone={onDone} />,
		);
		expect(forma(container)).toBe("round");
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS * FORMAS.length - 1));
		expect(forma(container)).toBe("round");
		expect(onDone).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(1));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("un padre que repinta con otro array igual no reinicia el recorrido", () => {
		const onDone = vi.fn();
		const { rerender } = render(
			<Mouth shapes={["closed", "open"]} playing={true} onDone={onDone} />,
		);
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		rerender(
			<Mouth shapes={["closed", "open"]} playing={true} onDone={onDone} />,
		);
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("al desmontar a mitad, no llama onDone", () => {
		const onDone = vi.fn();
		const { unmount } = render(
			<Mouth shapes={FORMAS} playing={true} onDone={onDone} />,
		);
		unmount();
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS * 10));
		expect(onDone).not.toHaveBeenCalled();
	});

	it("sin playing no recorre nada ni llama onDone", () => {
		const onDone = vi.fn();
		render(<Mouth shapes={FORMAS} playing={false} onDone={onDone} />);
		act(() => vi.advanceTimersByTime(MOUTH_STEP_MS * 10));
		expect(onDone).not.toHaveBeenCalled();
	});
});
