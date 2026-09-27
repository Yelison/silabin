// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { animationMs } from "@/components/TraceCanvas";
import {
	type AttemptFeedback,
	curriculum,
	type GuideLevel,
	glyphFor,
	type Item,
	type PlannedExercise,
	templates,
} from "@/engine";
import type { EvaluationProps } from "@/features/session/registry";
import { Evaluation, TRACE_IDLE_MS } from "@/features/session/trace/Evaluation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

beforeEach(() => {
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

function ejercicioTrace(itemId: string): PlannedExercise {
	return {
		id: `ev:${itemId}`,
		kind: "evaluation",
		templateId: "trace",
		itemId,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
}

function guiaDe(itemId: string, level: GuideLevel) {
	return { glyph: glyphFor(item(itemId), "upper"), level };
}

function encontrarSvg(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector("svg");
	if (svg === null) throw new Error("sin <svg>");
	return svg;
}

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

/** Un trazo de un solo punto: baja y sube el dedo en el mismo sitio. */
function trazoSimple(svg: SVGSVGElement, pointerId = 1) {
	fireEvent.pointerDown(svg, {
		pointerId,
		isPrimary: true,
		clientX: 200,
		clientY: 200,
	});
	fireEvent.pointerUp(svg, {
		pointerId,
		isPrimary: true,
		clientX: 200,
		clientY: 200,
	});
}

function montar(
	over: {
		attemptKey?: number;
		feedback?: AttemptFeedback | null;
		locked?: boolean;
		nivel?: GuideLevel;
		itemId?: string;
		audio?: ReturnType<typeof fakeAudio>;
	} = {},
) {
	const itemId = over.itemId ?? "letter:a";
	const exercise = ejercicioTrace(itemId);
	const onTrace = vi.fn();
	const onModelDone = vi.fn();
	const onAnswer = vi.fn();
	let props: EvaluationProps = {
		exercise,
		item: item(itemId),
		attemptKey: over.attemptKey ?? 0,
		feedback: over.feedback ?? null,
		locked: over.locked ?? false,
		onAnswer,
		onModelDone,
		trace: { guide: guiaDe(itemId, over.nivel ?? 1), onTrace },
	};
	const store = crearStore();
	const audio = over.audio ?? fakeAudio();
	const utils = render(conProveedores(store, audio, <Evaluation {...props} />));
	const svg = encontrarSvg(utils.container);
	stubRect(svg);

	function actualizar(cambios: Partial<EvaluationProps>) {
		props = { ...props, ...cambios };
		utils.rerender(conProveedores(store, audio, <Evaluation {...props} />));
	}

	return {
		...utils,
		svg,
		store,
		audio,
		onTrace,
		onModelDone,
		onAnswer,
		actualizar,
		props: () => props,
	};
}

describe("trace Evaluation", () => {
	it("E1: al soltar el dedo, onTrace llega una sola vez a los TRACE_IDLE_MS, no antes", () => {
		vi.useFakeTimers();
		const { svg, onTrace } = montar();
		trazoSimple(svg);
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS - 1);
		});
		expect(onTrace).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onTrace).toHaveBeenCalledTimes(1);
		expect(onTrace.mock.calls[0]?.[0]).toHaveLength(1);
	});

	it("E2 (mutación 1: onStrokeStart debe cancelar el temporizador pendiente): un segundo trazo a medio gesto no dispara un envío prematuro, y el envío final trae los 2 trazos", () => {
		vi.useFakeTimers();
		const { svg, onTrace } = montar();
		fireEvent.pointerDown(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 100,
			clientY: 100,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 1,
			isPrimary: true,
			clientX: 100,
			clientY: 100,
		});
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(onTrace).not.toHaveBeenCalled();
		// Empieza el segundo trazo (a medio gesto: el dedo sigue bajado).
		fireEvent.pointerDown(svg, {
			pointerId: 2,
			isPrimary: true,
			clientX: 200,
			clientY: 200,
		});
		// Este es justo el instante en el que el primer temporizador (armado al soltar el
		// trazo 1) habría vencido si `onStrokeStart` no lo hubiera cancelado.
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(onTrace).not.toHaveBeenCalled();
		fireEvent.pointerMove(svg, {
			pointerId: 2,
			isPrimary: true,
			clientX: 210,
			clientY: 200,
		});
		fireEvent.pointerUp(svg, {
			pointerId: 2,
			isPrimary: true,
			clientX: 210,
			clientY: 200,
		});
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS - 1);
		});
		expect(onTrace).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onTrace).toHaveBeenCalledTimes(1);
		expect(onTrace.mock.calls[0]?.[0]).toHaveLength(2);
	});

	it("E3: cambiar attemptKey antes de que venza borra la tinta y no llega ningún onTrace tardío", () => {
		vi.useFakeTimers();
		const { container, svg, onTrace, actualizar } = montar();
		trazoSimple(svg);
		expect(container.querySelectorAll('[data-testid="ink"]')).toHaveLength(1);
		actualizar({ attemptKey: 1 });
		expect(container.querySelectorAll('[data-testid="ink"]')).toHaveLength(0);
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(onTrace).not.toHaveBeenCalled();
	});

	it("E4: con locked, el lienzo queda disabled y un trazo no llega a onTrace", () => {
		vi.useFakeTimers();
		const { svg, onTrace } = montar({ locked: true });
		expect(svg.getAttribute("data-disabled")).toBe("true");
		trazoSimple(svg);
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS + 100);
		});
		expect(onTrace).not.toHaveBeenCalled();
	});

	it("E5: la pista 1 pulsa el punto de inicio 1", () => {
		const { container } = montar({
			feedback: { hint: templates.trace.hints[0], resolution: null },
			nivel: 2,
		});
		const inicio1 = container.querySelector('[data-testid="guide-start-1"]');
		expect(inicio1?.getAttribute("data-pulse")).toBe("true");
	});

	it("E6 (mutación 4: no puede esperar al audio para desbloquear): la pista 2 pide item.audioKey sin esperarlo y desbloquea a los animationMs, aunque el audio no resuelva nunca", () => {
		vi.useFakeTimers();
		const audio = fakeAudio();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		const { svg, props } = montar({
			feedback: {
				hint: templates.trace.hints[1],
				resolution: null,
			},
			audio,
		});
		expect(audio.play).toHaveBeenCalledWith({ key: props().item.audioKey });
		expect(svg.getAttribute("data-disabled")).toBe("true");
		const ms = animationMs(props().trace?.guide.glyph as never);
		act(() => {
			vi.advanceTimersByTime(ms - 1);
		});
		expect(svg.getAttribute("data-disabled")).toBe("true");
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(svg.getAttribute("data-disabled")).toBeNull();
	});

	it("E7 (mutación 3: el modelo no debe puntuar): la pista 3 anima 'full', desbloquea a los animationMs y un intento cerrado con tinta llama a onModelDone una sola vez, nunca a onTrace, con el audio que no resuelve", () => {
		vi.useFakeTimers();
		const audio = fakeAudio();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		const { svg, onModelDone, onTrace, props } = montar({
			feedback: {
				hint: templates.trace.hints[2],
				resolution: { status: "assisted" },
			},
			audio,
		});
		expect(svg.getAttribute("data-level")).toBe("1");
		expect(svg.getAttribute("data-disabled")).toBe("true");
		const ms = animationMs(props().trace?.guide.glyph as never);
		act(() => {
			vi.advanceTimersByTime(ms);
		});
		expect(svg.getAttribute("data-disabled")).toBeNull();
		trazoSimple(svg);
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS);
		});
		expect(onModelDone).toHaveBeenCalledTimes(1);
		expect(onTrace).not.toHaveBeenCalled();
	});

	it("E8: la guía queda congelada mientras locked, aunque el nivel que llega suba", () => {
		const { svg, actualizar, props } = montar({ nivel: 1, locked: false });
		expect(svg.getAttribute("data-level")).toBe("1");
		const itemId = props().item.id;
		actualizar({
			locked: true,
			trace: {
				guide: guiaDe(itemId, 2),
				onTrace: props().trace?.onTrace ?? vi.fn(),
			},
		});
		expect(svg.getAttribute("data-level")).toBe("1");
	});

	it("E9: sin props.trace, lanza", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const itemId = "letter:a";
		const props: EvaluationProps = {
			exercise: ejercicioTrace(itemId),
			item: item(itemId),
			attemptKey: 0,
			feedback: null,
			locked: false,
			onAnswer: vi.fn(),
			onModelDone: vi.fn(),
		};
		const store = crearStore();
		expect(() =>
			render(conProveedores(store, fakeAudio(), <Evaluation {...props} />)),
		).toThrow();
	});

	it("E10: tras enviar el intento, tocar de nuevo antes del siguiente attemptKey no deja tinta nueva ni manda un segundo onTrace", () => {
		vi.useFakeTimers();
		const { container, svg, onTrace } = montar();
		trazoSimple(svg);
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS);
		});
		expect(onTrace).toHaveBeenCalledTimes(1);
		const tintaTrasEnviar = container.querySelectorAll(
			'[data-testid="ink"]',
		).length;
		// El lienzo ya está `disabled` (enviado): el segundo toque no añade tinta nueva.
		trazoSimple(svg, 2);
		expect(container.querySelectorAll('[data-testid="ink"]')).toHaveLength(
			tintaTrasEnviar,
		);
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS + 100);
		});
		expect(onTrace).toHaveBeenCalledTimes(1);
	});

	it("el botón de repetir vuelve a sonar item.audioKey, y se deshabilita con locked", () => {
		const { getByRole, audio, props } = montar({ locked: false });
		const boton = getByRole("button", { name: "Oír otra vez" });
		expect(boton.getAttribute("aria-disabled")).toBe("false");
		fireEvent.click(boton);
		expect(audio.play).toHaveBeenCalledWith({ key: props().item.audioKey });
	});

	it("el botón de repetir no suena mientras locked", () => {
		const { getByRole, audio } = montar({ locked: true });
		const boton = getByRole("button", { name: "Oír otra vez" });
		expect(boton.getAttribute("aria-disabled")).toBe("true");
		fireEvent.click(boton);
		expect(audio.play).not.toHaveBeenCalled();
	});
});
