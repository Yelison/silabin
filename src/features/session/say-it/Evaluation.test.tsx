// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type AttemptFeedback,
	curriculum,
	type Item,
	type PlannedExercise,
	stretchKey,
	templates,
} from "@/engine";
import { AppProviders, type SpeechDeps } from "@/features/app-context";
import { Evaluation } from "@/features/session/say-it/Evaluation";
import { HINT_AUDIO_MAX_MS } from "@/features/session/voice/hint-audio";
import { COUNTDOWN_MS } from "@/features/session/voice/VoiceTurn";
import { crearStore, fakeAudio } from "@/features/test-support";
import {
	createParentEvaluator,
	type SpeechEvaluator,
	type SpeechTarget,
} from "@/speech";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const PISTAS = templates["say-it"].hints;
function feedbackDe(rung: 0 | 1 | 2): AttemptFeedback {
	const hint = PISTAS[rung];
	if (hint === undefined) throw new Error("Falta la pista");
	return { hint, resolution: null };
}

function itemDe(id: string): Item {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	return item;
}

async function montar(
	opts: {
		id?: string;
		item?: Item;
		hideMic?: boolean;
		conSpeech?: boolean;
		evaluators?: SpeechEvaluator[];
		speechMode?: "auto" | "parent";
		accent?: "do" | "mx" | "neutro";
	} = {},
) {
	const id = opts.id ?? "letter:a";
	const item = opts.item ?? itemDe(id);
	const store = crearStore();
	await store.getState().load();
	const doc = store.getState().doc;
	store.setState({
		doc: {
			...doc,
			settings: {
				...doc.settings,
				hideMic: opts.hideMic ?? false,
				speechMode: opts.speechMode ?? "parent",
				accent: opts.accent ?? doc.settings.accent,
			},
		},
	});
	const audio = fakeAudio();
	const speechDeps: SpeechDeps = {
		listener: { listen: vi.fn(async () => ({ kind: "heard" as const })) },
		evaluators: opts.evaluators ?? [createParentEvaluator()],
	};
	const exercise: PlannedExercise = {
		id: `ev:${id}`,
		kind: "evaluation",
		templateId: "say-it",
		itemId: id,
		optionIds: [],
		correctOptionId: null,
		source: "active-unit",
	};
	const onVerdict = vi.fn();
	const onModelDone = vi.fn();
	const arbol = (feedback: AttemptFeedback | null, locked = false) => (
		<AppProviders store={store} audio={audio} speech={speechDeps}>
			<Evaluation
				exercise={exercise}
				item={item}
				attemptKey={0}
				feedback={feedback}
				locked={locked}
				onAnswer={() => {}}
				onModelDone={onModelDone}
				{...(opts.conSpeech === false ? {} : { speech: { onVerdict } })}
			/>
		</AppProviders>
	);
	const vista = render(arbol(null));
	return {
		...vista,
		audio,
		item,
		onVerdict,
		onModelDone,
		conFeedback: (f: AttemptFeedback | null, locked = false) =>
			vista.rerender(arbol(f, locked)),
		claves: () => audio.play.mock.calls.map((c) => c[0].key),
	};
}

