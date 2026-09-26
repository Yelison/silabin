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
import { Presentation } from "@/features/session/count-syllables/Presentation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function datos(palabra: string) {
	const item = curriculum.items.get(`oral:clap:${palabra}`);
	if (item === undefined) throw new Error(`Falta ${palabra}`);
	const exercise: PlannedExercise = {
		id: `pr:${palabra}`,
		kind: "presentation",
		templateId: "count-syllables",
		itemId: item.id,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
	return { item, exercise };
}

/** Un `play` cuyas promesas resuelve el test a mano, para ver el orden y el momento. */
function conPlayManual() {
	const audio = fakeAudio();
	const pendientes: {
		req: AudioRequest;
		resolver: () => void;
		rechazar: () => void;
	}[] = [];
	audio.play.mockImplementation(
		(req: AudioRequest) =>
			new Promise<void>((resolver, rechazar) => {
				pendientes.push({
					req,
					resolver,
					rechazar: () => rechazar(new Error("x")),
				});
			}),
	);
	const terminar = async (i: number) => {
		await act(async () => {
			pendientes[i]?.resolver();
		});
	};
	return { audio, pendientes, terminar };
}

function montar(audio: ReturnType<typeof fakeAudio>, palabra = "mesa") {
	const { item, exercise } = datos(palabra);
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

describe("count-syllables / Presentation", () => {
	it("C1: suena la palabra y luego beats con las sílabas; onDone solo tras tocar siguiente", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { onDone } = montar(audio);
		expect(screen.getByRole("img", { name: "mesa" }).textContent).toBe("🪑");
		expect(pendientes.map((p) => p.req)).toEqual([{ key: "word:mesa" }]);
		expect(siguiente()).toBeNull();
		await terminar(0);
		expect(pendientes).toHaveLength(2);
		expect(pendientes[1]?.req).toMatchObject({
			key: "word:mesa",
			style: "beats",
			syllables: ["me", "sa"],
		});
		expect(siguiente()).toBeNull();
		await terminar(1);
		expect(onDone).not.toHaveBeenCalled();
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("una luz por sílaba: se enciende con onSegment y nunca hay tambor ni nada que acertar", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { container } = montar(audio, "pelota");
		await terminar(0);
		const luces = () => container.querySelectorAll("[data-light]").length;
		expect(luces()).toBe(0);
		act(() => pendientes[1]?.req.onSegment?.(0));
		expect(luces()).toBe(1);
		act(() => pendientes[1]?.req.onSegment?.(2));
		expect(luces()).toBe(3);
		expect(screen.queryByRole("button", { name: "Tambor" })).toBeNull();
		expect(audio.beat).not.toHaveBeenCalled();
	});

	it("sin onSegment (voz muda o reproductor silencioso) el botón aparece igual al terminar", async () => {
		const audio = fakeAudio();
		montar(audio);
		await act(async () => {});
		expect(siguiente()).not.toBeNull();
	});

	it("si el audio falla, el botón aparece igual", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		montar(audio);
		await act(async () => {});
		expect(siguiente()).not.toBeNull();
	});

	it("si falla la palabra no se cuelga: se intenta igualmente el modo beats", async () => {
		const { audio, pendientes } = conPlayManual();
		montar(audio);
		await act(async () => {
			pendientes[0]?.rechazar();
		});
		expect(pendientes).toHaveLength(2);
	});

	it("al desmontar se corta el sonido y una promesa tardía no deja nada pintado", async () => {
		const { audio, terminar, pendientes } = conPlayManual();
		const { unmount } = montar(audio);
		unmount();
		expect(audio.stop).toHaveBeenCalled();
		await terminar(0);
		expect(pendientes).toHaveLength(1);
	});
});
