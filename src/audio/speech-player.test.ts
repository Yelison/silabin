import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asSynth, FakeSynth, FakeUtterance, voice } from "@/audio/fake-synth";
import { createSilentPlayer } from "@/audio/silent-player";
import {
	createSpeechPlayer,
	pickVoice,
	SEGMENT_FALLBACK_MS,
	SPEECH_GUARD_MIN_MS,
	SYLLABLE_GAP_MS,
} from "@/audio/speech-player";

const settle = () => vi.advanceTimersByTimeAsync(0);

let synth: FakeSynth;

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
	synth = new FakeSynth();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

async function unlockedPlayer(
	overrides: Partial<Parameters<typeof createSpeechPlayer>[0]> = {},
) {
	const player = createSpeechPlayer({
		synth: asSynth(synth),
		accent: "mx",
		...overrides,
	});
	await player.unlock();
	return player;
}

describe("unlock", () => {
	it("pasa de bloqueado a desbloqueado y dice una locución vacía dentro del gesto", async () => {
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		expect(player.unlocked).toBe(false);
		const done = player.unlock();
		expect(synth.spoken.map((u) => u.text)).toEqual([""]);
		await done;
		expect(player.unlocked).toBe(true);
	});

	it("crea y reanuda el AudioContext del golpe dentro del gesto", async () => {
		const resume = vi.fn(() => Promise.resolve());
		const created = vi.fn();
		class FakeContext {
			state = "suspended";
			constructor() {
				created();
			}
			resume = resume;
		}
		vi.stubGlobal("AudioContext", FakeContext);
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		const done = player.unlock();
		expect(created).toHaveBeenCalledTimes(1);
		expect(resume).toHaveBeenCalledTimes(1);
		await done;
	});

	it("no lanza si no existe AudioContext o si resume() rechaza", async () => {
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		await expect(player.unlock()).resolves.toBeUndefined();

		class Broken {
			state = "suspended";
			resume = () => Promise.reject(new Error("no"));
		}
		vi.stubGlobal("AudioContext", Broken);
		const other = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		await expect(other.unlock()).resolves.toBeUndefined();
		expect(other.unlocked).toBe(true);
	});
});

