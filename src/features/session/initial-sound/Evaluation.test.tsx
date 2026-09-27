// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type AttemptFeedback,
	curriculum,
	type PlannedExercise,
	templates,
} from "@/engine";
import { Evaluation } from "@/features/session/initial-sound/Evaluation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

const item = curriculum.items.get("oral:initial:avión");
if (item === undefined) throw new Error("Falta oral:initial:avión");
const exercise: PlannedExercise = {
	id: "ev:avion",
	kind: "evaluation",
	templateId: "initial-sound",
	itemId: item.id,
	// Barajado por el motor: la correcta (avión) va la segunda.
	optionIds: ["picture:oso", "picture:avión", "picture:uva"],
	correctOptionId: "picture:avión",
	source: "active-unit",
};
const conPista = (rung: number): AttemptFeedback => ({
	hint: templates["initial-sound"].hints[rung - 1] ?? null,
	resolution: rung === 3 ? { status: "assisted" } : null,
});

function montar(feedback: AttemptFeedback | null = null, attemptKey = 0) {
	const audio = fakeAudio();
	const onAnswer = vi.fn();
	const onModelDone = vi.fn();
	render(
		conProveedores(
			crearStore(),
			audio,
			<Evaluation
				exercise={exercise}
				item={item as NonNullable<typeof item>}
				attemptKey={attemptKey}
				feedback={feedback}
				locked={false}
				onAnswer={onAnswer}
				onModelDone={onModelDone}
			/>,
		),
	);
	return { audio, onAnswer, onModelDone };
}

const estado = (nombre: string) =>
	screen.getByRole("button", { name: nombre }).getAttribute("data-state");

describe("initial-sound / Evaluation", () => {
	it("pinta el altavoz del fonema y las tres opciones, sin imagen del objetivo", () => {
		const m = montar();
		expect(screen.getAllByRole("img")).toHaveLength(3);
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(m.audio.play).toHaveBeenCalledWith({ key: "phoneme:a" });
	});

	it("pista 1: atenúa el primer distractor y repite el fonema; la atenuada ya no responde", () => {
		const m = montar(conPista(1), 1);
		expect(estado("oso")).toBe("dimmed");
		expect(estado("uva")).toBe("idle");
		expect(m.audio.play).toHaveBeenCalledWith({ key: "phoneme:a" });
		fireEvent.click(screen.getByRole("button", { name: "oso" }));
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("pista 2: suena el inicio de cada opción, partido, en el orden de pantalla", async () => {
		const m = montar(conPista(2), 1);
		await act(async () => {});
		expect(m.audio.play.mock.calls.map((c) => c[0])).toEqual([
			{ key: "word:oso", style: "by-syllable", syllables: ["o", "so"] },
			{ key: "word:avión", style: "by-syllable", syllables: ["a", "vión"] },
			{ key: "word:uva", style: "by-syllable", syllables: ["u", "va"] },
		]);
		fireEvent.click(screen.getByRole("button", { name: "uva" }));
		expect(m.onAnswer).toHaveBeenCalledWith("picture:uva");
	});

	it("pista 3: marca la correcta y su toque avisa con onModelDone", () => {
		const m = montar(conPista(3), 1);
		expect(estado("avión")).toBe("marked");
		fireEvent.click(screen.getByRole("button", { name: "oso" }));
		expect(m.onModelDone).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "avión" }));
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});
});
