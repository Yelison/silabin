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
	type HintStep,
	type PlannedExercise,
	templates,
} from "@/engine";
import {
	Evaluation,
	MAX_TAPS,
	TAP_SETTLE_MS,
} from "@/features/session/count-syllables/Evaluation";
import { conProveedores, crearStore, fakeAudio } from "@/features/test-support";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function ejercicio(palabra: string): {
	exercise: PlannedExercise;
	item: NonNullable<ReturnType<typeof curriculum.items.get>>;
} {
	const item = curriculum.items.get(`oral:clap:${palabra}`);
	if (item === undefined) throw new Error(`Falta ${palabra}`);
	return {
		item,
		exercise: {
			id: `ev:${palabra}`,
			kind: "evaluation",
			templateId: "count-syllables",
			itemId: item.id,
			optionIds: [],
			correctOptionId: null,
			source: "active-unit",
		},
	};
}

const pistas = templates["count-syllables"].hints;
function pista(rung: HintStep["rung"]): HintStep {
	const h = pistas.find((p) => p.rung === rung);
	if (h === undefined) throw new Error(`Falta la pista ${rung}`);
	return h;
}
const conPista = (rung: HintStep["rung"]): AttemptFeedback => ({
	hint: pista(rung),
	resolution: rung === "model" ? { status: "assisted" } : null,
});

type Opciones = {
	palabra?: string;
	attemptKey?: number;
	feedback?: AttemptFeedback | null;
	locked?: boolean;
};

function montar(o: Opciones = {}) {
	const audio = fakeAudio();
	const onAnswer = vi.fn();
	const onModelDone = vi.fn();
	const { exercise, item } = ejercicio(o.palabra ?? "mesa");
	const store = crearStore();
	const pintar = (p: Opciones = {}) =>
		conProveedores(
			store,
			audio,
			<Evaluation
				exercise={exercise}
				item={item}
				attemptKey={p.attemptKey ?? o.attemptKey ?? 0}
				feedback={p.feedback === undefined ? (o.feedback ?? null) : p.feedback}
				locked={p.locked ?? o.locked ?? false}
				onAnswer={onAnswer}
				onModelDone={onModelDone}
			/>,
		);
	const { container, rerender, unmount } = render(pintar());
	const tambor = () => screen.getByRole("button", { name: "Tambor" });
	const tocar = (n = 1) => {
		for (let i = 0; i < n; i++) fireEvent.click(tambor());
	};
	const avanzar = (ms: number) =>
		act(() => {
			vi.advanceTimersByTime(ms);
		});
	const circulos = () => container.querySelectorAll("[data-circle]").length;
	const luces = () => container.querySelectorAll("[data-light]").length;
	const modelo = () => [
		...container.querySelectorAll<HTMLElement>("[data-model-circle]"),
	];
	return {
		audio,
		onAnswer,
		onModelDone,
		container,
		unmount,
		tambor,
		tocar,
		avanzar,
		circulos,
		luces,
		modelo,
		reponer: (p: Opciones) => rerender(pintar(p)),
	};
}

const playCalls = (a: ReturnType<typeof fakeAudio>) =>
	a.play.mock.calls.map((c) => c[0]);

