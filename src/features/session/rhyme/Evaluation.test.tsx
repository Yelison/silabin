// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type AttemptFeedback,
	curriculum,
	type PlannedExercise,
	templates,
} from "@/engine";
import { Evaluation } from "@/features/session/rhyme/Evaluation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

const item = curriculum.items.get("oral:rhyme:gato");
if (item === undefined) throw new Error("Falta oral:rhyme:gato");
const exercise: PlannedExercise = {
	id: "ev:gato",
	kind: "evaluation",
	templateId: "rhyme",
	itemId: item.id,
	// Barajado por el motor: la correcta (pato) va la segunda.
	optionIds: ["picture:mesa", "picture:pato"],
	correctOptionId: "picture:pato",
	source: "active-unit",
};
const conPista = (rung: number): AttemptFeedback => ({
	hint: templates.rhyme.hints[rung - 1] ?? null,
	resolution: rung === 3 ? { status: "assisted" } : null,
});

function montar(feedback: AttemptFeedback | null = null, attemptKey = 0) {
	const audio = fakeAudio();
	const onAnswer = vi.fn();
	const onModelDone = vi.fn();
	const r = render(
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
	return { audio, onAnswer, onModelDone, ...r };
}

describe("rhyme / Evaluation", () => {
	it("pinta la imagen del objetivo, el altavoz de su palabra y las dos opciones", () => {
		const m = montar();
		expect(screen.getAllByRole("img", { name: "gato" })).toHaveLength(1);
		expect(screen.getByRole("button", { name: "mesa" })).toBeDefined();
		expect(screen.getByRole("button", { name: "pato" })).toBeDefined();
		expect(m.audio.play).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(m.audio.play).toHaveBeenCalledWith({ key: "word:gato" });
	});

	it("tocar una opción responde con el id de la imagen", () => {
		const m = montar();
		fireEvent.click(screen.getByRole("button", { name: "mesa" }));
		expect(m.onAnswer).toHaveBeenCalledWith("picture:mesa");
	});

	it("pista 1: repite el final del objetivo", () => {
		const m = montar(null);
		expect(m.audio.play).not.toHaveBeenCalled();
		cleanup();
		const n = montar(conPista(1), 1);
		expect(n.audio.play).toHaveBeenCalledWith({ key: "ending:gato" });
	});

	it("pista 3: marca la que rima (la segunda, aunque no sea la primera opción)", () => {
		const m = montar(conPista(3), 1);
		expect(
			screen.getByRole("button", { name: "pato" }).getAttribute("data-state"),
		).toBe("marked");
		fireEvent.click(screen.getByRole("button", { name: "pato" }));
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});
});
