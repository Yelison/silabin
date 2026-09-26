import { picturesByInitialPhoneme } from "@/content/pictures";
import type { Item } from "@/content/types";

const ACCENTED_VOWELS: Record<string, string> = {
	á: "a",
	é: "e",
	í: "i",
	ó: "o",
	ú: "u",
};

function isVowelChar(c: string): boolean {
	return "aeiou".includes(c) || ACCENTED_VOWELS[c] !== undefined;
}

/**
 * El final que dos palabras deben compartir para rimar, con la ortografía tal cual (con
 * tilde si la lleva): quien compare debe hacerlo sin tildes, porque "ratón" y "limón" riman
 * aunque ambos lleven la suya en la misma posición relativa.
 *
 * Con tilde, desde la vocal acentuada. Sin tilde y terminada en vocal, n o s, desde la
 * penúltima vocal: es la sílaba tónica por defecto del español ("llana"). En cualquier otro
 * caso (termina en otra consonante), desde la última vocal.
 */
export function rimeOf(word: string): string {
	const letters = [...word];

	const accentIndex = letters.findIndex(
		(c) => ACCENTED_VOWELS[c] !== undefined,
	);
	if (accentIndex >= 0) return letters.slice(accentIndex).join("");

	const vowelIndexes = letters
		.map((c, i) => (isVowelChar(c) ? i : -1))
		.filter((i) => i >= 0);
	const last = letters.at(-1) ?? "";
	const terminaEnVocalNoS = isVowelChar(last) || last === "n" || last === "s";

	const indice =
		terminaEnVocalNoS && vowelIndexes.length >= 2
			? vowelIndexes[vowelIndexes.length - 2]
			: vowelIndexes.at(-1);
	if (indice === undefined) return word;
	return letters.slice(indice).join("");
}

/** "picture:gato" → "ending:gato" */
export function endingKey(pictureId: string): string {
	return `ending:${pictureId.slice("picture:".length)}`;
}

/** "syllable:ma" → "stretch:syllable:ma" */
export function stretchKey(itemId: string): string {
	return `stretch:${itemId}`;
}

/** "oral:hear:a-pato" → "stretch-in:a-pato" */
export function stretchInKey(itemId: string): string {
	return itemId.replace(/^oral:hear:/, "stretch-in:");
}

/** Las primeras `n` imágenes cuyo fonema inicial es `phoneme`, en el orden del catálogo. */
export function picturesStartingWith(phoneme: string, n: number): Item[] {
	return picturesByInitialPhoneme(phoneme).slice(0, n);
}
