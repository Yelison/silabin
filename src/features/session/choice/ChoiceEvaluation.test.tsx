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
import {
	type AttemptFeedback,
	curriculum,
	type HintStep,
	type PlannedExercise,
} from "@/engine";
import { ChoiceEvaluation } from "@/features/session/choice/ChoiceEvaluation";
import type { ChoiceEffect } from "@/features/session/choice/hint-effects";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

afterEach(cleanup);

const ITEM = (() => {
	const item = curriculum.items.get("oral:rhyme:gato");
	if (item === undefined) throw new Error("Falta oral:rhyme:gato");
	return item;
})();
const EXERCISE: PlannedExercise = {
	id: "ev:gato",
	kind: "evaluation",
	templateId: "rhyme",
	itemId: ITEM.id,
	optionIds: ["a", "b"],
	correctOptionId: "b",
	source: "active-unit",
};
const OPCIONES = ["a", "b", "c"].map((id) => ({
	id,
	label: `opción ${id}`,
	content: <span>{id}</span>,
}));

/** Una pista cualquiera: lo que hace lo decide `effectFor`, que aquí es un doble. */
const conAccion = (action: string): AttemptFeedback => ({
	hint: { rung: "reduce", action, note: "" } satisfies HintStep,
	resolution: null,
});

type Opciones = {
	attemptKey?: number;
	feedback?: AttemptFeedback | null;
	locked?: boolean;
	effect?: ChoiceEffect;
	/** Efecto por acción; lo que no esté aquí usa `effect`. */
	efectos?: Record<string, ChoiceEffect>;
	audio?: ReturnType<typeof fakeAudio>;
};

function montar(o: Opciones = {}) {
	const audio = o.audio ?? fakeAudio();
	const onAnswer = vi.fn();
	const onModelDone = vi.fn();
	const efecto = o.effect ?? { kind: "none" };
	const pintar = (p: Opciones = {}) =>
		conProveedores(
			crearStore(),
			audio,
			<ChoiceEvaluation
				exercise={EXERCISE}
				item={ITEM}
				attemptKey={p.attemptKey ?? o.attemptKey ?? 0}
				feedback={p.feedback === undefined ? (o.feedback ?? null) : p.feedback}
				locked={p.locked ?? o.locked ?? false}
				onAnswer={onAnswer}
				onModelDone={onModelDone}
				options={OPCIONES}
				effectFor={(action) => o.efectos?.[action] ?? efecto}
			/>,
		);
	const r = render(pintar());
	const tarjeta = (id: string) =>
		screen.getByRole("button", { name: `opción ${id}` });
	return {
		audio,
		onAnswer,
		onModelDone,
		tarjeta,
		estado: (id: string) => tarjeta(id).getAttribute("data-state"),
		reponer: (p: Opciones) => r.rerender(pintar(p)),
	};
}

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

const SECUENCIA: ChoiceEffect = {
	kind: "sequence",
	steps: [
		{ optionId: "a", request: { key: "ending:a" } },
		{ optionId: "b", request: { key: "ending:b" } },
		{ optionId: "c", request: { key: "ending:c" } },
	],
};

