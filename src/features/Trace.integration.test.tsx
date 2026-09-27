// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { animationMs } from "@/components/TraceCanvas";
import {
	type CurriculumIndex,
	currentExercise,
	curriculum,
	type Glyph,
	type GlyphPoint,
	glyphFor,
	itemProgressOf,
	type SessionRun,
	type Unit,
} from "@/engine";
import { EndScreen } from "@/features/session/EndScreen";
import { SessionScreen } from "@/features/session/SessionScreen";
import { TRACE_IDLE_MS } from "@/features/session/trace/Evaluation";
import { conProveedores, fakeAudio } from "@/features/test-support";
import { createAppStore, createMemoryAdapter } from "@/store";

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
});

/** Igual que `MARGIN` en `TraceCanvas.tsx` (constante privada, no exportada): margen del
 * `viewBox` alrededor de la caja de la letra, por lado. */
const MARGIN = 0.2;
/** Escala de pantalla, igual en ambos ejes: así el rectángulo simulado guarda la misma
 * proporción que el `viewBox` y convertir un punto de la letra a coordenadas de pantalla es
 * la inversa exacta de `toLetterSpace` (`TraceCanvas.tsx`), sin bandas que compensar. */
const SCALE = 300;

type ViewBox = { x: number; y: number; w: number; h: number };

function viewBoxOf(glyph: Glyph): ViewBox {
	return {
		x: -MARGIN,
		y: -MARGIN,
		w: glyph.width + 2 * MARGIN,
		h: 1 + 2 * MARGIN,
	};
}

function stubRect(svg: SVGSVGElement, vb: ViewBox) {
	const width = vb.w * SCALE;
	const height = vb.h * SCALE;
	vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
		left: 0,
		top: 0,
		width,
		height,
		right: width,
		bottom: height,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	});
}

function screenOf(
	p: GlyphPoint,
	vb: ViewBox,
): { clientX: number; clientY: number } {
	return { clientX: (p.x - vb.x) * SCALE, clientY: (p.y - vb.y) * SCALE };
}

let nextPointerId = 1;

/** Un trazo recto de `a` a `b`, en el espacio de la letra (baja, mueve y suelta el dedo). */
function trazoRecto(
	svg: SVGSVGElement,
	vb: ViewBox,
	a: GlyphPoint,
	b: GlyphPoint,
) {
	const pointerId = nextPointerId++;
	const pa = screenOf(a, vb);
	const pb = screenOf(b, vb);
	fireEvent.pointerDown(svg, { pointerId, isPrimary: true, ...pa });
	fireEvent.pointerMove(svg, { pointerId, isPrimary: true, ...pb });
	fireEvent.pointerUp(svg, { pointerId, isPrimary: true, ...pb });
}

/**
 * Traza los trazos reales de la letra (Tarea 1, `glyph.strokes`) tal cual, sin temblor: cada
 * trazo del niño va del primer al último punto de su trazo de referencia, así que al
 * remuestrear (motor) coincide con la geometría de referencia y pasa con cobertura y
 * precisión máximas — «repasarla con cuidado». La tolerancia y el temblor ya están cubiertos
 * por mutación en `trace.test.ts`; esta prueba de integración solo verifica el cableado.
 */
function trazarBien(svg: SVGSVGElement, vb: ViewBox, glyph: Glyph) {
	for (const stroke of glyph.strokes) {
		const first = stroke[0];
		const last = stroke[stroke.length - 1];
		if (first === undefined || last === undefined) continue;
		trazoRecto(svg, vb, first, last);
	}
}

/** Un trazo lejos de cualquier punto de la letra (varias veces `TOLERANCE`, con margen de sobra). */
function trazarLejos(svg: SVGSVGElement, vb: ViewBox) {
	trazoRecto(svg, vb, { x: 5, y: 5 }, { x: 5.3, y: 5.3 });
}

/** El documento tal como lo dejaría el disco: solo los campos que esta prueba comprueba. */
type Guardado = {
	counters: { traces: number };
	items: Record<string, { assisted: number }>;
};

