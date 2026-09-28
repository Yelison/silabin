// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOUTH_STEP_MS } from "@/components/Mouth";
import { curriculum, type Item, type PlannedExercise } from "@/engine";
import { Presentation } from "@/features/session/say-it/Presentation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function montar(
	id: string,
	opts: { audio?: ReturnType<typeof fakeAudio>; item?: Item } = {},
) {
	const item = opts.item ?? curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	const audio = opts.audio ?? fakeAudio();
	const exercise: PlannedExercise = {
		id: `pr:${id}`,
		kind: "presentation",
		templateId: "say-it",
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
const boca = (c: HTMLElement) => c.querySelector("svg[data-shape]");

describe("say-it/Presentation", () => {
	it("Y2: con letter:a pinta A y a, suena su audio, monta la boca abierta y cierra con onDone", async () => {
		const { container, claves, onDone } = montar("letter:a");
		expect(screen.getByText("A")).toBeTruthy();
		expect(screen.getByText("a")).toBeTruthy();
		expect(claves()[0]).toBe("phoneme:a");
		expect(boca(container)?.getAttribute("data-shape")).toBe("open");
		expect(siguiente()).toBeNull();
		await avanzar(5000);
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("una sílaba se pinta como su texto y la boca recorre sus fonemas", async () => {
		const { container } = montar("syllable:ma");
		expect(screen.getByText("ma")).toBeTruthy();
		expect(boca(container)?.getAttribute("data-shape")).toBe("closed");
		await avanzar(MOUTH_STEP_MS);
		expect(boca(container)?.getAttribute("data-shape")).toBe("open");
	});

	it("Oír otra vez repite el audio del ítem y la boca a la vez", async () => {
		const { container, claves } = montar("syllable:ma");
		// En tramos: React solo pinta al salir de `act`, y la segunda vuelta de la boca
		// (remontada) arranca cuando se pinta.
		await avanzar(1000);
		await avanzar(2000);
		expect(boca(container)?.getAttribute("data-shape")).toBe("open");
		const antes = claves().length;
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves().length).toBe(antes + 1);
		expect(claves().at(-1)).toBe("syllable:ma");
		// La boca vuelve a empezar por la primera forma.
		expect(boca(container)?.getAttribute("data-shape")).toBe("closed");
	});

	it("un fonema sin forma de boca no rompe la presentación: se sigue sin boca", async () => {
		const sinForma: Item = {
			id: "letter:a",
			kind: "letter",
			text: "a",
			phonemes: ["zz"],
			audioKey: "phoneme:a",
			display: { upper: "A", lower: "a" },
		};
		const { container, claves } = montar("letter:a", { item: sinForma });
		expect(boca(container)).toBeNull();
		expect(claves()[0]).toBe("phoneme:a");
		await avanzar(5000);
		expect(siguiente()).not.toBeNull();
	});

	it("con un audio que nunca resuelve, Siguiente aparece igual pasado el tope", async () => {
		const audio = fakeAudio();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		const { onDone } = montar("letter:a", { audio });
		expect(siguiente()).toBeNull();
		await avanzar(2500 + 900 + 2500 + 10);
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("al desmontar corta el audio", () => {
		const { unmount, audio } = montar("letter:a");
		unmount();
		expect(audio.stop).toHaveBeenCalled();
	});
});
