// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOUTH_STEP_MS, Mouth } from "@/components/Mouth";
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