describe("play", () => {
	it("A1: play sin unlock resuelve sin sonar", async () => {
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		await expect(player.play({ key: "word:mesa" })).resolves.toBeUndefined();
		expect(synth.spoken).toEqual([]);
	});

	it("A2: tras unlock, una petición normal dice el texto del manifiesto", async () => {
		const player = await unlockedPlayer();
		const done = player.play({ key: "word:mesa" });
		await settle();
		expect(synth.texts()).toEqual(["mesa"]);
		synth.endLast();
		await expect(done).resolves.toBeUndefined();
	});

	it("A3: la segunda petición no se crea hasta el onend de la primera", async () => {
		const player = await unlockedPlayer();
		const first = player.play({ key: "word:mesa" });
		const second = player.play({ key: "word:casa" });
		await settle();
		expect(synth.texts()).toEqual(["mesa"]);
		synth.endLast();
		await settle();
		expect(synth.texts()).toEqual(["mesa", "casa"]);
		synth.endLast();
		await Promise.all([first, second]);
	});

	it("una utterance que falla (onerror) tampoco deja colgada la cola", async () => {
		const player = await unlockedPlayer();
		const first = player.play({ key: "word:mesa" });
		const second = player.play({ key: "word:casa" });
		await settle();
		synth.spoken[synth.spoken.length - 1]?.onerror?.();
		await settle();
		expect(synth.texts()).toEqual(["mesa", "casa"]);
		synth.endLast();
		await Promise.all([first, second]);
	});

	it("A4: by-syllable dice una locución por sílaba, separadas por SYLLABLE_GAP_MS, y avisa a onSegment en orden", async () => {
		const player = await unlockedPlayer();
		const segments: number[] = [];
		const done = player.play({
			key: "word:mesa",
			style: "by-syllable",
			syllables: ["me", "sa"],
			onSegment: (i) => segments.push(i),
		});
		await settle();
		expect(synth.texts()).toEqual(["me"]);
		expect(segments).toEqual([0]);
		synth.endLast();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS - 1);
		expect(synth.texts()).toEqual(["me"]);
		expect(segments).toEqual([0]);
		await vi.advanceTimersByTimeAsync(1);
		expect(synth.texts()).toEqual(["me", "sa"]);
		expect(segments).toEqual([0, 1]);
		synth.endLast();
		await done;
	});

	it("A5: beats llama a beat y a onSegment en el onstart de cada sílaba, no antes", async () => {
		synth.log = [];
		const log = synth.log;
		const player = await unlockedPlayer({ beat: () => log.push("beat") });
		const done = player.play({
			key: "word:mesa",
			style: "beats",
			syllables: ["me", "sa"],
			onSegment: (i) => log.push(`segment:${i}`),
		});
		await settle();
		synth.endLast();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS);
		synth.endLast();
		await done;
		// La sílaba se pide primero; la luz y el golpe llegan con el onstart de esa sílaba,
		// no antes de pedirla (así coinciden con la voz también en Edge). Se descarta el
		// "speak:" de la locución vacía de unlock().
		expect(log.filter((e) => e !== "speak:")).toEqual([
			"speak:me",
			"segment:0",
			"beat",
			"speak:sa",
			"segment:1",
			"beat",
		]);
	});

	it("by-syllable no llama a beat", async () => {
		const beat = vi.fn();
		const player = await unlockedPlayer({ beat });
		const done = player.play({
			key: "word:mesa",
			style: "by-syllable",
			syllables: ["me"],
		});
		await settle();
		synth.endLast();
		await done;
		expect(beat).not.toHaveBeenCalled();
	});

	it("A6: sin synth, unlock y play resuelven sin lanzar", async () => {
		const player = createSpeechPlayer({ synth: undefined, accent: "do" });
		await expect(player.unlock()).resolves.toBeUndefined();
		await expect(player.play({ key: "word:mesa" })).resolves.toBeUndefined();
		await expect(
			player.play({
				key: "word:mesa",
				style: "beats",
				syllables: ["me", "sa"],
			}),
		).resolves.toBeUndefined();
		expect(() => player.stop()).not.toThrow();
	});

	it("A9: una clave inexistente rechaza con Error, también antes del unlock", async () => {
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		await expect(player.play({ key: "word:nada" })).rejects.toBeInstanceOf(
			Error,
		);
		await player.unlock();
		await expect(player.play({ key: "word:nada" })).rejects.toBeInstanceOf(
			Error,
		);
		await expect(player.play({ key: "toString" })).rejects.toBeInstanceOf(
			Error,
		);
	});

	it("by-syllable o beats sin sílabas es un error de programación", async () => {
		const player = await unlockedPlayer();
		await expect(
			player.play({ key: "word:mesa", style: "by-syllable" }),
		).rejects.toBeInstanceOf(Error);
		await expect(
			player.play({ key: "word:mesa", style: "beats", syllables: [] }),
		).rejects.toBeInstanceOf(Error);
	});

	it("un textFor propio sustituye al manifiesto", async () => {
		const player = await unlockedPlayer({
			textFor: (key) => (key === "x" ? "equis" : undefined),
		});
		const done = player.play({ key: "x" });
		await settle();
		expect(synth.texts()).toEqual(["equis"]);
		synth.endLast();
		await done;
		await expect(player.play({ key: "word:mesa" })).rejects.toBeInstanceOf(
			Error,
		);
	});
});

