import { describe, expect, it } from "vitest";
import type { Item } from "@/content/types";
import {
	isForbiddenDistractor,
	pickDistractors,
	similarity,
} from "@/engine/distractors";
import { createRng } from "@/engine/random";

function letter(text: string): Item {
	return {
		id: `letter:${text}`,
		kind: "letter",
		text,
		phonemes: [text],
		audioKey: `phoneme:${text}`,
		display: { upper: text.toUpperCase(), lower: text },
	};
}

function syllable(text: string): Item {
	return {
		id: `syllable:${text}`,
		kind: "syllable",
		text,
		phonemes: [text[0] ?? "", text[1] ?? ""],
		audioKey: `syllable:${text}`,
	};
}

function picture(text: string, onset: string): Item {
	return {
		id: `picture:${text}`,
		kind: "picture",
		text,
		phonemes: [onset],
		audioKey: `word:${text}`,
		imageKey: `img:${text}`,
		syllables: [text],
	};
}

describe("isForbiddenDistractor", () => {
	it("prohíbe las letras que se confunden en espejo", () => {
		expect(isForbiddenDistractor(letter("b"), letter("d"))).toBe(true);
		expect(isForbiddenDistractor(letter("p"), letter("q"))).toBe(true);
	});

	it("prohíbe el propio objetivo como distractor", () => {
		expect(isForbiddenDistractor(letter("a"), letter("a"))).toBe(true);
	});

	it("prohíbe una imagen con el mismo sonido inicial, porque habría dos respuestas correctas", () => {
		expect(
			isForbiddenDistractor(picture("oso", "o"), picture("ojo", "o")),
		).toBe(true);
		expect(
			isForbiddenDistractor(picture("oso", "o"), picture("uva", "u")),
		).toBe(false);
	});

	it("permite letras de formas distintas", () => {
		expect(isForbiddenDistractor(letter("m"), letter("a"))).toBe(false);
	});
});

describe("similarity", () => {
	it("las letras del mismo grupo de forma son muy parecidas", () => {
		expect(similarity(letter("a"), letter("o"))).toBe(2);
		expect(similarity(letter("a"), letter("m"))).toBe(0);
	});

	it("las sílabas que comparten consonante son más parecidas que las que comparten vocal", () => {
		expect(similarity(syllable("ma"), syllable("mo"))).toBe(2);
		expect(similarity(syllable("ma"), syllable("la"))).toBe(1);
		expect(similarity(syllable("ma"), syllable("pe"))).toBe(0);
	});
});

