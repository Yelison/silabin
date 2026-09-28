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
	type Item,
	type SessionRun,
	type Unit,
} from "@/engine";
import { AppProviders, type SpeechDeps } from "@/features/app-context";
import { SessionScreen } from "@/features/session/SessionScreen";
import { COUNTDOWN_MS, TAP_GUARD_MS } from "@/features/session/voice/VoiceTurn";
import { fakeAudio } from "@/features/test-support";
import { createParentEvaluator } from "@/speech";
import { createAppStore, createMemoryAdapter } from "@/store";

const CELEBRACION_MS = 700;

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function itemDe(id: string): Item {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	return item;
}

/**
 * Currículo de prueba: la palabra real `word:mapa` (con `syllable:ma`, que necesita la pista 2)
 * y una unidad que solo declara `read-word`, para jugar la plantilla de punta a punta con el
 * motor, el store y las vistas reales.
 */
async function montar() {
	const palabra = itemDe("word:mapa");
	const silaba = itemDe("syllable:ma");
	const unit: Unit = {
		id: "test:read-word",
		phase: 2,
		title: "Prueba de lectura",
		audioKey: "unit:test:read-word",
		requires: [],
		introduces: [palabra.id],
		exercises: [{ templateId: "read-word", weight: 1 }],
	};
	const content: CurriculumIndex = {
		items: new Map([
			[palabra.id, palabra],
			[silaba.id, silaba],
		]),
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
			<SessionScreen
				onEnd={() => {}}
				onExit={() => {}}
				celebrationMs={CELEBRACION_MS}
			/>
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
	// Pasa la presentación y deja la primera evaluación en pantalla.
	await pasar(100);
	const desde = audio.play.mock.calls.length;
	fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
	await pasar(0);
	const claves = () => audio.play.mock.calls.slice(desde).map((c) => c[0].key);
	return { store, audio, container, pasar, run, claves };
}

const imagen = () => screen.queryByRole("img", { name: "mapa" });
const tapada = () => screen.queryByRole("img", { name: "Imagen tapada" });

describe("read-word de punta a punta, con el motor, el store y las vistas reales", () => {
	it("W2/W3: la evaluación monta sin la palabra sonando y con la imagen tapada; «Lo dijo bien» la descubre durante la celebración", async () => {
		const { pasar, run, claves, container } = await montar();
		const evaluacion = currentExercise(run());
		expect(evaluacion?.kind).toBe("evaluation");
		expect(evaluacion?.templateId).toBe("read-word");
		// P8: solo la instrucción; ni la palabra ni nada que la nombre.
		expect(claves()).toEqual(["instruction:read-word"]);
		expect(screen.getByText("mapa")).toBeTruthy();
		expect(tapada()).not.toBeNull();
		expect(imagen()).toBeNull();
		expect(container.querySelector("img[src*='/images/']")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
		await pasar(COUNTDOWN_MS + 50);
		// Con `parent` ni siquiera el micrófono cambia nada: hasta que el adulto confirma, tapada.
		expect(imagen()).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Lo dijo bien" }));
		await pasar(50);

		// A media celebración la imagen ya está a la vista.
		expect(imagen()).not.toBeNull();
		expect(tapada()).toBeNull();
		expect(claves()).toContain("celebrate:correct");
		expect(run().resolutions).toEqual([{ status: "mastery-credit" }]);
		await pasar(CELEBRACION_MS);
	});

	it("W4: tres «Otra vez» dan las sílabas, la primera sílaba y la palabra entera con la imagen; hablar en el modelo avanza", async () => {
		const { pasar, run, claves } = await montar();

		async function decirYFallar() {
			fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
			await pasar(COUNTDOWN_MS + 50);
			fireEvent.click(screen.getByRole("button", { name: "Otra vez" }));
			await pasar(TAP_GUARD_MS + 50);
		}

		// Fallo 1: «Otra vez» neutro y, después, las sílabas separadas con la instrucción.
		await decirYFallar();
		expect(claves().slice(1)).toEqual([
			"feedback:retry",
			"instruction:read-word",
		]);
		expect(screen.getByText("ma·pa")).toBeTruthy();
		expect(imagen()).toBeNull();

		// Fallo 2: la primera sílaba.
		await decirYFallar();
		expect(claves().at(-1)).toBe("syllable:ma");
		expect(imagen()).toBeNull();

		// Fallo 3: la palabra entera, resuelto como asistido y con la imagen descubierta.
		await decirYFallar();
		expect(claves().at(-1)).toBe("word:mapa");
		expect(run().resolutions.at(-1)?.status).toBe("assisted");
		expect(imagen()).not.toBeNull();

		// En el modelo basta con hablar: «heard» avanza al siguiente ejercicio.
		const cursor = run().cursor;
		fireEvent.click(screen.getByRole("button", { name: "Micrófono" }));
		await pasar(COUNTDOWN_MS + 50);
		expect(run().cursor).toBe(cursor + 1);
	});
});
