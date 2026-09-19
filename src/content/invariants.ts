export const VOWELS = new Set(["a", "e", "i", "o", "u"]);
export const MIRROR_GROUPS: readonly (readonly string[])[] = [
	["b", "d", "p", "q"],
];

const ACCENTED: Record<string, string> = {
	á: "a",
	é: "e",
	í: "i",
	ó: "o",
	ú: "u",
};

export function stripDiacritics(text: string): string {
	return [...text].map((c) => ACCENTED[c] ?? c).join("");
}

function isVowelLetter(c: string): boolean {
	return VOWELS.has(stripDiacritics(c));
}

/** Parte una palabra en sílabas suponiendo que solo tiene CV y V. Devuelve [] si no lo es. */
export function syllabify(word: string): string[] {
	const letters = [...word];
	const out: string[] = [];
	let i = 0;
	while (i < letters.length) {
		const current = letters[i];
		if (current === undefined) break;
		if (isVowelLetter(current)) {
			out.push(current);
			i += 1;
			continue;
		}
		const next = letters[i + 1];
		if (next === undefined || !isVowelLetter(next)) return [];
		out.push(current + next);
		i += 2;
	}
	return out;
}

export function hasOnlyOpenSyllables(word: string): boolean {
	const syllables = syllabify(word);
	if (syllables.length === 0) return false;
	return syllables.join("") === word;
}

export function hasAdjacentVowels(word: string): boolean {
	const letters = [...word];
	return letters.some((c, index) => {
		const next = letters[index + 1];
		return next !== undefined && isVowelLetter(c) && isVowelLetter(next);
	});
}

export function accentIsFinalOnly(word: string): boolean {
	const letters = [...word];
	const accentPositions = letters.flatMap((c, index) =>
		ACCENTED[c] ? [index] : [],
	);
	if (accentPositions.length === 0) return true;
	if (accentPositions.length > 1) return false;
	const syllables = syllabify(word);
	if (syllables.length === 0) return false;
	const lastSyllable = syllables.at(-1);
	if (lastSyllable === undefined) return false;
	const firstIndexOfLast = word.length - lastSyllable.length;
	const position = accentPositions[0];
	return position !== undefined && position >= firstIndexOfLast;
}

export function areMirrorConfusable(a: string, b: string): boolean {
	if (a === b) return false;
	return MIRROR_GROUPS.some((group) => group.includes(a) && group.includes(b));
}
