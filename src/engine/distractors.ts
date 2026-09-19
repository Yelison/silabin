import { areMirrorConfusable, stripDiacritics } from "@/content/invariants";
import type { Item } from "@/content/types";
import type { Rng } from "@/engine/random";

/** Letras que comparten trazos y se confunden por la vista, no por el sonido. */
export const LETTER_SHAPE_GROUPS: readonly (readonly string[])[] = [
	["a", "e", "o", "c", "s"],
	["i", "l", "t", "f", "j"],
	["m", "n", "u", "h", "r"],
	["b", "d", "p", "q", "g"],
	["v", "w", "x", "y", "z", "k", "ñ"],
];

export type DistractorLevel = "easy" | "hard";

function shapeGroupOf(letter: string): number {
	return LETTER_SHAPE_GROUPS.findIndex((group) => group.includes(letter));
}

export function similarity(a: Item, b: Item): 0 | 1 | 2 {
	if (a.kind === "letter" || a.kind === "phoneme") {
		const groupA = shapeGroupOf(stripDiacritics(a.text));
		const groupB = shapeGroupOf(stripDiacritics(b.text));
		return groupA >= 0 && groupA === groupB ? 2 : 0;
	}

	if (a.kind === "syllable") {
		if (a.text[0] === b.text[0]) return 2;
		if (a.text[1] === b.text[1]) return 1;
		return 0;
	}

	if (a.kind === "word") {
		if (a.syllables?.[0] === b.syllables?.[0]) return 2;
		if (a.text.length === b.text.length) return 1;
		return 0;
	}

	return 0;
}

export function isForbiddenDistractor(target: Item, candidate: Item): boolean {
	if (target.id === candidate.id || target.text === candidate.text) return true;

	if (target.text.length === 1 && candidate.text.length === 1) {
		if (
			areMirrorConfusable(
				stripDiacritics(target.text),
				stripDiacritics(candidate.text),
			)
		)
			return true;
	}

	// En sonido inicial, dos opciones con el mismo sonido inicial darían dos respuestas correctas.
	if (
		(target.kind === "picture" || target.kind === "phoneme") &&
		candidate.kind === "picture"
	) {
		if (target.phonemes[0] === candidate.phonemes[0]) return true;
	}

	return false;
}

export function pickDistractors(input: {
	target: Item;
	pool: readonly Item[];
	count: number;
	rng: Rng;
	level: DistractorLevel;
}): Item[] {
	const { target, pool, count, rng, level } = input;

	const allowed = pool.filter(
		(candidate) => !isForbiddenDistractor(target, candidate),
	);
	if (allowed.length < count) {
		throw new Error(
			`No hay suficientes distractores para ${target.id}: se piden ${count} y solo hay ${allowed.length}`,
		);
	}

	// Se mezcla primero para que los empates de similitud se resuelvan de forma determinista pero variada.
	const shuffled = rng.shuffle(allowed);
	const sorted = [...shuffled].sort((a, b) => {
		const diff = similarity(target, b) - similarity(target, a);
		return level === "hard" ? diff : -diff;
	});

	return sorted.slice(0, count);
}
