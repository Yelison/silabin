import type { Item, Unit } from "@/content/types";

export const VOWEL_ORDER = ["a", "e", "o", "i", "u"] as const;

const UNIT_TITLES: Record<string, string> = {
	a: "La vocal a",
	e: "La vocal e",
	o: "La vocal o",
	i: "La vocal i",
	u: "La vocal u",
};

export const phase1Items: Item[] = VOWEL_ORDER.flatMap((vowel): Item[] => [
	{
		id: `phoneme:${vowel}`,
		kind: "phoneme",
		text: vowel,
		phonemes: [vowel],
		audioKey: `phoneme:${vowel}`,
	},
	{
		id: `letter:${vowel}`,
		kind: "letter",
		text: vowel,
		phonemes: [vowel],
		audioKey: `phoneme:${vowel}`,
		display: { upper: vowel.toUpperCase(), lower: vowel },
	},
]);

export const phase1Units: Unit[] = VOWEL_ORDER.map((vowel, index) => {
	const previous = VOWEL_ORDER[index - 1];
	return {
		id: `phase1:vowel-${vowel}`,
		phase: 1,
		title: UNIT_TITLES[vowel] ?? `La vocal ${vowel}`,
		audioKey: `unit:phase1:vowel-${vowel}`,
		requires:
			previous === undefined
				? ["phase0:hear-it"]
				: [`phase1:vowel-${previous}`],
		introduces: [`phoneme:${vowel}`, `letter:${vowel}`],
		exercises: [
			{ templateId: "initial-sound", weight: 1 },
			{ templateId: "listen-tap", weight: 3 },
			{ templateId: "trace", weight: 2 },
			{ templateId: "say-it", weight: 2 },
		],
	};
});
