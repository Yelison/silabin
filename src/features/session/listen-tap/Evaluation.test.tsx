// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type AttemptFeedback,
	curriculum,
	type PlannedExercise,
	templates,
} from "@/engine";
import { Evaluation } from "@/features/session/listen-tap/Evaluation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function datos(itemId: string, optionIds: string[]) {
	const item = curriculum.items.get(itemId);
	if (item === undefined) throw new Error(`Falta ${itemId}`);
	for (const id of optionIds)
		if (!curriculum.items.has(id)) throw new Error(`Falta ${id}`);
	const exercise: PlannedExercise = {
		id: `ev:${itemId}`,
		kind: "evaluation",
		templateId: "listen-tap",
		itemId,
		optionIds,
		correctOptionId: itemId,
		source: "active-unit",
	};
	return { item, exercise };
}

// El motor mezcla: aquí la correcta va la segunda y el distractor a atenuar es el primero.
const LETRA = () => datos("letter:a", ["letter:e", "letter:a", "letter:i"]);
const SILABA = () => datos("syllable:ma", ["syllable:pa", "syllable:ma"]);

const conPista = (rung: number): AttemptFeedback => ({
	hint: templates["listen-tap"].hints[rung - 1] ?? null,
	resolution: rung === 3 ? { status: "assisted" } : null,
});

function montar(
	d: ReturnType<typeof datos>,
	feedback: AttemptFeedback | null = null,
	attemptKey = 0,
) {
	const audio = fakeAudio();
	const onAnswer = vi.fn();
	const onModelDone = vi.fn();
	const { container } = render(
		conProveedores(
			crearStore(),
			audio,
			<Evaluation
				exercise={d.exercise}
				item={d.item}
				attemptKey={attemptKey}
				feedback={feedback}
				locked={false}
				onAnswer={onAnswer}
				onModelDone={onModelDone}
			/>,
		),
	);
	return { audio, onAnswer, onModelDone, container };
}

const boton = (nombre: string) => screen.getByRole("button", { name: nombre });
const estado = (nombre: string) => boton(nombre).getAttribute("data-state");
const claves = (audio: ReturnType<typeof fakeAudio>) =>
	audio.play.mock.calls.map((c) => c[0]);

describe("listen-tap / Evaluation", () => {
	it("L1: cada letra se pinta con su minúscula y su mayúscula, con la fuente de lectura", () => {
		montar(LETRA());
		for (const [nombre, lower, upper] of [
			["e", "e", "E"],
			["a", "a", "A"],
			["i", "i", "I"],
		] as const) {
			const b = boton(nombre);
			expect(b.className).toContain("font-reading");
			expect(within(b).getByText(lower)).toBeDefined();
			expect(within(b).getByText(upper)).toBeDefined();
		}
	});

	it("una sílaba se pinta en minúscula, sin par de mayúscula", () => {
		montar(SILABA());
		const b = boton("ma");
		expect(within(b).getByText("ma")).toBeDefined();
		expect(b.textContent).toBe("ma");
	});

	it("el altavoz repite item.audioKey y tocar una opción responde su id", () => {
		const m = montar(LETRA());
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves(m.audio)).toEqual([{ key: "phoneme:a" }]);
		fireEvent.click(boton("i"));
		expect(m.onAnswer).toHaveBeenCalledWith("letter:i");
	});

	it("L2: pista 1 atenúa un distractor, repite phoneme:a y la atenuada no responde", () => {
		const m = montar(LETRA(), conPista(1), 1);
		expect(estado("e")).toBe("dimmed");
		expect(estado("a")).toBe("idle");
		expect(estado("i")).toBe("idle");
		expect(claves(m.audio)).toEqual([{ key: "phoneme:a" }]);
		fireEvent.click(boton("e"));
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("X4 (R29/D15): con 2 opciones, la pista 1 repite el audio y las dos siguen activas y tocables", () => {
		const m = montar(SILABA(), conPista(1), 1);
		expect(estado("pa")).toBe("idle");
		expect(estado("ma")).toBe("idle");
		expect(claves(m.audio)).toEqual([{ key: "syllable:ma" }]);
		fireEvent.click(boton("pa"));
		expect(m.onAnswer).toHaveBeenCalledWith("syllable:pa");
	});

	it("L3: pista 2 en syllable:ma pulsa la correcta (no la primera) y suena stretch:syllable:ma", () => {
		const m = montar(SILABA(), conPista(2), 1);
		expect(estado("ma")).toBe("pulsing");
		expect(estado("pa")).toBe("idle");
		expect(claves(m.audio)).toEqual([{ key: "stretch:syllable:ma" }]);
	});

	it("pista 3: marca la correcta; su toque avisa con onModelDone y las otras no", () => {
		const m = montar(SILABA(), conPista(3), 1);
		expect(estado("ma")).toBe("marked");
		fireEvent.click(boton("pa"));
		expect(m.onModelDone).not.toHaveBeenCalled();
		fireEvent.click(boton("ma"));
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("L4: ningún audio pedido (altavoz y las tres pistas) es el nombre de una letra", () => {
		for (const rung of [0, 1, 2, 3]) {
			const m = montar(LETRA(), rung === 0 ? null : conPista(rung), rung);
			fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
			for (const r of claves(m.audio))
				expect(r.key.startsWith("letter:")).toBe(false);
			cleanup();
		}
	});

	it("con el reproductor que falla, la vista sigue respondiendo", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		const d = SILABA();
		const onAnswer = vi.fn();
		render(
			conProveedores(
				crearStore(),
				audio,
				<Evaluation
					exercise={d.exercise}
					item={d.item}
					attemptKey={1}
					feedback={conPista(2)}
					locked={false}
					onAnswer={onAnswer}
					onModelDone={vi.fn()}
				/>,
			),
		);
		await act(async () => {});
		fireEvent.click(boton("pa"));
		expect(onAnswer).toHaveBeenCalledWith("syllable:pa");
	});
});