describe("trace de punta a punta, con el motor, el store y las vistas reales", () => {
	it("presentación, un trazo bueno, tres trazos lejos con modelo, y el fin de la sesión cuenta bien (I1-I3)", async () => {
		// Los timers falsos se activan ANTES de montar: la presentación de `trace` arranca su
		// propia animación (`TraceCanvas`, `animation="full"`) en el primer render, así que si
		// se armaran después, ese primer `setTimeout` quedaría en el reloj real.
		vi.useFakeTimers();

		const item = curriculum.items.get("letter:a");
		if (item === undefined)
			throw new Error("Falta letter:a en el currículo real");
		const glyph = glyphFor(item, "upper");
		const vb = viewBoxOf(glyph);

		// Currículo de prueba (modelo: Phase0.integration.test.tsx): el ítem real `letter:a` y
		// una sola unidad `test:trace` que solo declara `trace` — la Fase 1 real también saca
		// `say-it`, que llega en el Plan 5 (D14) y dejaría la sesión no jugable hoy. Se construye
		// el índice a mano (en vez de `buildCurriculum`, que solo vive en `@/content/index`):
		// `features/` no importa `@/content` (U8, `boundaries.test.ts`), solo el barril
		// `@/engine`, y el tipo `CurriculumIndex` ya lo expone.
		const unit: Unit = {
			id: "test:trace",
			phase: 1,
			title: "Prueba de trazo",
			audioKey: "unit:test:trace",
			requires: [],
			introduces: [item.id],
			exercises: [{ templateId: "trace", weight: 1 }],
		};
		const content: CurriculumIndex = {
			items: new Map([[item.id, item]]),
			units: new Map([[unit.id, unit]]),
			unitOrder: [unit.id],
		};

		const adapter = createMemoryAdapter();
		let reloj = 0;
		const store = createAppStore({
			adapter,
			content,
			now: () =>
				`2026-09-27T12:00:${String(reloj++ % 60).padStart(2, "0")}.000Z`,
			seed: () => 1,
		});
		await store.getState().load();
		store.getState().beginSession();

		const audio = fakeAudio();
		function Flujo() {
			const [fin, setFin] = useState(false);
			return fin ? (
				<EndScreen onDone={() => {}} />
			) : (
				<SessionScreen
					onEnd={() => setFin(true)}
					onExit={() => {}}
					celebrationMs={0}
				/>
			);
		}
		const { container } = render(conProveedores(store, audio, <Flujo />));

		const pasar = (ms: number) =>
			act(async () => {
				await vi.advanceTimersByTimeAsync(ms);
			});

		function runActual(): SessionRun {
			const run = store.getState().run;
			if (run === null) throw new Error("No hay sesión en curso");
			return run;
		}

		function svgActual(): SVGSVGElement {
			const svg = container.querySelector("svg");
			if (svg === null) throw new Error("Sin <svg> en pantalla");
			stubRect(svg, vb);
			return svg;
		}

		// --- Presentación: la letra se dibuja sola y luego aparece «Siguiente» ---
		await pasar(animationMs(glyph));
		fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
		await pasar(0);

		// === I1: primera evaluación, trazo correcto ===
		const eval1 = currentExercise(runActual());
		if (eval1 === null) throw new Error("Falta la primera evaluación");
		expect(eval1.templateId).toBe("trace");
		const boxAntes = itemProgressOf(runActual().progress, item.id).box;
		expect(boxAntes).toBe(0);

		let svg = svgActual();
		expect(svg.getAttribute("data-level")).toBe("1"); // caja 0 → guía 1 (D13)
		trazarBien(svg, vb, glyph);
		await pasar(TRACE_IDLE_MS);
		await pasar(50); // celebración (`celebrationMs: 0`) + `next()`, tras un `await`

		const trasI1 = runActual();
		expect(currentExercise(trasI1)?.id).not.toBe(eval1.id);
		expect(itemProgressOf(trasI1.progress, item.id).box).toBeGreaterThan(
			boxAntes,
		);

		// === I2: segunda evaluación, tres trazos lejos de la letra ===
		const eval2 = currentExercise(trasI1);
		if (eval2 === null) throw new Error("Falta la segunda evaluación");
		svg = svgActual();
		expect(svg.getAttribute("data-level")).toBe("2"); // caja 1 → guía 2 (D13)

		// Intento 1: la pista 1 pasa la guía al nivel anterior (aquí sí se nota: 2 → 1).
		trazarLejos(svg, vb);
		await pasar(TRACE_IDLE_MS);
		expect(runActual().attempt.hintsShown).toBe(1);
		expect(svg.getAttribute("data-level")).toBe("1");

		// Intento 2: la pista 2 bloquea el lienzo y lo libera a los `animationMs`.
		trazarLejos(svg, vb);
		await pasar(TRACE_IDLE_MS);
		expect(runActual().attempt.hintsShown).toBe(2);
		expect(svg.getAttribute("data-disabled")).toBe("true");
		await pasar(animationMs(glyph));
		expect(svg.getAttribute("data-disabled")).toBeNull();

		// Intento 3: se resuelve como asistido y llega el modelo.
		trazarLejos(svg, vb);
		await pasar(TRACE_IDLE_MS);
		expect(runActual().resolutions.at(-1)?.status).toBe("assisted");
		expect(svg.getAttribute("data-disabled")).toBe("true");
		await pasar(animationMs(glyph));
		expect(svg.getAttribute("data-disabled")).toBeNull();

		// El niño repasa el modelo: cualquier trazo cierra el intento sin puntuar y avanza.
		trazarLejos(svg, vb);
		await pasar(TRACE_IDLE_MS);
		await pasar(50);
		const trasI2 = runActual();
		expect(currentExercise(trasI2)?.id).not.toBe(eval2.id);

		// Dos evaluaciones más, correctas, para llegar al fin de la sesión.
		for (let i = 0; i < 2; i += 1) {
			const run = store.getState().run;
			if (run === null || currentExercise(run) === null) break;
			svg = svgActual();
			trazarBien(svg, vb, glyph);
			await pasar(TRACE_IDLE_MS);
			await pasar(50);
		}

		// === I3: fin de la sesión ===
		for (
			let i = 0;
			i < 20 && container.querySelector('[data-screen="end"]') === null;
			i += 1
		) {
			await pasar(50);
		}
		expect(container.querySelector('[data-screen="end"]')).not.toBeNull();
		expect(store.getState().run).toBeNull();
		expect(store.getState().summary).not.toBeNull();

		const disco = (await adapter.read()) as Guardado;
		expect(disco.counters.traces).toBe(4);
		expect(disco.items[item.id]?.assisted).toBe(1);
	});
});
