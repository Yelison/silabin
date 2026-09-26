import type { CurriculumIndex } from "@/content/index";
import type { ItemKind } from "@/content/kinds";
import { templates } from "@/content/templates";

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

export type ItemWithoutTemplate = {
	unitId: string;
	itemId: string;
	kind: ItemKind;
};

/**
 * Los ítems que una unidad introduce pero para los que no declara ninguna plantilla que los
 * acepte. El planificador no tiene respaldo global: una unidad así rompería la sesión del niño,
 * así que el contenido no puede permitirla. Vacío significa que el currículo es coherente.
 */
export function itemsWithoutTemplate(
	content: CurriculumIndex,
): ItemWithoutTemplate[] {
	const out: ItemWithoutTemplate[] = [];
	for (const unitId of content.unitOrder) {
		const unit = content.units.get(unitId);
		if (unit === undefined) continue;
		for (const itemId of unit.introduces) {
			const item = content.items.get(itemId);
			if (item === undefined) continue;
			const declarada = unit.exercises.some((exercise) =>
				templates[exercise.templateId].itemKinds.includes(item.kind),
			);
			if (!declarada) out.push({ unitId, itemId, kind: item.kind });
		}
	}
	return out;
}
