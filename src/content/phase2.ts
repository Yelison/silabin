import { stripDiacritics, syllabify } from "@/content/invariants";
import { VOWEL_ORDER } from "@/content/phase1";
import type { Item, Unit } from "@/content/types";

export const CONSONANT_ORDER = ["m", "l", "s", "p"] as const;
type Consonant = (typeof CONSONANT_ORDER)[number];

const SYLLABLE_VOWELS = ["a", "e", "i", "o", "u"] as const;

const WORDS: Record<Consonant, string[]> = {
	m: ["mamá", "mimo", "mima", "ama", "amo"],
	l: ["lima", "loma", "mula", "mala", "malo", "lelo", "ala", "ola"],
	s: [
		"mesa",
		"masa",
		"misa",
		"suma",
		"sumo",
		"sola",
		"sala",
		"oso",
		"uso",
		"eso",
		"asa",
	],
	p: [
		"papá",
		"pipa",
		"mapa",
		"sapo",
		"sopa",
		"pesa",
		"puma",
		"pala",
		"pelo",
		"polo",
		"lupa",
		"paso",
		"piso",
	],
};

const UNIT_TITLES: Record<Consonant, string> = {
	m: "La m y sus sílabas",
	l: "La l y sus sílabas",
	s: "La s y sus sílabas",
	p: "La p y sus sílabas",
};

function letterItem(consonant: Consonant): Item {
	return {
		id: `letter:${consonant}`,
		kind: "letter",
		text: consonant,
		phonemes: [consonant],
		audioKey: `phoneme:${consonant}`,
		display: { upper: consonant.toUpperCase(), lower: consonant },
	};
}

function syllableItems(consonant: Consonant): Item[] {
	return SYLLABLE_VOWELS.map((vowel) => ({
		id: `syllable:${consonant}${vowel}`,
		kind: "syllable",
		text: `${consonant}${vowel}`,
		phonemes: [consonant, vowel],
		audioKey: `syllable:${consonant}${vowel}`,
	}));
}

function wordItem(word: string): Item {
	const accented = word !== stripDiacritics(word);
	const base: Item = {
		id: `word:${stripDiacritics(word)}`,
		kind: "word",
		text: word,
		phonemes: [...stripDiacritics(word)],
		audioKey: `word:${stripDiacritics(word)}`,
		imageKey: `img:${stripDiacritics(word)}`,
		syllables: syllabify(word),
	};
	return accented ? { ...base, accented: true } : base;
}

export const phase2Items: Item[] = CONSONANT_ORDER.flatMap(
	(consonant): Item[] => [
		{
			id: `phoneme:${consonant}`,
			kind: "phoneme",
			text: consonant,
			phonemes: [consonant],
			audioKey: `phoneme:${consonant}`,
		},
		letterItem(consonant),
		...syllableItems(consonant),
		...WORDS[consonant].map(wordItem),
	],
);

export const phase2Units: Unit[] = CONSONANT_ORDER.map((consonant, index) => {
	const previous = CONSONANT_ORDER[index - 1];
	return {
		id: `phase2:${consonant}`,
		phase: 2,
		title: UNIT_TITLES[consonant],
		audioKey: `unit:phase2:${consonant}`,
		requires:
			previous === undefined ? ["phase1:vowel-u"] : [`phase2:${previous}`],
		introduces: [
			`phoneme:${consonant}`,
			`letter:${consonant}`,
			...syllableItems(consonant).map((i) => i.id),
			...WORDS[consonant].map((w) => `word:${stripDiacritics(w)}`),
		],
		exercises: [
			{ templateId: "listen-tap", weight: 3 },
			{ templateId: "build", weight: 2 },
			{ templateId: "trace", weight: 1 },
			{ templateId: "say-it", weight: 3 },
			{ templateId: "read-word", weight: 2 },
			{ templateId: "initial-sound", weight: 1 },
		],
	};
});

/** Letras disponibles al llegar a esa unidad: las 5 vocales más las consonantes hasta ella incluida. */
export function lettersIntroducedBefore(unitId: string): Set<string> {
	const index = CONSONANT_ORDER.findIndex((c) => `phase2:${c}` === unitId);
	const consonants = index < 0 ? [] : CONSONANT_ORDER.slice(0, index + 1);
	return new Set<string>([...VOWEL_ORDER, ...consonants]);
}