describe("ChoiceEvaluation", () => {
	it("X3: tocar una opción llama a onAnswer con su id, una vez", () => {
		const m = montar();
		fireEvent.click(m.tarjeta("b"));
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("b");
	});

	it("X4: con locked no responde nada", () => {
		const m = montar({ locked: true });
		fireEvent.click(m.tarjeta("a"));
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("X5: tras dim, la atenuada no responde y sigue atenuada en el siguiente intento, aunque la pista sea otra", () => {
		const m = montar({
			effect: { kind: "none" },
			efectos: {
				uno: { kind: "dim", optionId: "a", replay: { key: "phoneme:a" } },
			},
		});
		m.reponer({ feedback: conAccion("uno"), attemptKey: 1 });
		expect(m.estado("a")).toBe("dimmed");
		expect(m.audio.play).toHaveBeenCalledWith({ key: "phoneme:a" });
		fireEvent.click(m.tarjeta("a"));
		expect(m.onAnswer).not.toHaveBeenCalled();
		// Intento 3: llega otra pista (que no toca lo atenuado) con un attemptKey nuevo.
		m.reponer({ feedback: conAccion("dos"), attemptKey: 2 });
		expect(m.estado("a")).toBe("dimmed");
		fireEvent.click(m.tarjeta("a"));
		expect(m.onAnswer).not.toHaveBeenCalled();
		fireEvent.click(m.tarjeta("b"));
		expect(m.onAnswer).toHaveBeenCalledWith("b");
	});

	it("replay: suena la petición y no cambia nada en pantalla", () => {
		const m = montar({
			effect: { kind: "replay", request: { key: "ending:gato" } },
		});
		m.reponer({ feedback: conAccion("x"), attemptKey: 1 });
		expect(m.audio.play).toHaveBeenCalledWith({ key: "ending:gato" });
		expect(m.estado("a")).toBe("idle");
	});

	it("X6: durante una secuencia el toque no cuenta; al acabar, sí", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const m = montar({ audio, effect: SECUENCIA });
		m.reponer({ feedback: conAccion("x"), attemptKey: 1 });
		await act(async () => {});
		fireEvent.click(m.tarjeta("a"));
		expect(m.onAnswer).not.toHaveBeenCalled();
		await terminar(0);
		fireEvent.click(m.tarjeta("a"));
		await terminar(1);
		fireEvent.click(m.tarjeta("a"));
		expect(m.onAnswer).not.toHaveBeenCalled();
		await terminar(2);
		expect(pendientes).toHaveLength(3);
		fireEvent.click(m.tarjeta("c"));
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("c");
	});

	it("X7: la secuencia pide las peticiones en orden y cada tarjeta pulsa mientras suena la suya", async () => {
		const { audio, pendientes, terminar } = conPlayManual();
		const m = montar({ audio, effect: SECUENCIA });
		m.reponer({ feedback: conAccion("x"), attemptKey: 1 });
		await act(async () => {});
		expect(pendientes.map((p) => p.req)).toEqual([{ key: "ending:a" }]);
		expect([m.estado("a"), m.estado("b"), m.estado("c")]).toEqual([
			"pulsing",
			"idle",
			"idle",
		]);
		await terminar(0);
		expect([m.estado("a"), m.estado("b"), m.estado("c")]).toEqual([
			"idle",
			"pulsing",
			"idle",
		]);
		await terminar(1);
		expect([m.estado("a"), m.estado("b"), m.estado("c")]).toEqual([
			"idle",
			"idle",
			"pulsing",
		]);
		await terminar(2);
		expect(pendientes.map((p) => p.req)).toEqual([
			{ key: "ending:a" },
			{ key: "ending:b" },
			{ key: "ending:c" },
		]);
		expect([m.estado("a"), m.estado("b"), m.estado("c")]).toEqual([
			"idle",
			"idle",
			"idle",
		]);
	});

	it("X8: con un reproductor que nunca llama a onSegment la secuencia termina y la entrada queda libre", async () => {
		const audio = fakeAudio();
		// `play` resuelve sin invocar jamás `onSegment`, como el reproductor silencioso.
		audio.play.mockImplementation(async () => {});
		const m = montar({ audio, effect: SECUENCIA });
		m.reponer({ feedback: conAccion("x"), attemptKey: 1 });
		await act(async () => {});
		expect(audio.play).toHaveBeenCalledTimes(3);
		fireEvent.click(m.tarjeta("b"));
		expect(m.onAnswer).toHaveBeenCalledWith("b");
	});

	it("una secuencia cuyo audio falla también libera la entrada", async () => {
		const audio = fakeAudio();
		audio.play.mockRejectedValue(new Error("sin voz"));
		const m = montar({ audio, effect: SECUENCIA });
		m.reponer({ feedback: conAccion("x"), attemptKey: 1 });
		await act(async () => {});
		fireEvent.click(m.tarjeta("b"));
		expect(m.onAnswer).toHaveBeenCalledWith("b");
	});

	it("una secuencia sin pasos no bloquea", async () => {
		const m = montar({ effect: { kind: "sequence", steps: [] } });
		m.reponer({ feedback: conAccion("x"), attemptKey: 1 });
		await act(async () => {});
		fireEvent.click(m.tarjeta("a"));
		expect(m.onAnswer).toHaveBeenCalledWith("a");
	});

	it("pulse: la opción pulsa y suena; con un intento nuevo deja de pulsar", () => {
		const m = montar({
			effect: { kind: "pulse", optionId: "a", request: { key: "word:a" } },
		});
		m.reponer({ feedback: conAccion("x"), attemptKey: 1 });
		expect(m.estado("a")).toBe("pulsing");
		expect(m.audio.play).toHaveBeenCalledWith({ key: "word:a" });
		m.reponer({ attemptKey: 2 });
		expect(m.estado("a")).toBe("idle");
	});

	it("X9: con mark, tocar otra opción no hace nada y tocar la marcada llama a onModelDone, nunca a onAnswer", () => {
		const m = montar({ effect: { kind: "mark", optionId: "b" } });
		m.reponer({ feedback: conAccion("x") });
		expect(m.estado("b")).toBe("marked");
		fireEvent.click(m.tarjeta("a"));
		expect(m.onModelDone).not.toHaveBeenCalled();
		expect(m.onAnswer).not.toHaveBeenCalled();
		fireEvent.click(m.tarjeta("b"));
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
		fireEvent.click(m.tarjeta("b"));
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
	});

	it("un feedback sin pista no ejecuta ningún efecto", () => {
		const m = montar({ effect: { kind: "mark", optionId: "b" } });
		m.reponer({
			feedback: { hint: null, resolution: { status: "mastery-credit" } },
		});
		expect(m.estado("b")).toBe("idle");
	});

	it("al desmontar se corta el sonido", () => {
		const audio = fakeAudio();
		const m = montar({ audio });
		cleanup();
		expect(audio.stop).toHaveBeenCalled();
		expect(m.onAnswer).not.toHaveBeenCalled();
	});
});
