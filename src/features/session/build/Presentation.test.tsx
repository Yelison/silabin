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
import { Presentation } from "@/features/session/build/Presentation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function montar(id: string, audio = fakeAudio()) {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	const exercise: PlannedExercise = {
		id: `pr:${id}`,
		kind: "presentation",
		templateId: "build",
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

describe("build / Presentation", () => {
	it("B11: syllable:ma suena stretch:letter:m, phoneme:a y syllable:ma, en ese orden y de uno en uno", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { onDone } = montar("syllable:ma", audio);
		expect(pendientes.map((p) => p.req)).toEqual([{ key: "stretch:letter:m" }]);
		await terminar(0);
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "stretch:letter:m" },
			{ key: "phoneme:a" },
		]);
		await terminar(1);
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "stretch:letter:m" },
			{ key: "phoneme:a" },
			{ key: "syllable:ma" },
		]);
		expect(siguiente()).toBeNull();
		await terminar(2);
		expect(onDone).not.toHaveBeenCalled();
		fireEvent.click(siguiente() as HTMLElement);
		expect(onDone).toHaveBeenCalledTimes(1);
		expect(audio.play).toHaveBeenCalledTimes(3);
	});

	it("nunca suena el nombre de una letra", async () => {
		const audio = fakeAudio();
		montar("syllable:lo", audio);
		await act(async () => {});
		const claves = audio.play.mock.calls.map((c) => c[0].key);
		expect(claves).toEqual(["stretch:letter:l", "phoneme:o", "syllable:lo"]);
		for (const k of claves) expect(k.startsWith("letter:")).toBe(false);
	});

	it("la consonante y la vocal se ven en minúscula y se juntan cuando suena la sílaba", async () => {
		const m = conPlayManual();
		const vista = montar("syllable:ma", m.audio);
		const grupo = vista.container.querySelector("[data-joined]");
		expect(grupo?.textContent).toBe("ma");
		expect(grupo?.getAttribute("data-joined")).toBe("false");
		await m.terminar(0);
		expect(grupo?.getAttribute("data-joined")).toBe("false");
		await m.terminar(1);
		expect(grupo?.getAttribute("data-joined")).toBe("true");
	});

	it("entran desde los lados solo con movimiento permitido: todo el movimiento va con motion-safe:", () => {
		const { container } = montar("syllable:ma");
		const partes = container.querySelectorAll("[data-part]");
		expect(partes).toHaveLength(2);
		const html = container.innerHTML;
		expect(html).toContain("motion-safe:");
		// Ninguna clase de movimiento sin el prefijo.
		for (const clase of html.match(/class="[^"]*"/g) ?? []) {
			for (const c of clase.slice(7, -1).split(/\s+/)) {
				if (/translate|animate|transition|duration/.test(c))
					expect(c.startsWith("motion-safe:"), c).toBe(true);
			}
		}
	});

	it("con el reproductor que falla, el botón aparece igual", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		montar("syllable:ma", audio);
		await act(async () => {});
		expect(siguiente()).not.toBeNull();
	});

	it("el botón siguiente mide al menos 72 px", async () => {
		montar("syllable:ma");
		await act(async () => {});
		expect(siguiente()?.className).toMatch(/min-h-(18|2\d)/);
	});

	it("al desmontar se corta el sonido y no siguen sonando las demás", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const { unmount } = montar("syllable:ma", audio);
		unmount();
		expect(audio.stop).toHaveBeenCalled();
		await terminar(0);
		expect(pendientes).toHaveLength(1);
	});
});