async function avanzar(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

const mic = () => screen.getByRole("button", { name: "Micrófono" });
const micDeshabilitado = () => mic().getAttribute("aria-disabled") === "true";
const boca = (c: HTMLElement) => c.querySelector("[data-shape]");

/** Un `play` cuyas promesas resuelve el test a mano. */
function conPlayManual(audio: ReturnType<typeof fakeAudio>) {
	const resolvers: (() => void)[] = [];
	audio.play.mockImplementation(
		() => new Promise<void>((res) => resolvers.push(res)),
	);
	return {
		resolverUno: async (i: number) => {
			await act(async () => {
				resolvers[i]?.();
			});
		},
		resolverTodos: async () => {
			await act(async () => {
				for (const r of resolvers.splice(0)) r();
			});
		},
	};
}

/** Pulsa el micrófono y deja que el turno acabe en la guarda del adulto (evaluador parent). */
async function oirYEsperarAlAdulto() {
	fireEvent.click(mic());
	await avanzar(COUNTDOWN_MS + 50);
}

describe("say-it/Evaluation", () => {
	it("Y3: pinta el objetivo y no reproduce nada al montar (ni el ítem)", async () => {
		const { claves, audio } = await montar();
		expect(screen.getByText("A")).toBeTruthy();
		expect(screen.getByText("a")).toBeTruthy();
		expect(audio.play).not.toHaveBeenCalled();
		expect(claves()).not.toContain("phoneme:a");
	});

	it("Y3: Oír otra vez reproduce la instrucción, no el ítem", async () => {
		const { claves } = await montar();
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves()).toEqual(["instruction:say-it"]);
	});

	it("lanza si falta props.speech", async () => {
		const espia = vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(montar({ conSpeech: false })).rejects.toThrow(/speech/);
		espia.mockRestore();
	});

	it("el turno evalúa contra speechTarget(item, accent) del ajuste", async () => {
		let visto: SpeechTarget | undefined;
		const evaluador: SpeechEvaluator = {
			id: "browser",
			available: async () => true,
			evaluate: async ({ target }) => {
				visto = target;
				return { verdict: "ok", confidence: 1 };
			},
		};
		const { onVerdict } = await montar({
			id: "syllable:ma",
			evaluators: [evaluador],
			speechMode: "auto",
			accent: "mx",
		});
		await oirYEsperarAlAdulto();
		expect(visto).toEqual({
			text: "ma",
			phonemes: ["m", "a"],
			lang: "es-MX",
		});
		expect(onVerdict).toHaveBeenCalledWith("ok");
	});

	it("con hideMic no hay micrófono y salen los botones del adulto", async () => {
		const { onVerdict } = await montar({ hideMic: true });
		expect(screen.queryByRole("button", { name: "Micrófono" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Lo dijo bien" }));
		expect(onVerdict).toHaveBeenCalledWith("ok");
	});

	it("con parent, tras oír salen los botones y «Otra vez» manda retry", async () => {
		const { onVerdict } = await montar();
		await oirYEsperarAlAdulto();
		fireEvent.click(screen.getByRole("button", { name: "Otra vez" }));
		expect(onVerdict).toHaveBeenCalledWith("retry");
	});

	it("pista 1: enseña la boca animada y reproduce la instrucción", async () => {
		const { container, conFeedback, claves } = await montar();
		expect(boca(container)).toBeNull();
		conFeedback(feedbackDe(0));
		expect(boca(container)?.getAttribute("data-shape")).toBe("open");
		expect(claves()).toEqual(["instruction:say-it"]);
	});

	it("pista 1 con un fonema sin boca: no se pinta la boca, la instrucción suena y la pantalla no cae", async () => {
		const sinForma: Item = { ...itemDe("letter:a"), phonemes: ["zz"] };
		const { container, conFeedback, claves } = await montar({
			item: sinForma,
		});
		conFeedback(feedbackDe(0));
		expect(boca(container)).toBeNull();
		expect(claves()).toEqual(["instruction:say-it"]);
		expect(screen.getByText("A")).toBeTruthy();
		await avanzar(10);
		expect(micDeshabilitado()).toBe(false);
	});

	it("la boca es de la pista 1: la pista 2 siguiente la quita", async () => {
		const { container, conFeedback } = await montar();
		conFeedback(feedbackDe(0));
		expect(boca(container)).not.toBeNull();
		conFeedback(feedbackDe(1));
		expect(boca(container)).toBeNull();
	});

	it("pista 2: suena el sonido alargado, no el del ítem, y no hay boca", async () => {
		const { container, conFeedback, claves } = await montar({
			id: "syllable:ma",
		});
		conFeedback(feedbackDe(1));
		expect(claves()).toEqual([stretchKey("syllable:ma")]);
		expect(boca(container)).toBeNull();
	});

	it("pista 3: suena el objetivo entero y el turno pasa a modo modelo", async () => {
		const { conFeedback, claves, onModelDone, onVerdict } = await montar();
		conFeedback(feedbackDe(2));
		expect(claves()).toEqual(["phoneme:a"]);
		await avanzar(10);
		// En modo modelo basta con que hable: no se evalúa, se avisa de que terminó.
		fireEvent.click(mic());
		await avanzar(COUNTDOWN_MS + 50);
		expect(onModelDone).toHaveBeenCalledTimes(1);
		expect(onVerdict).not.toHaveBeenCalled();
	});

	it("mientras suena el audio de una pista el micrófono está deshabilitado", async () => {
		const { audio, conFeedback } = await montar();
		const play = conPlayManual(audio);
		conFeedback(feedbackDe(1));
		await avanzar(10);
		expect(micDeshabilitado()).toBe(true);
		await play.resolverTodos();
		expect(micDeshabilitado()).toBe(false);
	});

	it("mientras suena una pista, Oír otra vez tampoco responde: no se pisa el audio", async () => {
		const { audio, conFeedback, claves } = await montar();
		const play = conPlayManual(audio);
		conFeedback(feedbackDe(1));
		await avanzar(10);
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves()).toEqual([stretchKey("letter:a")]);
		await play.resolverTodos();
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves()).toEqual([stretchKey("letter:a"), "instruction:say-it"]);
	});

	it("Y7: si el audio de la pista nunca resuelve, el micrófono se habilita al vencer el tope", async () => {
		const { audio, conFeedback } = await montar();
		audio.play.mockImplementation(() => new Promise<void>(() => {}));
		conFeedback(feedbackDe(1));
		await avanzar(HINT_AUDIO_MAX_MS - 100);
		expect(micDeshabilitado()).toBe(true);
		await avanzar(200);
		expect(micDeshabilitado()).toBe(false);
	});

	it("si el audio de la pista falla, el micrófono se habilita igual", async () => {
		const { audio, conFeedback } = await montar();
		audio.play.mockRejectedValue(new Error("sin voz"));
		conFeedback(feedbackDe(1));
		await avanzar(10);
		expect(micDeshabilitado()).toBe(false);
	});

	it("el fin de la pista vieja no habilita el micrófono mientras suena la siguiente", async () => {
		const { audio, conFeedback } = await montar();
		const play = conPlayManual(audio);
		conFeedback(feedbackDe(0));
		await avanzar(10);
		conFeedback(feedbackDe(1));
		await avanzar(10);
		await play.resolverUno(0);
		expect(micDeshabilitado()).toBe(true);
		await play.resolverUno(1);
		expect(micDeshabilitado()).toBe(false);
	});

	it("con locked el micrófono no responde", async () => {
		const { conFeedback } = await montar();
		conFeedback(null, true);
		expect(micDeshabilitado()).toBe(true);
	});

	it("al desmontar corta el audio", async () => {
		const { unmount, audio } = await montar();
		unmount();
		expect(audio.stop).toHaveBeenCalled();
	});
});
