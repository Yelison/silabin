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
	type TraceGuide,
	type TraceStroke,
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
		acceptsModel?: (strokes: TraceStroke[]) => boolean;
		guide?: TraceGuide;
	} = {},
) {
	const itemId = over.itemId ?? "letter:a";
	const exercise = ejercicioTrace(itemId);
	const onTrace = vi.fn();
	const onModelDone = vi.fn();
	const onAnswer = vi.fn();
	const acceptsModel = vi.fn(over.acceptsModel ?? (() => true));
	let props: EvaluationProps = {
		exercise,
		item: item(itemId),
		attemptKey: over.attemptKey ?? 0,
		feedback: over.feedback ?? null,
		locked: over.locked ?? false,
		onAnswer,
		onModelDone,
		trace: {
			guide: over.guide ?? guiaDe(itemId, over.nivel ?? 1),
			onTrace,
			clearKey: 0,
			acceptsModel,
		},
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
		acceptsModel,
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

	it("E7 (mutación 3: el modelo no debe puntuar): tras un tercer fallo real (mismo attemptKey, sin intento nuevo), la pista 3 desbloquea a los animationMs con la tinta del intento fallido ya borrada, y un intento cerrado llama a onModelDone una sola vez, nunca a onTrace, con el audio que no resuelve", () => {
		vi.useFakeTimers();
		const audio = fakeAudio();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		// 1) El tercer intento (fallido) se cierra por inactividad: `onTrace` suena una vez y
		// el lienzo queda "enviado". El motor (SessionScreen, fuera de esta vista) lo
		// puntuaría como `wrong` y devolvería la pista 3 sin subir `attemptKey` (así lo fija
		// el propio SessionScreen: `resolucion.status === "assisted"` no lo toca).
		const { container, svg, onModelDone, onTrace, actualizar, props } = montar({
			audio,
		});
		trazoSimple(svg);
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS);
		});
		expect(onTrace).toHaveBeenCalledTimes(1);

		// 2) Llega la pista 3, con el mismo attemptKey (0) y locked en false, tal cual lo
		// manda SessionScreen. Si la vista no deshace su propio "enviado" aquí, el lienzo se
		// queda disabled para siempre y el niño no puede repasar el modelo.
		actualizar({
			feedback: {
				hint: templates.trace.hints[2],
				resolution: { status: "assisted" },
			},
		});
		expect(svg.getAttribute("data-level")).toBe("1");
		expect(svg.getAttribute("data-disabled")).toBe("true");
		const ms = animationMs(props().trace?.guide.glyph as never);
		act(() => {
			vi.advanceTimersByTime(ms);
		});
		expect(svg.getAttribute("data-disabled")).toBeNull();
		// La tinta del tercer intento (fallido) no se queda pegada al modelo.
		expect(container.querySelectorAll('[data-testid="ink"]')).toHaveLength(0);

		// 3) El niño repasa el modelo: un intento cerrado llama a onModelDone, nunca a onTrace.
		trazoSimple(svg);
		act(() => {
			vi.advanceTimersByTime(TRACE_IDLE_MS);
		});
		expect(onModelDone).toHaveBeenCalledTimes(1);
		expect(onTrace).toHaveBeenCalledTimes(1);
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
				clearKey: 0,
				acceptsModel: () => true,
			},
		});
		expect(svg.getAttribute("data-level")).toBe("1");
	});

	it("E9b (D28): con guide.glyph de LOWER_GLYPHS pinta los carriles de la minúscula, no los de la mayúscula", () => {
		const lowerA = glyphFor(item("letter:a"), "lower");
		const guide: TraceGuide = { glyph: lowerA, level: 1 };
		const { svg } = montar({ guide });
		const carriles = svg.querySelectorAll('[data-testid="guide-lane"]');
		expect(carriles.length).toBe(lowerA.strokes.length);
		for (const [i, carril] of carriles.entries()) {
			const esperado = lowerA.strokes[i]
				?.map((p, j) => `${j === 0 ? "M" : "L"}${p.x} ${p.y}`)
				.join(" ");
			expect(carril.getAttribute("d")).toBe(esperado);
		}
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
	describe("D19: clearKey y modelo", () => {
		function conClearKey(t: ReturnType<typeof montar>, clearKey: number): void {
			const trace = t.props().trace;
			if (trace === undefined) throw new Error("sin trace");
			t.actualizar({ trace: { ...trace, clearKey } });
		}

		it("W6: al cambiar clearKey se borra la tinta y el lienzo vuelve a aceptar un envío, sin apagar la pista que se muestra", () => {
			vi.useFakeTimers();
			const t = montar({ nivel: 2 });
			t.actualizar({
				feedback: { hint: templates.trace.hints[0], resolution: null },
			});
			const pulso = () => t.container.querySelector('[data-pulse="true"]');
			expect(pulso()).not.toBeNull();

			trazoSimple(t.svg);
			act(() => {
				vi.advanceTimersByTime(TRACE_IDLE_MS);
			});
			expect(t.onTrace).toHaveBeenCalledTimes(1);
			expect(t.svg.getAttribute("data-disabled")).toBe("true");

			conClearKey(t, 1);

			expect(t.container.querySelectorAll('[data-testid="ink"]')).toHaveLength(
				0,
			);
			expect(t.svg.getAttribute("data-disabled")).toBeNull();
			expect(pulso()).not.toBeNull();
			// Vuelve a mandar, y sin arrastrar la tinta anterior.
			trazoSimple(t.svg, 2);
			act(() => {
				vi.advanceTimersByTime(TRACE_IDLE_MS);
			});
			expect(t.onTrace).toHaveBeenCalledTimes(2);
			expect(t.onTrace.mock.calls[1]?.[0]).toHaveLength(1);
		});

		it("W6: clearKey tampoco corta una animación de pista en curso", () => {
			vi.useFakeTimers();
			const t = montar({ nivel: 2 });
			t.actualizar({
				feedback: { hint: templates.trace.hints[1], resolution: null },
			});
			expect(
				t.container.querySelector('[data-testid="anim-dot"]'),
			).not.toBeNull();
			conClearKey(t, 1);
			expect(
				t.container.querySelector('[data-testid="anim-dot"]'),
			).not.toBeNull();
		});

		it("W7: en el modelo, si acceptsModel dice que no, borra la tinta, no avisa y sigue esperando", () => {
			vi.useFakeTimers();
			const t = montar({ acceptsModel: () => false });
			t.actualizar({
				feedback: {
					hint: templates.trace.hints[2],
					resolution: { status: "assisted" },
				},
			});
			act(() => {
				vi.advanceTimersByTime(10_000);
			});
			trazoSimple(t.svg);
			expect(
				t.container.querySelectorAll('[data-testid="ink"]').length,
			).toBeGreaterThan(0);
			act(() => {
				vi.advanceTimersByTime(TRACE_IDLE_MS);
			});
			expect(t.acceptsModel).toHaveBeenCalledTimes(1);
			expect(t.onModelDone).not.toHaveBeenCalled();
			expect(t.container.querySelectorAll('[data-testid="ink"]')).toHaveLength(
				0,
			);
			expect(t.svg.getAttribute("data-disabled")).toBeNull();
			// Sigue esperando: un segundo intento que sí vale cierra el modelo.
			t.acceptsModel.mockReturnValue(true);
			trazoSimple(t.svg, 2);
			act(() => {
				vi.advanceTimersByTime(TRACE_IDLE_MS);
			});
			expect(t.onModelDone).toHaveBeenCalledTimes(1);
			expect(t.onTrace).not.toHaveBeenCalled();
			// Un intento rechazado no deja sus trazos: `acceptsModelTrace` decide por tinta
			// acumulada, y varios toques accidentales seguidos no pueden sumarse hasta cerrar el
			// modelo sin repasar nada (P12/D19).
			expect(t.acceptsModel).toHaveBeenCalledTimes(2);
			expect(t.acceptsModel.mock.calls[1]?.[0]).toHaveLength(1);
		});

		it("W7: acceptsModel recibe los trazos cerrados del intento", () => {
			vi.useFakeTimers();
			const t = montar();
			t.actualizar({
				feedback: {
					hint: templates.trace.hints[2],
					resolution: { status: "assisted" },
				},
			});
			act(() => {
				vi.advanceTimersByTime(10_000);
			});
			trazoSimple(t.svg);
			act(() => {
				vi.advanceTimersByTime(TRACE_IDLE_MS);
			});
			expect(t.acceptsModel).toHaveBeenCalledTimes(1);
			const trazos = t.acceptsModel.mock.calls[0]?.[0];
			expect(trazos).toHaveLength(1);
		});
	});
});
