// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { curriculum, type PlannedExercise } from "@/engine";
import { Presentation } from "@/features/session/initial-sound/Presentation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function montar(itemId: string, audio = fakeAudio()) {
	const item = curriculum.items.get(itemId);
	if (item === undefined) throw new Error(`Falta ${itemId}`);
	const exercise: PlannedExercise = {
		id: `pr:${itemId}`,
		kind: "presentation",
		templateId: "initial-sound",
		itemId,
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
	return { ...r, audio, onDone };
}

const siguiente = () => screen.queryByRole("button", { name: "Siguiente" });
const peticiones = (a: ReturnType<typeof fakeAudio>) =>
	a.play.mock.calls.map((c) => c[0]);

describe("initial-sound / Presentation", () => {
	it("X11: con un ítem oral suena el fonema y luego la palabra partida ['a', 'vión']", async () => {
		const { audio, onDone } = montar("oral:initial:avión");
		await act(async () => {});
		expect(screen.getByRole("img", { name: "avión" })).toBeDefined();
		expect(peticiones(audio)).toEqual([
			{ key: "phoneme:a" },
			{
				key: "word:avión",
				style: "by-syllable",
				syllables: ["a", "vión"],
			},
		]);
		expect(onDone).not.toHaveBeenCalled();
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("X12: con el ítem phoneme:a se enseñan 3 imágenes que empiezan por a, una a una", async () => {
		const audio = fakeAudio();
		const pendientes: (() => void)[] = [];
		audio.play.mockImplementation(
			() => new Promise<void>((resolver) => pendientes.push(resolver)),
		);
		montar("phoneme:a", audio);
		const imagenes = () => screen.queryAllByRole("img").length;
		const terminar = async () => {
			const p = pendientes.shift();
			await act(async () => p?.());
		};
		expect(imagenes()).toBe(1);
		await terminar(); // fonema
		await terminar(); // palabra partida
		expect(imagenes()).toBe(2);
		expect(siguiente()).toBeNull();
		await terminar();
		await terminar();
		expect(imagenes()).toBe(3);
		await terminar();
		await terminar();
		expect(siguiente()).not.toBeNull();
		expect(siguiente()?.querySelector("img")?.getAttribute("src")).toBe(
			"/icons/ui-next.png",
		);
		expect(siguiente()?.textContent).not.toContain("➡️");
		const palabras = peticiones(audio)
			.filter((r) => r.key.startsWith("word:"))
			.map((r) => r.key);
		expect(palabras).toEqual(["word:avión", "word:árbol", "word:ala"]);
		expect(peticiones(audio).filter((r) => r.key === "phoneme:a")).toHaveLength(
			3,
		);
	});

	it("si el audio falla, el botón aparece igual", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		montar("oral:initial:avión", audio);
		await act(async () => {});
		expect(siguiente()).not.toBeNull();
	});

	it("al desmontar se corta el sonido", () => {
		const { audio, unmount } = montar("oral:initial:avión");
		unmount();
		expect(audio.stop).toHaveBeenCalled();
	});
});
