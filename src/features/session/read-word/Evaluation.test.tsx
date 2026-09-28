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
	firstSyllableAudioKey,
	type Item,
	type PlannedExercise,
	templates,
} from "@/engine";
import { AppProviders, type SpeechDeps } from "@/features/app-context";
import { Evaluation } from "@/features/session/read-word/Evaluation";
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

const PISTAS = templates["read-word"].hints;
function feedbackDe(rung: 0 | 1 | 2): AttemptFeedback {
	const hint = PISTAS[rung];
	if (hint === undefined) throw new Error("Falta la pista");
	// El tercer fallo llega ya resuelto como asistido (D19/P12); los dos primeros, no.
	return {
		hint,
		resolution: rung === 2 ? { status: "assisted" } : null,
	};
}
const ACIERTO: AttemptFeedback = {
	hint: null,
	resolution: { status: "mastery-credit" },
};

function itemDe(id: string): Item {
	const item = curriculum.items.get(id);
	if (item === undefined) throw new Error(`Falta ${id}`);
	return item;
}

async function montar(
	opts: {
		id?: string;
		hideMic?: boolean;
		conSpeech?: boolean;
		evaluators?: SpeechEvaluator[];
		speechMode?: "auto" | "parent";
		accent?: "do" | "mx" | "neutro";
	} = {},
) {
	const id = opts.id ?? "word:mapa";
	const item = itemDe(id);
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
		templateId: "read-word",
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
const tapada = () => screen.queryByRole("img", { name: "Imagen tapada" });
/** Cualquier imagen real (o su emoji de respaldo) en el árbol accesible. */
const imagenDeLaPalabra = (c: HTMLElement) =>
	c.querySelector("img[src*='/images/']") ??
	screen.queryByRole("img", { name: /mapa|mama/ });

describe("read-word/Evaluation", () => {
	it("W2: la imagen no está en el DOM hasta la resolución; tras el acierto, sí", async () => {
		const { container, conFeedback } = await montar();
		expect(imagenDeLaPalabra(container)).toBeNull();
		expect(screen.queryByRole("img", { name: "mapa" })).toBeNull();
		expect(tapada()).not.toBeNull();

		conFeedback(ACIERTO);

		expect(screen.getByRole("img", { name: "mapa" })).toBeTruthy();
		expect(tapada()).toBeNull();
	});

	it("W2: la tarjeta tapada no nombra la imagen, ni con su nombre accesible ni con su contenido", async () => {
		const { container } = await montar();
		const carta = tapada() as HTMLElement;
		const nombre = carta.getAttribute("aria-label") ?? "";
		expect(nombre).not.toMatch(/mapa/i);
		expect(carta.textContent ?? "").not.toMatch(/mapa|🗺/i);
		// Nada más en el árbol la delata: ni un `alt`, ni un `title`.
		expect(container.querySelector("img[alt='mapa']")).toBeNull();
		expect(container.querySelector("[title]")).toBeNull();
	});

	it("W2: un fallo con pista (sin resolución) no revela la imagen", async () => {
		const { container, conFeedback } = await montar();
		conFeedback(feedbackDe(0));
		expect(imagenDeLaPalabra(container)).toBeNull();
		conFeedback(feedbackDe(1));
		expect(imagenDeLaPalabra(container)).toBeNull();
		expect(tapada()).not.toBeNull();
	});

	it("W3: pinta la palabra en minúscula, con tilde, y no reproduce nada al montar", async () => {
		const { audio, claves } = await montar({ id: "word:mama" });
		expect(screen.getByText("mamá")).toBeTruthy();
		expect(audio.play).not.toHaveBeenCalled();
		expect(claves()).not.toContain("word:mama");
	});

	it("W3: Oír otra vez reproduce instruction:read-word, no la palabra", async () => {
		const { claves } = await montar();
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(claves()).toEqual(["instruction:read-word"]);
	});

	it("lanza si falta props.speech", async () => {
		const espia = vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(montar({ conSpeech: false })).rejects.toThrow(/speech/);
		espia.mockRestore();
	});

	it("el turno evalúa contra la palabra, con el acento del ajuste", async () => {
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
			evaluators: [evaluador],
			speechMode: "auto",
			accent: "mx",
		});
		fireEvent.click(mic());
		await avanzar(COUNTDOWN_MS + 50);
		expect(visto?.text).toBe("mapa");
		expect(visto?.lang).toBe("es-MX");
		expect(onVerdict).toHaveBeenCalledWith("ok");
	});

	it("con parent, tras oír salen los botones y «Lo dijo bien» manda ok", async () => {
		const { onVerdict } = await montar();
		fireEvent.click(mic());
		await avanzar(COUNTDOWN_MS + 50);
		fireEvent.click(screen.getByRole("button", { name: "Lo dijo bien" }));
		expect(onVerdict).toHaveBeenCalledWith("ok");
	});

	it("W4: fallo 1 separa las sílabas y reproduce la instrucción", async () => {
		const { claves, conFeedback } = await montar();
		expect(screen.getByText("mapa")).toBeTruthy();
		expect(screen.queryByText("ma·pa")).toBeNull();
		conFeedback(feedbackDe(0));
		expect(screen.getByText("ma·pa")).toBeTruthy();
		expect(claves()).toEqual(["instruction:read-word"]);
	});

	it("W4: fallo 2 reproduce la primera sílaba (firstSyllableAudioKey) y las sílabas siguen separadas", async () => {
		const { claves, conFeedback, item } = await montar();
		conFeedback(feedbackDe(0));
		conFeedback(feedbackDe(1));
		expect(claves().at(-1)).toBe(firstSyllableAudioKey(curriculum, item));
		expect(claves().at(-1)).toBe("syllable:ma");
		expect(screen.getByText("ma·pa")).toBeTruthy();
	});

	it("W4: fallo 3 reproduce la palabra entera, pasa a modo modelo y descubre la imagen", async () => {
		const { container, conFeedback, claves, onModelDone, onVerdict } =
			await montar();
		conFeedback(feedbackDe(0));
		conFeedback(feedbackDe(1));
		conFeedback(feedbackDe(2));
		expect(claves().at(-1)).toBe("word:mapa");
		expect(screen.getByRole("img", { name: "mapa" })).toBeTruthy();
		expect(imagenDeLaPalabra(container)).not.toBeNull();
		await avanzar(10);
		// En modo modelo basta con que hable: no se evalúa, se avisa de que terminó.
		fireEvent.click(mic());
		await avanzar(COUNTDOWN_MS + 50);
		expect(onModelDone).toHaveBeenCalledTimes(1);
		expect(onVerdict).not.toHaveBeenCalled();
	});

	it("con hideMic no hay micrófono y salen los botones del adulto", async () => {
		const { onVerdict } = await montar({ hideMic: true });
		expect(screen.queryByRole("button", { name: "Micrófono" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Otra vez" }));
		expect(onVerdict).toHaveBeenCalledWith("retry");
	});

	it("mientras suena el audio de una pista el micrófono está deshabilitado, con tope", async () => {
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
		conFeedback(feedbackDe(0));
		await avanzar(10);
		expect(micDeshabilitado()).toBe(false);
	});

	it("con locked el micrófono no responde, y al desmontar corta el audio", async () => {
		const { conFeedback, unmount, audio } = await montar();
		conFeedback(null, true);
		expect(micDeshabilitado()).toBe(true);
		unmount();
		expect(audio.stop).toHaveBeenCalled();
	});
});