describe("pickDistractors", () => {
	const vocales = ["a", "e", "i", "o", "u"].map(letter);

	it("devuelve la cantidad pedida", () => {
		const out = pickDistractors({
			target: letter("a"),
			pool: vocales,
			count: 2,
			rng: createRng(1),
			level: "easy",
		});
		expect(out).toHaveLength(2);
	});

	it("nunca incluye el objetivo", () => {
		const out = pickDistractors({
			target: letter("a"),
			pool: vocales,
			count: 4,
			rng: createRng(2),
			level: "hard",
		});
		expect(out.map((i) => i.id)).not.toContain("letter:a");
	});

	it("no repite distractores", () => {
		const out = pickDistractors({
			target: letter("a"),
			pool: vocales,
			count: 4,
			rng: createRng(3),
			level: "hard",
		});
		expect(new Set(out.map((i) => i.id)).size).toBe(4);
	});

	it("para sílabas en nivel difícil prefiere mayor similitud que en fácil", () => {
		const pool = ["me", "mi", "la", "pe"].map(syllable);
		const target = syllable("ma");
		const easy = pickDistractors({
			target,
			pool,
			count: 2,
			rng: createRng(5),
			level: "easy",
		});
		const hard = pickDistractors({
			target,
			pool,
			count: 2,
			rng: createRng(5),
			level: "hard",
		});
		const easyAvg =
			easy.reduce((sum, item) => sum + similarity(target, item), 0) /
			easy.length;
		const hardAvg =
			hard.reduce((sum, item) => sum + similarity(target, item), 0) /
			hard.length;
		expect(hardAvg).toBeGreaterThanOrEqual(easyAvg);
	});

	it("nunca elige un distractor prohibido aunque sea el único parecido", () => {
		const pool = [letter("d"), letter("m"), letter("i")];
		const out = pickDistractors({
			target: letter("b"),
			pool,
			count: 2,
			rng: createRng(6),
			level: "hard",
		});
		expect(out.map((i) => i.text)).not.toContain("d");
	});

	it("es determinista con la misma semilla", () => {
		const args = {
			target: letter("a"),
			pool: vocales,
			count: 2,
			level: "hard" as const,
		};
		const a = pickDistractors({ ...args, rng: createRng(9) });
		const b = pickDistractors({ ...args, rng: createRng(9) });
		expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
	});

	it("en 50 semillas distintas nunca aparece una letra espejo del objetivo", () => {
		// Es la restricción pedagógica más importante del módulo: a esta edad el cerebro ve
		// b, d, p y q como la misma forma girada. Comprobarlo con una sola semilla dejaría
		// el resultado a merced de la suerte.
		const pool = ["b", "d", "p", "q", "m", "a", "i", "l"].map(letter);
		for (const grupo of [["b", "d", "p", "q"]]) {
			for (const texto of grupo) {
				for (let seed = 1; seed <= 50; seed += 1) {
					const salida = pickDistractors({
						target: letter(texto),
						pool,
						count: 2,
						rng: createRng(seed),
						level: "hard",
					});
					for (const elegido of salida) {
						expect([texto, seed, grupo.includes(elegido.text)]).toEqual([
							texto,
							seed,
							false,
						]);
					}
				}
			}
		}
	});

	it("sobre un banco con empates, muchas semillas producen combinaciones distintas", () => {
		// Protege el barajado previo: sin él, el resultado es fijo y el niño acaba
		// reconociendo la terna en vez de leyendo la letra.
		const pool = ["ma", "me", "mi", "mo", "mu"].map(syllable);
		const vistas = new Set<string>();
		for (let seed = 1; seed <= 20; seed += 1) {
			const salida = pickDistractors({
				target: syllable("ma"),
				pool,
				count: 2,
				rng: createRng(seed),
				level: "hard",
			});
			vistas.add([...salida.map((i) => i.text)].sort().join("+"));
		}
		expect(vistas.size).toBeGreaterThanOrEqual(3);
	});

	it("el nivel fácil elige, en promedio, opciones menos parecidas que el difícil", () => {
		// Fijar la salida exacta para una semilla concreta es frágil: cualquier cambio en el
		// barajado rompería el test sin que el criterio estuviera mal. Se comprueba la
		// propiedad sobre muchas semillas en vez de un resultado puntual.
		const pool = ["o", "e", "c", "s", "m", "i", "l", "u"].map(letter);
		const media = (level: "easy" | "hard") => {
			let total = 0;
			let cuenta = 0;
			for (let seed = 1; seed <= 40; seed += 1) {
				for (const elegido of pickDistractors({
					target: letter("a"),
					pool,
					count: 2,
					rng: createRng(seed),
					level,
				})) {
					total += similarity(letter("a"), elegido);
					cuenta += 1;
				}
			}
			return total / cuenta;
		};
		expect(media("easy")).toBeLessThan(media("hard"));
	});

	it("similarity también distingue palabras, no solo letras y sílabas", () => {
		const palabra = (text: string, syllables: string[]): Item => ({
			id: `word:${text}`,
			kind: "word",
			text,
			phonemes: [...text],
			audioKey: `word:${text}`,
			syllables,
		});
		expect(
			similarity(palabra("mapa", ["ma", "pa"]), palabra("mala", ["ma", "la"])),
		).toBe(2);
		expect(
			similarity(palabra("mapa", ["ma", "pa"]), palabra("lupa", ["lu", "pa"])),
		).toBe(1);
		expect(
			similarity(palabra("mapa", ["ma", "pa"]), palabra("oso", ["o", "so"])),
		).toBe(0);
	});

	it("lanza si el grupo de candidatos no alcanza", () => {
		expect(() =>
			pickDistractors({
				target: letter("a"),
				pool: [letter("a")],
				count: 2,
				rng: createRng(7),
				level: "easy",
			}),
		).toThrow(/suficientes/i);
	});
});
