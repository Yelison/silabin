// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CurriculumIndex,
	currentExercise,
	curriculum,
	itemProgressOf,
	type SessionRun,
	type Unit,
} from "@/engine";
import { AppProviders, type SpeechDeps } from "@/features/app-context";
import { SessionScreen } from "@/features/session/SessionScreen";
import { COUNTDOWN_MS, TAP_GUARD_MS } from "@/features/session/voice/VoiceTurn";
import { fakeAudio } from "@/features/test-support";
import { createParentEvaluator } from "@/speech";
import { createAppStore, createMemoryAdapter } from "@/store";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

/**
 * Currículo de prueba: el ítem real `letter:a` y una unidad que solo declara `say-it`, para
 * jugar la plantilla de voz de punta a punta con el motor, el store y las vistas reales.
 */
async function montar() {
	const item = curriculum.items.get("letter:a");
	if (item === undefined) throw new Error("Falta letter:a");
	const unit: Unit = {
		id: "test:say-it",
		phase: 1,
		title: "Prueba de voz",
		audioKey: "unit:test:say-it",
		requires: [],
		introduces: [item.id],
		exercises: [{ templateId: "say-it", weight: 1 }],
	};
	const content: CurriculumIndex = {
		items: new Map([[item.id, item]]),
		units: new Map([[unit.id, unit]]),
		unitOrder: [unit.id],
	};
	let reloj = 0;
	const store = createAppStore({
		adapter: createMemoryAdapter(),
		content,
		now: () => `2026-09-28T12:00:${String(reloj++ % 60).padStart(2, "0")}.000Z`,
		seed: () => 1,
	});
	await store.getState().load();
	store.getState().beginSession();
	const audio = fakeAudio();
	const speech: SpeechDeps = {
		listener: { listen: vi.fn(async () => ({ kind: "heard" as const })) },
		evaluators: [createParentEvaluator()],
	};
	const { container } = render(
		<AppProviders store={store} audio={audio} speech={speech}>
			<SessionScreen onEnd={() => {}} onExit={() => {}} celebrationMs={0} />
		</AppProviders>,
	);
	const pasar = (ms: number) =>
		act(async () => {
			await vi.advanceTimersByTimeAsync(ms);
		});
	const run = (): SessionRun => {
		const r = store.getState().run;
		if (r === null) throw new Error("sin corrida");
		return r;
	};
	// Pasa la presentación de la letra y deja la primera evaluación en pantalla.
	for (const ms of [1000, 1000, 1000, 1000, 1000]) await pasar(ms);
	const desde = audio.play.mock.calls.length;
	fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
	await pasar(0);
	const claves = () => audio.play.mock.calls.slice(desde).map((c) => c[0].key);
	return { store, audio, container, pasar, run, claves, item };
}

const boca = (c: HTMLElement) => c.querySelector("[data-shape]");

describe("say-it de punta a punta, con el motor, el store y las vistas reales", () => {
	it("Y5: tres «Otra vez» dan la boca, el sonido alargado y el modelo; hablar en el modelo avanza", async () => {
		const { container, pasar, run, claves } = await montar();
		const evaluacion = currentExercise(run());
		expect(evaluacion?.kind).toBe("evaluation");
		expect(evaluacion?.templateId).toBe("say-it");
		// P8: solo la instrucción, no el sonido de la letra.
		expect(claves()).toEqual(["instruction:say-it"]);
		expect(boca(container)).toBeNull();

		async function decirYFallar() {
			fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
			await pasar(COUNTDOWN_MS + 50);
			fireEvent.click(screen.getByRole("button", { name: "Otra vez" }));
			await pasar(TAP_GUARD_MS + 50);
		}

		// Fallo 1: «Otra vez» neutro y, después, la boca con la instrucción.
		await decirYFallar();
		expect(claves().slice(1)).toEqual(["feedback:retry", "instruction:say-it"]);
		expect(boca(container)?.getAttribute("data-shape")).toBe("open");

		// Fallo 2: el sonido alargado.
		await decirYFallar();
		expect(claves().at(-1)).toBe("stretch:letter:a");
		expect(boca(container)).toBeNull();

		// Fallo 3: el objetivo entero, resuelto como asistido.
		await decirYFallar();
		expect(claves().at(-1)).toBe("phoneme:a");
		expect(run().resolutions.at(-1)?.status).toBe("assisted");

		// En el modelo basta con hablar: «heard» avanza al siguiente ejercicio.
		const cursor = run().cursor;
		fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
		await pasar(COUNTDOWN_MS + 50);
		expect(run().cursor).toBe(cursor + 1);
	});

	it("Y6: «Lo dijo bien» al primer intento celebra, da mastery-credit y avanza", async () => {
		const { pasar, run, claves, store, item } = await montar();
		const cursor = run().cursor;
		fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
		await pasar(COUNTDOWN_MS + 50);
		fireEvent.click(screen.getByRole("button", { name: "Lo dijo bien" }));
		await pasar(50);
		// Tras celebrar, el ejercicio siguiente monta y suena solo su instrucción.
		expect(claves()).toEqual([
			"instruction:say-it",
			"celebrate:correct",
			"instruction:say-it",
		]);
		expect(run().resolutions).toEqual([{ status: "mastery-credit" }]);
		expect(run().cursor).toBe(cursor + 1);
		expect(
			itemProgressOf(store.getState().progress, item.id).box,
		).toBeGreaterThan(0);
	});
});