describe("count-syllables / Evaluation", () => {
	it("pinta la imagen grande, el altavoz y el tambor, sin texto", () => {
		const m = montar();
		expect(screen.getByRole("img", { name: "mesa" }).getAttribute("src")).toBe(
			"/images/palabras/mesa.webp",
		);
		expect(screen.getByRole("button", { name: "Oír otra vez" })).toBeDefined();
		expect(m.tambor()).toBeDefined();
		expect(m.tambor().querySelector("img")?.getAttribute("src")).toBe(
			"/icons/ui-drum.png",
		);
		expect(m.tambor().textContent).not.toContain("🥁");
		expect(m.circulos()).toBe(0);
		expect(m.audio.play).not.toHaveBeenCalled();
	});

	it("I2: sin luces el hueco de las luces sigue reservado, para que el tambor no salte", () => {
		const m = montar({ feedback: conPista("reduce") });
		const hueco = m.container.querySelector("[data-lights]");
		expect(hueco).not.toBeNull();
		expect(hueco?.className).toContain("min-h-8");
		expect(m.luces()).toBe(0);
	});

	it("el altavoz vuelve a decir la palabra, y con locked no", () => {
		const m = montar();
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(playCalls(m.audio)).toEqual([{ key: "word:mesa" }]);
		m.reponer({ locked: true });
		fireEvent.click(screen.getByRole("button", { name: "Oír otra vez" }));
		expect(m.audio.play).toHaveBeenCalledTimes(1);
	});

	it("cada toque enciende un círculo y suena un golpe suelto (beat), sin pasar por play", () => {
		const m = montar();
		m.tocar(2);
		expect(m.circulos()).toBe(2);
		expect(m.audio.beat).toHaveBeenCalledTimes(2);
		expect(m.audio.play).not.toHaveBeenCalled();
	});

	it("C2: dos toques y 1500 ms dan onAnswer('2') una sola vez", () => {
		const m = montar();
		m.tocar(2);
		m.avanzar(TAP_SETTLE_MS - 1);
		expect(m.onAnswer).not.toHaveBeenCalled();
		m.avanzar(1);
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("2");
		m.avanzar(10_000);
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
	});

	it("C3: un toque a los 1400 ms reinicia el silencio: onAnswer('3')", () => {
		const m = montar();
		m.tocar(2);
		m.avanzar(1400);
		m.tocar(1);
		m.avanzar(1400);
		expect(m.onAnswer).not.toHaveBeenCalled();
		m.avanzar(TAP_SETTLE_MS - 1400);
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).toHaveBeenCalledWith("3");
	});

	it("C4: siete toques dejan como mucho cinco círculos y responden '5'", () => {
		const m = montar();
		m.tocar(7);
		expect(m.circulos()).toBe(MAX_TAPS);
		expect(m.audio.beat).toHaveBeenCalledTimes(MAX_TAPS);
		m.avanzar(TAP_SETTLE_MS);
		expect(m.onAnswer).toHaveBeenCalledWith("5");
	});

	it("los toques por encima del tope no reinician el silencio", () => {
		const m = montar();
		m.tocar(5);
		m.avanzar(1000);
		m.tocar(2);
		m.avanzar(500);
		expect(m.onAnswer).toHaveBeenCalledWith("5");
	});

	it("C5: sin toques no se responde jamás", () => {
		const m = montar();
		m.avanzar(5000);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("C6: con locked los toques no cuentan, no suenan ni reinician el silencio", () => {
		const bloqueado = montar({ locked: true });
		bloqueado.tocar(3);
		expect(bloqueado.circulos()).toBe(0);
		expect(bloqueado.audio.beat).not.toHaveBeenCalled();
		bloqueado.avanzar(5000);
		expect(bloqueado.onAnswer).not.toHaveBeenCalled();
	});

	it("C6b: un toque con locked a mitad de espera no aplaza el cierre", () => {
		const m = montar();
		m.tocar(2);
		m.avanzar(1000);
		m.reponer({ locked: true });
		m.tocar(1);
		expect(m.circulos()).toBe(2);
		m.avanzar(500);
		expect(m.onAnswer).toHaveBeenCalledWith("2");
	});

	it("C7: tras onAnswer, más toques (aún sin feedback) no cuentan ni dan un segundo onAnswer", () => {
		const m = montar();
		m.tocar(2);
		m.avanzar(TAP_SETTLE_MS);
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
		m.tocar(3);
		expect(m.circulos()).toBe(2);
		expect(m.audio.beat).toHaveBeenCalledTimes(2);
		m.avanzar(10_000);
		expect(m.onAnswer).toHaveBeenCalledTimes(1);
	});

	it("un nuevo attemptKey reabre la entrada tras un onAnswer", () => {
		const m = montar();
		m.tocar(2);
		m.avanzar(TAP_SETTLE_MS);
		m.reponer({ attemptKey: 1, feedback: conPista("reduce") });
		m.tocar(3);
		m.avanzar(TAP_SETTLE_MS);
		expect(m.onAnswer).toHaveBeenCalledTimes(2);
		expect(m.onAnswer).toHaveBeenLastCalledWith("3");
	});

	it("C8: el rung reduce pide by-syllable con las sílabas y enciende una luz por onSegment", () => {
		const m = montar({ feedback: conPista("reduce") });
		const [peticion] = playCalls(m.audio);
		expect(peticion).toMatchObject({
			key: "word:mesa",
			style: "by-syllable",
			syllables: ["me", "sa"],
		});
		expect(m.luces()).toBe(0);
		act(() => peticion?.onSegment?.(0));
		expect(m.luces()).toBe(1);
		act(() => peticion?.onSegment?.(1));
		expect(m.luces()).toBe(2);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("C8b: sin onSegment (reproductor silencioso) la pista no bloquea nada", () => {
		const m = montar({ feedback: conPista("reduce") });
		expect(m.luces()).toBe(0);
		m.tocar(2);
		m.avanzar(TAP_SETTLE_MS);
		expect(m.onAnswer).toHaveBeenCalledWith("2");
	});

	it("C9: el rung sound pide beats con las sílabas, sin luces por número", () => {
		const m = montar({ feedback: conPista("sound"), palabra: "pelota" });
		expect(playCalls(m.audio)).toHaveLength(1);
		expect(playCalls(m.audio)[0]).toMatchObject({
			key: "word:pelota",
			style: "beats",
			syllables: ["pe", "lo", "ta"],
		});
		// La pista suena; el golpe suelto (beat) es solo del toque del niño.
		expect(m.audio.beat).not.toHaveBeenCalled();
	});

	it("una pista no se repite al pintar de nuevo con el mismo feedback", () => {
		const fb = conPista("sound");
		const m = montar({ feedback: fb });
		m.reponer({ feedback: fb });
		m.tocar(1);
		expect(m.audio.play).toHaveBeenCalledTimes(1);
	});

	it("C10: el rung model en pelota marca 3 círculos; onModelDone solo al tocar el tercero, y nunca onAnswer", () => {
		const m = montar({ palabra: "pelota", feedback: conPista("model") });
		expect(m.modelo()).toHaveLength(3);
		expect(m.modelo().every((c) => c.dataset.state === "marked")).toBe(true);
		m.tocar(1);
		expect(m.audio.beat).toHaveBeenCalledTimes(1);
		expect(m.modelo().map((c) => c.dataset.state)).toEqual([
			"tapped",
			"marked",
			"marked",
		]);
		m.tocar(1);
		expect(m.onModelDone).not.toHaveBeenCalled();
		m.tocar(1);
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.audio.beat).toHaveBeenCalledTimes(3);
		m.tocar(2);
		m.avanzar(10_000);
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
		expect(m.onAnswer).not.toHaveBeenCalled();
	});

	it("C10b: en el modelo también se puede tocar los círculos, en orden, y suena el golpe", () => {
		const m = montar({ palabra: "pelota", feedback: conPista("model") });
		for (const c of m.modelo()) fireEvent.click(c);
		expect(m.audio.beat).toHaveBeenCalledTimes(3);
		expect(m.onModelDone).toHaveBeenCalledTimes(1);
	});

	it("el modelo no reproduce audio de pista ni deja tocar con locked", () => {
		const m = montar({
			palabra: "pelota",
			feedback: conPista("model"),
			locked: true,
		});
		m.tocar(3);
		expect(m.onModelDone).not.toHaveBeenCalled();
		expect(m.audio.play).not.toHaveBeenCalled();
	});

	it("la pista de modelo no muestra los círculos ya contados por el niño", () => {
		const m = montar({ palabra: "pelota" });
		m.tocar(2);
		m.avanzar(TAP_SETTLE_MS);
		m.reponer({ feedback: conPista("model") });
		expect(m.circulos()).toBe(0);
		expect(m.modelo()).toHaveLength(3);
	});

	it("C11: un attemptKey nuevo devuelve los círculos a cero y cancela el silencio pendiente", () => {
		const m = montar();
		m.tocar(2);
		expect(m.circulos()).toBe(2);
		m.reponer({ attemptKey: 1 });
		expect(m.circulos()).toBe(0);
		m.avanzar(5000);
		expect(m.onAnswer).not.toHaveBeenCalled();
		m.tocar(1);
		m.avanzar(TAP_SETTLE_MS);
		expect(m.onAnswer).toHaveBeenCalledWith("1");
	});

	it("un attemptKey nuevo apaga las luces de la pista anterior", () => {
		const m = montar({ feedback: conPista("reduce") });
		act(() => playCalls(m.audio)[0]?.onSegment?.(1));
		expect(m.luces()).toBe(2);
		m.reponer({ attemptKey: 1, feedback: conPista("sound") });
		expect(m.luces()).toBe(0);
	});

	it("al desmontar se cancela el silencio pendiente y se corta el sonido", () => {
		const m = montar();
		m.tocar(2);
		m.unmount();
		m.avanzar(5000);
		expect(m.onAnswer).not.toHaveBeenCalled();
		expect(m.audio.stop).toHaveBeenCalled();
	});

	it("una luz tardía de una pista anterior no toca la pista siguiente", () => {
		const m = montar({ feedback: conPista("reduce") });
		const vieja = playCalls(m.audio)[0];
		m.reponer({ attemptKey: 1, feedback: conPista("reduce") });
		act(() => vieja?.onSegment?.(0));
		expect(m.luces()).toBe(0);
	});

	it("las pistas no llevan cifras ni texto", () => {
		const m = montar({ palabra: "pelota", feedback: conPista("reduce") });
		expect(m.container.textContent).not.toMatch(/\d/);
	});
});