describe("stop", () => {
	it("A8: cancela lo que suena, resuelve la actual y la pendiente, y la pendiente nunca habla", async () => {
		const player = await unlockedPlayer();
		const playing = player.play({ key: "word:mesa" });
		const queued = player.play({ key: "word:casa" });
		await settle();
		player.stop();
		expect(synth.cancelCalls).toBe(1);
		await expect(playing).resolves.toBeUndefined();
		await expect(queued).resolves.toBeUndefined();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS * 3);
		expect(synth.texts()).toEqual(["mesa"]);
	});

	it("stop durante la pausa entre sílabas resuelve y no dice la siguiente", async () => {
		const player = await unlockedPlayer();
		const done = player.play({
			key: "word:mesa",
			style: "by-syllable",
			syllables: ["me", "sa"],
		});
		await settle();
		synth.endLast();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS / 2);
		player.stop();
		await expect(done).resolves.toBeUndefined();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS * 3);
		expect(synth.texts()).toEqual(["me"]);
	});

	it("después de stop, una petición nueva suena con normalidad", async () => {
		const player = await unlockedPlayer();
		const old = player.play({ key: "word:mesa" });
		await settle();
		player.stop();
		await old;
		const fresh = player.play({ key: "word:casa" });
		await settle();
		expect(synth.texts()).toEqual(["mesa", "casa"]);
		synth.endLast();
		await fresh;
	});

	it("el onend tardío de la utterance cancelada no adelanta a la siguiente petición", async () => {
		const player = await unlockedPlayer();
		const old = player.play({ key: "word:mesa" });
		await settle();
		const cancelled = synth.spoken[synth.spoken.length - 1];
		player.stop();
		await old;
		const fresh = player.play({
			key: "word:casa",
			style: "by-syllable",
			syllables: ["ca", "sa"],
		});
		await settle();
		cancelled?.onend?.();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS * 2);
		expect(synth.texts()).toEqual(["mesa", "ca"]);
		synth.endLast();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS);
		synth.endLast();
		await fresh;
	});
});

