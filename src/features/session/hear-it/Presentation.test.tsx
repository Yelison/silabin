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
import { Presentation } from "@/features/session/hear-it/Presentation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function datos(id: string) {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	const exercise: PlannedExercise = {
		id: `pr:${id}`,
		kind: "presentation",
		templateId: "hear-it",
		itemId: id,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
	return { item, exercise };
}

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

function montar(id: string, audio = fakeAudio()) {
	const d = datos(id);
	const onDone = vi.fn();
	const { container } = render(
		conProveedores(
			crearStore(),
			audio,
			<Presentation exercise={d.exercise} item={d.item} onDone={onDone} />,
		),
	);
	return { onDone, container };
}

const estado = (nombre: string) =>
	screen.getByRole("button", { name: nombre }).getAttribute("data-state");

describe("hear-it / Presentation", () => {
	it("H2: suena la pregunta, ui:hear-yes con «sí» pulsando, ui:hear-no con «no», la palabra alargada; entonces se marca «sí» y onDone solo al tocarlo", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { onDone } = montar("oral:hear:a-pato", audio);
		expect(screen.getByRole("img", { name: "pato" })).toBeDefined();
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "instruction:hear:a-pato" },
		]);
		// Sin nada que acertar: los botones no responden mientras se explica.
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		expect(onDone).not.toHaveBeenCalled();

		await terminar(0);
		expect(pendientes[1]?.req).toEqual({ key: "ui:hear-yes" });
		expect(estado("sí")).toBe("pulsing");
		expect(estado("no")).toBe("idle");

		await terminar(1);
		expect(pendientes[2]?.req).toEqual({ key: "ui:hear-no" });
		expect(estado("sí")).toBe("idle");
		expect(estado("no")).toBe("pulsing");

		await terminar(2);
		expect(pendientes[3]?.req).toEqual({ key: "stretch-in:a-pato" });
		expect(estado("no")).toBe("idle");
		expect(estado("sí")).toBe("idle");

		await terminar(3);
		expect(estado("sí")).toBe("marked");
		expect(estado("no")).toBe("idle");
		fireEvent.click(screen.getByRole("button", { name: "no" }));
		expect(onDone).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("con respuesta «no» suena la palabra normal, sin stretch-in, y se marca «no»", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { onDone } = montar("oral:hear:a-sol", audio);
		for (let i = 0; i < 4; i++) await terminar(i);
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "instruction:hear:a-sol" },
			{ key: "ui:hear-yes" },
			{ key: "ui:hear-no" },
			{ key: "word:sol" },
		]);
		expect(estado("no")).toBe("marked");
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		expect(onDone).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "no" }));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("con el reproductor silencioso o si el audio falla, el botón correcto se marca igual", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		const { onDone } = montar("oral:hear:a-pato", audio);
		await act(async () => {});
		expect(estado("sí")).toBe("marked");
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("H6: ninguna marca de error en la vista", async () => {
		const { container } = montar("oral:hear:a-sol");
		await act(async () => {});
		for (const prohibido of ["👎", "❌", "✖️", "🚫"])
			expect(container.textContent).not.toContain(prohibido);
	});

	it("al desmontar se corta el sonido y no suena el resto de la secuencia", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const d = datos("oral:hear:a-pato");
		const { unmount } = render(
			conProveedores(
				crearStore(),
				audio,
				<Presentation exercise={d.exercise} item={d.item} onDone={vi.fn()} />,
			),
		);
		unmount();
		expect(audio.stop).toHaveBeenCalled();
		await terminar(0);
		expect(pendientes).toHaveLength(1);
	});
});
