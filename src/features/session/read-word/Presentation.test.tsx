// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { curriculum, type PlannedExercise } from "@/engine";
import { Presentation } from "@/features/session/read-word/Presentation";
import { HINT_AUDIO_MAX_MS } from "@/features/session/voice/hint-audio";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function montar(id: string, audio = fakeAudio()) {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	const exercise: PlannedExercise = {
		id: `pr:${id}`,
		kind: "presentation",
		templateId: "read-word",
		itemId: id,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
	const onDone = vi.fn();
	const view = render(
		conProveedores(
			crearStore(),
			audio,
			<Presentation exercise={exercise} item={item} onDone={onDone} />,
		),
	);
	const claves = () => audio.play.mock.calls.map((c) => c[0].key);
	return { audio, onDone, claves, ...view };
}

async function avanzar(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

const siguiente = () => screen.queryByRole("button", { name: "Siguiente" });

describe("read-word/Presentation", () => {
	it("W1: enseña la palabra con las sílabas separadas, su imagen visible y la palabra sonando", () => {
		const { claves } = montar("word:mapa");
		expect(screen.getByText("ma·pa")).toBeTruthy();
		expect(screen.getByRole("img", { name: "mapa" })).toBeTruthy();
		expect(claves()).toEqual(["word:mapa"]);
	});

	it("W1: la palabra con tilde se ve tal cual, y el lector de pantalla la recibe entera", () => {
		montar("word:mama");
		expect(screen.getByText("ma·má")).toBeTruthy();
		expect(screen.getByText("mamá")).toBeTruthy();
	});

	it("«Siguiente» aparece al acabar de sonar, y avisa una vez", async () => {
		const { onDone } = montar("word:mapa");
		expect(siguiente()).toBeNull();
		await avanzar(10);
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("si el audio nunca acaba, «Siguiente» sale al vencer el tope", async () => {
		const audio = fakeAudio();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		montar("word:mapa", audio);
		await avanzar(HINT_AUDIO_MAX_MS - 100);
		expect(siguiente()).toBeNull();
		await avanzar(200);
		expect(siguiente()).not.toBeNull();
	});

	it("si el audio falla, «Siguiente» sale igual", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		montar("word:mapa", audio);
		await avanzar(10);
		expect(siguiente()).not.toBeNull();
	});

	it("Oír otra vez repite la palabra, y al desmontar se corta el audio", async () => {
		const { claves, unmount, audio } = montar("word:mapa");
		await avanzar(10);
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves()).toEqual(["word:mapa", "word:mapa"]);
		unmount();
		expect(audio.stop).toHaveBeenCalled();
	});
});
