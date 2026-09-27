// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRequest } from "@/audio";
import { curriculum, type PlannedExercise } from "@/engine";
import { Presentation } from "@/features/session/listen-tap/Presentation";
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
		templateId: "listen-tap",
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
	return { onDone, ...view };
}

const siguiente = () => screen.queryByRole("button", { name: "Siguiente" });

/** Un `play` cuyas promesas resuelve el test a mano. */
function conPlayManual() {
	const audio = fakeAudio();
	const pendientes: { req: AudioRequest; resolver: () => void }[] = [];
	audio.play.mockImplementation(
		(req: AudioRequest) =>
			new Promise<void>((resolver) => {
				pendientes.push({ req, resolver });
			}),
	);
	const terminar = async (i: number) => {
		await act(async () => {
			pendientes[i]?.resolver();
		});
	};
	return { audio, pendientes, terminar };
}

describe("listen-tap / Presentation", () => {
	it("suena item.audioKey dos veces, con una pausa entre ellas; siguiente solo al final y onDone al tocarlo", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { onDone } = montar("syllable:ma", audio);
		expect(pendientes.map((p) => p.req)).toEqual([{ key: "syllable:ma" }]);
		await terminar(0);
		// Pausa: la segunda aún no suena.
		expect(pendientes).toHaveLength(1);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5000);
		});
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "syllable:ma" },
			{ key: "syllable:ma" },
		]);
		expect(siguiente()).toBeNull();
		await terminar(1);
		expect(onDone).not.toHaveBeenCalled();
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
		expect(audio.play).toHaveBeenCalledTimes(2);
	});

	it("una letra se enseña grande con su minúscula y su mayúscula, y suena su sonido, no su nombre", async () => {
		const audio = fakeAudio();
		const { container } = montar("letter:a", audio);
		expect(container.textContent).toContain("a");
		expect(container.textContent).toContain("A");
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5000);
		});
		expect(audio.play.mock.calls.map((c) => c[0].key)).toEqual([
			"phoneme:a",
			"phoneme:a",
		]);
	});

	it("M12: el ítem se pinta con la fuente de lectura, como las opciones de la evaluación", async () => {
		montar("word:mama");
		expect(
			screen.getByText("mamá").closest(".font-reading"),
			"la palabra",
		).not.toBeNull();
		cleanup();
		montar("letter:m");
		expect(
			screen.getByText("m").closest(".font-reading"),
			"la letra",
		).not.toBeNull();
	});

	it("con el reproductor que falla, el botón aparece igual", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		montar("syllable:ma", audio);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5000);
		});
		expect(siguiente()).not.toBeNull();
		expect(siguiente()?.querySelector("img")?.getAttribute("src")).toBe(
			"/icons/ui-next.png",
		);
		expect(siguiente()?.textContent).not.toContain("➡️");
	});

	it("al desmontar se corta el sonido y no suena la segunda vez", async () => {
		const audio = fakeAudio();
		const { unmount } = montar("syllable:ma", audio);
		await act(async () => {});
		unmount();
		expect(audio.stop).toHaveBeenCalled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5000);
		});
		expect(audio.play).toHaveBeenCalledTimes(1);
	});
});
