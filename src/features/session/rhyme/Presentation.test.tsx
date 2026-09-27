// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AudioRequest } from "@/audio";
import { curriculum, type PlannedExercise } from "@/engine";
import { Presentation } from "@/features/session/rhyme/Presentation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function montar(audio: ReturnType<typeof fakeAudio>) {
	const item = curriculum.items.get("oral:rhyme:gato");
	if (item === undefined) throw new Error("Falta oral:rhyme:gato");
	const exercise: PlannedExercise = {
		id: "pr:gato",
		kind: "presentation",
		templateId: "rhyme",
		itemId: item.id,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
	const onDone = vi.fn();
	const r = render(
		conProveedores(
			crearStore(),
			audio,
			<Presentation exercise={exercise} item={item} onDone={onDone} />,
		),
	);
	return { ...r, onDone };
}

const siguiente = () => screen.queryByRole("button", { name: "Siguiente" });

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

describe("rhyme / Presentation", () => {
	it("X10: muestra las dos imágenes; suenan word:gato, word:pato y ending:gato en orden; onDone solo al tocar siguiente", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { onDone, container } = montar(audio);
		expect(screen.getByRole("img", { name: "gato" })).toBeDefined();
		expect(screen.getByRole("img", { name: "pato" })).toBeDefined();
		const tarjetas = () =>
			[...container.querySelectorAll("[data-card]")].map((c) => c.className);
		expect(pendientes.map((p) => p.req)).toEqual([{ key: "word:gato" }]);
		await terminar(0);
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "word:gato" },
			{ key: "word:pato" },
		]);
		expect(tarjetas().every((c) => !c.includes("animate-pulse"))).toBe(true);
		await terminar(1);
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "word:gato" },
			{ key: "word:pato" },
			{ key: "ending:gato" },
		]);
		// Las dos tarjetas pulsan juntas mientras suena el final.
		expect(tarjetas()).toHaveLength(2);
		expect(tarjetas().every((c) => c.includes("animate-pulse"))).toBe(true);
		expect(siguiente()).toBeNull();
		await terminar(2);
		expect(tarjetas().every((c) => !c.includes("animate-pulse"))).toBe(true);
		expect(onDone).not.toHaveBeenCalled();
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("con el reproductor silencioso o si el audio falla, el botón aparece igual", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		montar(audio);
		await act(async () => {});
		expect(siguiente()).not.toBeNull();
	});

	it("al desmontar se corta el sonido y no suena el resto de la secuencia", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { unmount } = montar(audio);
		unmount();
		expect(audio.stop).toHaveBeenCalled();
		await terminar(0);
		expect(pendientes).toHaveLength(1);
	});
});
