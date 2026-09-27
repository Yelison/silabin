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
	type Item,
	type PlannedExercise,
	templates,
} from "@/engine";
import { Evaluation } from "@/features/session/hear-it/Evaluation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

function datos(id: string) {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	const exercise: PlannedExercise = {
		id: `ev:${id}`,
		kind: "evaluation",
		templateId: "hear-it",
		itemId: id,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
	return { item, exercise };
}

const conPista = (rung: number): AttemptFeedback => ({
	hint: templates["hear-it"].hints[rung - 1] ?? null,
	resolution: rung === 3 ? { status: "assisted" } : null,
});

function montar(
	d: { item: Item; exercise: PlannedExercise },
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

const estado = (nombre: string) =>
	screen.getByRole("button", { name: nombre }).getAttribute("data-state");
const claves = (audio: ReturnType<typeof fakeAudio>) =>
	audio.play.mock.calls.map((c) => c[0]);

describe("hear-it / Evaluation", () => {
	it("H1: pinta la imagen, la pregunta y «sí» a la izquierda de «no»; cada toque responde su valor", () => {
		const m = montar(datos("oral:hear:a-pato"));
		expect(screen.getByRole("img", { name: "pato" })).toBeDefined();
		const nombres = screen
			.getAllByRole("button")
			.map((b) => b.getAttribute("aria-label"));
		expect(nombres).toEqual(["Oír otra vez", "sí", "no"]);
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves(m.audio)).toEqual([{ key: "instruction:hear:a-pato" }]);
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		expect(m.onAnswer).toHaveBeenLastCalledWith("si");
		fireEvent.click(screen.getByRole("button", { name: "no" }));
		expect(m.onAnswer).toHaveBeenLastCalledWith("no");
	});

	it("H6: ninguna marca de error en la vista, ni en reposo ni con pistas", () => {
		for (const rung of [0, 1, 2, 3]) {
			const m = montar(
				datos("oral:hear:a-sol"),
				rung === 0 ? null : conPista(rung),
				rung,
			);
			for (const prohibido of ["👎", "❌", "✖️", "🚫"])
				expect(m.container.textContent).not.toContain(prohibido);
			cleanup();
		}
	});

	it("H3: pista 1 repite la palabra despacio, por sílabas", () => {
		const m = montar(datos("oral:hear:a-pato"), conPista(1), 1);
		expect(claves(m.audio)).toEqual([
			{ key: "word:pato", style: "by-syllable", syllables: ["pa", "to"] },
		]);
	});

	it("H4: pista 2 con respuesta «si» alarga el sonido dentro de la palabra y no marca ni atenúa nada", () => {
		const m = montar(datos("oral:hear:a-pato"), conPista(2), 1);
		expect(claves(m.audio)).toEqual([{ key: "stretch-in:a-pato" }]);
		expect(estado("sí")).toBe("idle");
		expect(estado("no")).toBe("idle");
	});

	it("H4: pista 2 con respuesta «no» repite la palabra normal; no se pide ningún stretch-in", () => {
		const m = montar(datos("oral:hear:a-sol"), conPista(2), 1);
		expect(claves(m.audio)).toEqual([{ key: "word:sol" }]);
		expect(claves(m.audio).some((r) => r.key.startsWith("stretch-in:"))).toBe(
			false,
		);
	});

	it("H5: pista 3 con respuesta «no» marca «no»; «sí» no hace nada y «no» avisa con onModelDone", () => {
		const m = montar(datos("oral:hear:a-sol"), conPista(3), 1);
		expect(estado("no")).toBe("marked");
		expect(estado("sí")).toBe("idle");
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		expect(m.onModelDone).not.toHaveBeenCalled();
		expect(m.onAnswer).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "no" }));
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("H5: pista 3 con respuesta «si» marca «sí», no siempre el mismo botón", () => {
		montar(datos("oral:hear:a-pato"), conPista(3), 1);
		expect(estado("sí")).toBe("marked");
		expect(estado("no")).toBe("idle");
	});

	it("con el reproductor que falla, la vista sigue respondiendo", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		const d = datos("oral:hear:a-pato");
		const onAnswer = vi.fn();
		render(
			conProveedores(
				crearStore(),
				audio,
				<Evaluation
					exercise={d.exercise}
					item={d.item}
					attemptKey={1}
					feedback={conPista(1)}
					locked={false}
					onAnswer={onAnswer}
					onModelDone={vi.fn()}
				/>,
			),
		);
		await act(async () => {});
		fireEvent.click(screen.getByRole("button", { name: "sí" }));
		expect(onAnswer).toHaveBeenCalledWith("si");
	});
});
