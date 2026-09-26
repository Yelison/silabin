import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSilentPlayer } from "@/audio/silent-player";
import { createSpeechPlayer, SYLLABLE_GAP_MS } from "@/audio/speech-player";

class FakeUtterance {
	text: string;
	lang = "";
	voice: SpeechSynthesisVoice | null = null;
	onend: (() => void) | null = null;
	onerror: (() => void) | null = null;
	constructor(text: string) {
		this.text = text;
	}
}

class FakeSynth {
	spoken: FakeUtterance[] = [];
	cancelCalls = 0;
	log: string[] | undefined;
	private voices: SpeechSynthesisVoice[] = [];
	private listeners = new Set<() => void>();

	speak = (u: FakeUtterance) => {
		this.spoken.push(u);
		this.log?.push(`speak:${u.text}`);
	};
	cancel = () => {
		this.cancelCalls++;
	};
	getVoices = () => this.voices;
	addEventListener = (type: string, listener: () => void) => {
		if (type === "voiceschanged") this.listeners.add(listener);
	};
	removeEventListener = (type: string, listener: () => void) => {
		if (type === "voiceschanged") this.listeners.delete(listener);
	};
	setVoices(voices: SpeechSynthesisVoice[]) {
		this.voices = voices;
	}
	fireVoicesChanged() {
		for (const l of this.listeners) l();
	}
	/** Textos dichos, sin la locución vacía de `unlock`. */
	texts() {
		return this.spoken.map((u) => u.text).filter((t) => t !== "");
	}
	/** Termina de sonar la última utterance. */
	endLast() {
		this.spoken[this.spoken.length - 1]?.onend?.();
	}
}

function voice(lang: string, name = lang): SpeechSynthesisVoice {
	return { lang, name } as unknown as SpeechSynthesisVoice;
}

function asSynth(fake: FakeSynth): SpeechSynthesis {
	return fake as unknown as SpeechSynthesis;
}

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

	it("A5: beats llama a beat antes de cada sílaba", async () => {
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
		expect(log.filter((e) => e !== "speak:")).toEqual([
			"segment:0",
			"beat",
			"speak:me",
			"segment:1",
			"beat",
			"speak:sa",
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