describe("guarda contra onend que no llega", () => {
	it("si onend nunca llega, la primera resuelve y la cola avanza tras la guarda", async () => {
		const player = await unlockedPlayer();
		const first = player.play({ key: "word:mesa" });
		const second = player.play({ key: "word:casa" });
		await settle();
		await vi.advanceTimersByTimeAsync(SPEECH_GUARD_MIN_MS - 1);
		expect(synth.texts()).toEqual(["mesa"]);
		await vi.advanceTimersByTimeAsync(1);
		await expect(first).resolves.toBeUndefined();
		expect(synth.texts()).toEqual(["mesa", "casa"]);
		await vi.advanceTimersByTimeAsync(SPEECH_GUARD_MIN_MS);
		await expect(second).resolves.toBeUndefined();
	});

	it("un texto largo tiene una guarda proporcional, no la mínima", async () => {
		const long = "a".repeat(40);
		const player = await unlockedPlayer({ textFor: () => long });
		const done = player.play({ key: "x" });
		let resolved = false;
		void done.then(() => {
			resolved = true;
		});
		await settle();
		await vi.advanceTimersByTimeAsync(SPEECH_GUARD_MIN_MS * 2);
		expect(resolved).toBe(false);
		await vi.advanceTimersByTimeAsync(40 * 250 + 2000);
		expect(resolved).toBe(true);
	});

	it("cada sílaba tiene su propia guarda: sin onend, by-syllable sigue con la pausa", async () => {
		const player = await unlockedPlayer();
		const done = player.play({
			key: "word:mesa",
			style: "by-syllable",
			syllables: ["me", "sa"],
		});
		await settle();
		await vi.advanceTimersByTimeAsync(SPEECH_GUARD_MIN_MS + SYLLABLE_GAP_MS);
		expect(synth.texts()).toEqual(["me", "sa"]);
		await vi.advanceTimersByTimeAsync(SPEECH_GUARD_MIN_MS);
		await done;
	});

	it("con onend normal el temporizador se limpia y no queda nada pendiente", async () => {
		const player = await unlockedPlayer();
		const done = player.play({ key: "word:mesa" });
		await settle();
		expect(vi.getTimerCount()).toBe(1);
		synth.endLast();
		await done;
		expect(vi.getTimerCount()).toBe(0);
	});

	it("stop también limpia el temporizador de la guarda", async () => {
		const player = await unlockedPlayer();
		const done = player.play({ key: "word:mesa" });
		await settle();
		player.stop();
		await done;
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("robustez de la cola", () => {
	it("el onend tardío de una utterance cancelada no impide que un stop posterior resuelva la petición nueva", async () => {
		const player = await unlockedPlayer();
		const old = player.play({ key: "word:mesa" });
		await settle();
		const cancelled = synth.spoken[synth.spoken.length - 1];
		player.stop();
		await old;
		const fresh = player.play({ key: "word:casa" });
		await settle();
		cancelled?.onend?.();
		player.stop();
		await expect(fresh).resolves.toBeUndefined();
	});

	it("si onSegment lanza, play rechaza y la siguiente petición sigue funcionando", async () => {
		const player = await unlockedPlayer();
		const boom = new Error("boom");
		const failing = player.play({
			key: "word:mesa",
			style: "by-syllable",
			syllables: ["me", "sa"],
			onSegment: () => {
				throw boom;
			},
		});
		await expect(failing).rejects.toBe(boom);
		// "me" ya se había pedido: onSegment llega con el onstart, después de synth.speak.
		expect(synth.texts()).toEqual(["me"]);
		const next = player.play({ key: "word:casa" });
		await settle();
		expect(synth.texts()).toEqual(["me", "casa"]);
		synth.endLast();
		await expect(next).resolves.toBeUndefined();
	});

	it("si onSegment llama a stop, no sigue a la siguiente sílaba y la petición resuelve", async () => {
		const player = await unlockedPlayer();
		const done = player.play({
			key: "word:mesa",
			style: "by-syllable",
			syllables: ["me", "sa"],
			onSegment: () => player.stop(),
		});
		await expect(done).resolves.toBeUndefined();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS * 3);
		// "me" ya se había pedido antes de que onSegment pudiera llamar a stop().
		expect(synth.texts()).toEqual(["me"]);
	});

	it("si onSegment llama a stop en beats, tampoco suena el golpe", async () => {
		const beat = vi.fn();
		const player = await unlockedPlayer({ beat });
		const done = player.play({
			key: "word:mesa",
			style: "beats",
			syllables: ["me", "sa"],
			onSegment: () => player.stop(),
		});
		await expect(done).resolves.toBeUndefined();
		expect(beat).not.toHaveBeenCalled();
		expect(synth.texts()).toEqual(["me"]);
	});

	it("si beat llama a stop, no sigue a la siguiente sílaba", async () => {
		let player: ReturnType<typeof createSpeechPlayer> | undefined;
		player = await unlockedPlayer({ beat: () => player?.stop() });
		const done = player.play({
			key: "word:mesa",
			style: "beats",
			syllables: ["me", "sa"],
		});
		await expect(done).resolves.toBeUndefined();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS * 3);
		// "me" ya se había pedido antes de que beat() pudiera llamar a stop().
		expect(synth.texts()).toEqual(["me"]);
	});
});

describe("voz", () => {
	it("A7: sin voces al principio, usa la es-MX que llega en voiceschanged", async () => {
		const player = await unlockedPlayer();
		const first = player.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBeNull();
		synth.endLast();
		await first;

		const mx = voice("es-MX");
		synth.setVoices([voice("en-US"), voice("es-ES"), mx]);
		synth.fireVoicesChanged();
		const second = player.play({ key: "word:casa" });
		await settle();
		const utterance = synth.spoken[synth.spoken.length - 1];
		expect(utterance?.voice).toBe(mx);
		expect(utterance?.lang).toBe("es-MX");
		synth.endLast();
		await second;
	});

	it("prefiere la voz del acento; si no hay, cualquier es-*; nunca una de otro idioma", async () => {
		const es = voice("es-ES");
		const dom = voice("es-DO");
		synth.setVoices([voice("en-US"), es, dom]);
		const doPlayer = await unlockedPlayer({ accent: "do" });
		const a = doPlayer.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBe(dom);
		synth.endLast();
		await a;

		const mxPlayer = await unlockedPlayer({ accent: "mx" });
		const b = mxPlayer.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBe(es);
		synth.endLast();
		await b;
	});

	it("acepta lang con guion bajo (es_MX), como en Android", async () => {
		const mx = voice("es_MX");
		synth.setVoices([voice("es-ES"), mx]);
		const player = await unlockedPlayer({ accent: "mx" });
		const done = player.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBe(mx);
		synth.endLast();
		await done;
	});

	it("sin ninguna voz es-*, no fija voz y usa el lang del acento", async () => {
		synth.setVoices([voice("en-US")]);
		const cases = [
			["do", "es-DO"],
			["mx", "es-MX"],
			["neutro", "es-US"],
		] as const;
		for (const [accent, lang] of cases) {
			const player = await unlockedPlayer({ accent });
			const done = player.play({ key: "word:mesa" });
			await settle();
			const utterance = synth.spoken[synth.spoken.length - 1];
			expect(utterance?.voice).toBeNull();
			expect(utterance?.lang).toBe(lang);
			synth.endLast();
			await done;
		}
	});

	it("A8: entre dos voces del mismo acento, gana la Mejorada", () => {
		const paulina = voice("es-MX", "Paulina");
		const mejorada = voice("es-MX", "Paulina (Mejorada)");
		expect(pickVoice([paulina, mejorada], "mx")).toBe(mejorada);
	});

	it("A9: la Natural de Microsoft gana a la estándar del mismo acento", () => {
		const sabina = voice("es-MX", "Microsoft Sabina");
		const dalia = voice("es-MX", "Microsoft Dalia Online (Natural)");
		expect(pickVoice([sabina, dalia], "mx")).toBe(dalia);
	});

	it("A10: el acento manda sobre la calidad (R19)", () => {
		const paloma = voice("es-US", "Paloma (Natural)");
		const paulina = voice("es-MX", "Paulina");
		expect(pickVoice([paloma, paulina], "mx")).toBe(paulina);
	});

	it("A11: una voz de fantasía se penaliza frente a una estándar del mismo acento", () => {
		const eddy = voice("es-MX", "Eddy");
		const paulina = voice("es-MX", "Paulina");
		expect(pickVoice([eddy, paulina], "mx")).toBe(paulina);
	});

	it("A12: sin el acento exacto, dentro de cualquier es-* gana la de más calidad", () => {
		const monica = voice("es-ES", "Mónica (Premium)");
		const jorge = voice("es-ES", "Jorge");
		expect(pickVoice([monica, jorge], "do")).toBe(monica);
	});

	it("A13: penalizar no es excluir: una única voz de fantasía se devuelve igual", () => {
		const grandma = voice("es-MX", "Grandma");
		expect(pickVoice([grandma], "mx")).toBe(grandma);
	});
});

describe("acento en vivo", () => {
	type Accent = "do" | "mx" | "neutro";

	it("un getter que pasa de mx a do cambia la voz y el lang sin perder el desbloqueo", async () => {
		const mx = voice("es-MX");
		const dom = voice("es-DO");
		synth.setVoices([mx, dom]);
		let actual: Accent = "mx";
		const player = await unlockedPlayer({ accent: () => actual });

		const first = player.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBe(mx);
		synth.endLast();
		await first;

		actual = "do";
		const second = player.play({ key: "word:casa" });
		await settle();
		const utterance = synth.spoken[synth.spoken.length - 1];
		expect(utterance?.voice).toBe(dom);
		expect(utterance?.lang).toBe("es-DO");
		expect(player.unlocked).toBe(true);
		synth.endLast();
		await second;
	});

	it("dos cambios seguidos antes de sonar: sin voces, el lang es el del acento vigente", async () => {
		let actual: Accent = "do";
		const player = await unlockedPlayer({ accent: () => actual });
		actual = "mx";
		actual = "neutro";
		const done = player.play({ key: "word:mesa" });
		await settle();
		const utterance = synth.spoken[synth.spoken.length - 1];
		expect(utterance?.voice).toBeNull();
		expect(utterance?.lang).toBe("es-US");
		synth.endLast();
		await done;
	});

	it("voiceschanged tras el cambio elige la voz del acento vigente, no la del acento de la creación", async () => {
		let actual: Accent = "mx";
		const player = await unlockedPlayer({ accent: () => actual });
		actual = "do";
		const mx = voice("es-MX");
		const dom = voice("es-DO");
		synth.setVoices([mx, dom]);
		synth.fireVoicesChanged();
		const done = player.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBe(dom);
		synth.endLast();
		await done;
	});

	it("voiceschanged después de hablar con el acento nuevo no devuelve la voz del acento de la creación", async () => {
		const mx = voice("es-MX");
		const dom = voice("es-DO");
		synth.setVoices([mx, dom]);
		let actual: Accent = "mx";
		const player = await unlockedPlayer({ accent: () => actual });
		actual = "do";
		const first = player.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBe(dom);
		synth.endLast();
		await first;

		synth.fireVoicesChanged();
		const second = player.play({ key: "word:casa" });
		await settle();
		const utterance = synth.spoken[synth.spoken.length - 1];
		expect(utterance?.voice).toBe(dom);
		expect(utterance?.lang).toBe("es-DO");
		synth.endLast();
		await second;
	});

	it("cambiar el acento con algo sonando: lo encolado sale con el acento nuevo y ambas promesas resuelven", async () => {
		const mx = voice("es-MX");
		const dom = voice("es-DO");
		synth.setVoices([mx, dom]);
		let actual: Accent = "mx";
		const player = await unlockedPlayer({ accent: () => actual });

		const first = player.play({ key: "word:mesa" });
		await settle();
		expect(synth.spoken[synth.spoken.length - 1]?.voice).toBe(mx);

		actual = "do";
		const second = player.play({ key: "word:casa" });
		synth.endLast();
		await first;
		await settle();
		const utterance = synth.spoken[synth.spoken.length - 1];
		expect(utterance?.text).toBe("casa");
		expect(utterance?.voice).toBe(dom);
		expect(utterance?.lang).toBe("es-DO");
		synth.endLast();
		await expect(second).resolves.toBeUndefined();
	});

	it("regresión: con un acento literal todo sigue igual", async () => {
		const mx = voice("es-MX");
		synth.setVoices([voice("es-DO"), mx]);
		const player = await unlockedPlayer({ accent: "mx" });
		const done = player.play({ key: "word:mesa" });
		await settle();
		const utterance = synth.spoken[synth.spoken.length - 1];
		expect(utterance?.voice).toBe(mx);
		expect(utterance?.lang).toBe("es-MX");
		synth.endLast();
		await done;
	});
});

describe("pausa entre sílabas con voces de red", () => {
	it("A15: con latencia 0, la pausa sigue siendo SYLLABLE_GAP_MS", async () => {
		const player = await unlockedPlayer();
		const done = player.play({
			key: "word:gato",
			style: "by-syllable",
			syllables: ["ga", "to"],
		});
		await settle();
		expect(synth.texts()).toEqual(["ga"]);
		synth.endLast();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS - 1);
		expect(synth.texts()).toEqual(["ga"]);
		await vi.advanceTimersByTimeAsync(1);
		expect(synth.texts()).toEqual(["ga", "to"]);
		synth.endLast();
		await done;
	});

	it("A16: con 400 ms de latencia, la pausa siguiente es 0 (no se suma a la anterior)", async () => {
		synth.startDelayMs = 400;
		const player = await unlockedPlayer();
		const done = player.play({
			key: "word:gato",
			style: "by-syllable",
			syllables: ["ga", "to"],
		});
		await settle();
		expect(synth.texts()).toEqual(["ga"]);
		// Llega el onstart real de "ga" (latencia 400 ms), después el onend.
		await vi.advanceTimersByTimeAsync(400);
		synth.endLast();
		await settle();
		// pausa = max(0, 350 − 400) = 0: "to" se pide enseguida.
		expect(synth.texts()).toEqual(["ga", "to"]);
		await vi.advanceTimersByTimeAsync(400);
		synth.endLast();
		await done;
	});

	it("A17: con 200 ms de latencia, la pausa siguiente es de 150 ms", async () => {
		synth.startDelayMs = 200;
		const player = await unlockedPlayer();
		const done = player.play({
			key: "word:gato",
			style: "by-syllable",
			syllables: ["ga", "to"],
		});
		await settle();
		expect(synth.texts()).toEqual(["ga"]);
		await vi.advanceTimersByTimeAsync(200);
		synth.endLast();
		await settle();
		expect(synth.texts()).toEqual(["ga"]);
		await vi.advanceTimersByTimeAsync(149);
		expect(synth.texts()).toEqual(["ga"]);
		await vi.advanceTimersByTimeAsync(1);
		expect(synth.texts()).toEqual(["ga", "to"]);
		await vi.advanceTimersByTimeAsync(200);
		synth.endLast();
		await done;
	});

	it("A18/A20: beat y onSegment(0) llegan una sola vez, sin adelantarse a la voz", async () => {
		synth.startDelayMs = 300;
		const log: string[] = [];
		const player = await unlockedPlayer({ beat: () => log.push("beat") });
		const done = player.play({
			key: "word:mesa",
			style: "beats",
			syllables: ["me", "sa"],
			onSegment: (i) => log.push(`segment:${i}`),
		});
		await settle();
		// No se adelantan a pedir la sílaba.
		expect(log).toEqual([]);
		await vi.advanceTimersByTimeAsync(SEGMENT_FALLBACK_MS - 1);
		expect(log).toEqual([]);
		await vi.advanceTimersByTimeAsync(1);
		// A los 250 ms, el respaldo los lanza (la voz aún no ha arrancado).
		expect(log).toEqual(["segment:0", "beat"]);
		await vi.advanceTimersByTimeAsync(50);
		// A los 300 ms llega el onstart real: no se repiten.
		expect(log).toEqual(["segment:0", "beat"]);
		synth.endLast();
		// La latencia real (300 ms) sigue midiéndose: pausa = max(0, 350 − 300) = 50.
		await vi.advanceTimersByTimeAsync(50);
		expect(synth.texts()).toEqual(["me", "sa"]);
		synth.endLast();
		await done;
	});

	it("A19: si onstart nunca llega, el respaldo dispara una sola vez y la cola sigue", async () => {
		synth.suppressOnstart = true;
		const log: string[] = [];
		const player = await unlockedPlayer({ beat: () => log.push("beat") });
		const done = player.play({
			key: "word:mesa",
			style: "beats",
			syllables: ["me", "sa"],
			onSegment: (i) => log.push(`segment:${i}`),
		});
		await settle();
		expect(log).toEqual([]);
		await vi.advanceTimersByTimeAsync(SEGMENT_FALLBACK_MS - 1);
		expect(log).toEqual([]);
		await vi.advanceTimersByTimeAsync(1);
		expect(log).toEqual(["segment:0", "beat"]);
		await vi.advanceTimersByTimeAsync(1000);
		expect(log).toEqual(["segment:0", "beat"]);
		// Sin onstart, pero con onend: la cola avanza igual (latencia 0, pausa completa).
		synth.endLast();
		await vi.advanceTimersByTimeAsync(SYLLABLE_GAP_MS);
		expect(synth.texts()).toEqual(["me", "sa"]);
		await vi.advanceTimersByTimeAsync(SEGMENT_FALLBACK_MS);
		expect(log).toEqual(["segment:0", "beat", "segment:1", "beat"]);
		synth.endLast();
		await done;
	});

	it("A21: stop() durante la espera de onstart no dispara onSegment ni beat tardíos", async () => {
		synth.suppressOnstart = true;
		const log: string[] = [];
		const player = await unlockedPlayer({ beat: () => log.push("beat") });
		const done = player.play({
			key: "word:mesa",
			style: "beats",
			syllables: ["me", "sa"],
			onSegment: (i) => log.push(`segment:${i}`),
		});
		await settle();
		player.stop();
		// stop() limpia también el respaldo pendiente, no solo la guarda de onend.
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(SEGMENT_FALLBACK_MS + 1000);
		expect(log).toEqual([]);
		await expect(done).resolves.toBeUndefined();
	});
});

describe("beat (R3)", () => {
	it("player.beat() llama a deps.beat sin crear utterances ni tocar la cola", async () => {
		const beat = vi.fn();
		const player = createSpeechPlayer({
			synth: asSynth(synth),
			accent: "mx",
			beat,
		});
		player.beat();
		expect(beat).toHaveBeenCalledTimes(1);
		expect(synth.spoken).toEqual([]);
		expect(synth.cancelCalls).toBe(0);
	});

	it("suena de forma síncrona aunque haya una locución sonando y otra en cola, y stop no lo cancela", async () => {
		const beat = vi.fn();
		const player = await unlockedPlayer({ beat });
		const playing = player.play({ key: "word:mesa" });
		const queued = player.play({ key: "word:casa" });
		await settle();
		player.beat();
		expect(beat).toHaveBeenCalledTimes(1);
		expect(synth.texts()).toEqual(["mesa"]);
		player.stop();
		player.beat();
		expect(beat).toHaveBeenCalledTimes(2);
		await Promise.all([playing, queued]);
	});

	it("por omisión no lanza si no existe AudioContext, y sin unlock no suena", () => {
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		expect(() => player.beat()).not.toThrow();
	});

	it("el clic por omisión solo suena con el contexto reanudado", async () => {
		const start = vi.fn();
		const oscillators = vi.fn();
		class FakeContext {
			state: string;
			currentTime = 0;
			destination = {};
			constructor() {
				this.state = "suspended";
			}
			resume = () => {
				this.state = "running";
				return Promise.resolve();
			};
			createOscillator = () => {
				oscillators();
				return {
					type: "sine",
					frequency: { value: 0 },
					connect: () => undefined,
					start,
					stop: () => undefined,
				};
			};
			createGain = () => ({
				gain: {
					setValueAtTime: () => undefined,
					linearRampToValueAtTime: () => undefined,
					exponentialRampToValueAtTime: () => undefined,
				},
				connect: () => undefined,
			});
		}
		vi.stubGlobal("AudioContext", FakeContext);
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		player.beat();
		expect(oscillators).not.toHaveBeenCalled();
		await player.unlock();
		player.beat();
		expect(oscillators).toHaveBeenCalledTimes(1);
		expect(start).toHaveBeenCalledTimes(1);
	});
});

describe("beat (R3): contexto no reanudado", () => {
	it("si el contexto sigue suspendido tras unlock (iOS sin gesto válido), el clic no suena", async () => {
		const oscillators = vi.fn();
		class StuckContext {
			state = "suspended";
			resume = () => Promise.resolve();
			createOscillator = () => {
				oscillators();
				throw new Error("no debería crearse");
			};
		}
		vi.stubGlobal("AudioContext", StuckContext);
		const player = createSpeechPlayer({ synth: asSynth(synth), accent: "mx" });
		await player.unlock();
		expect(() => player.beat()).not.toThrow();
		expect(oscillators).not.toHaveBeenCalled();
	});
});

describe("createSilentPlayer", () => {
	it("resuelve todo al instante y solo cambia unlocked con unlock()", async () => {
		const player = createSilentPlayer();
		expect(player.unlocked).toBe(false);
		await expect(player.unlock()).resolves.toBeUndefined();
		expect(player.unlocked).toBe(true);
		await expect(player.play({ key: "word:mesa" })).resolves.toBeUndefined();
		await expect(
			player.play({ key: "nada", style: "beats", syllables: ["a"] }),
		).resolves.toBeUndefined();
		expect(() => player.stop()).not.toThrow();
	});

	it("beat() es un no-op", () => {
		const player = createSilentPlayer();
		expect(() => player.beat()).not.toThrow();
		expect(player.beat()).toBeUndefined();
	});
});
