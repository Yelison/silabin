import type { Item } from "@/content/types";

export function pictureId(word: string): string {
	return `picture:${word}`;
}

type Raw = [word: string, phonemes: string, syllables: string];

/** [palabra, fonemas separados por espacio, sílabas separadas por guion] */
const RAW: Raw[] = [
	["sol", "s o l", "sol"],
	["pan", "p a n", "pan"],
	["mesa", "m e s a", "me-sa"],
	["casa", "k a s a", "ca-sa"],
	["gato", "g a t o", "ga-to"],
	["mano", "m a n o", "ma-no"],
	["pelota", "p e l o t a", "pe-lo-ta"],
	["banana", "b a n a n a", "ba-na-na"],
	["tomate", "t o m a t e", "to-ma-te"],
	["pato", "p a t o", "pa-to"],
	["masa", "m a s a", "ma-sa"],
	["luna", "l u n a", "lu-na"],
	["cuna", "k u n a", "cu-na"],
	["ratón", "r a t o n", "ra-tón"],
	["limón", "l i m o n", "li-món"],
	["sopa", "s o p a", "so-pa"],
	["copa", "k o p a", "co-pa"],
	["pelo", "p e l o", "pe-lo"],
	["velo", "b e l o", "ve-lo"],
	["avión", "a b i o n", "a-vión"],
	["árbol", "a r b o l", "ár-bol"],
	["ala", "a l a", "a-la"],
	["elefante", "e l e f a n t e", "e-le-fan-te"],
	["estrella", "e s t r e ll a", "es-tre-lla"],
	["escoba", "e s k o b a", "es-co-ba"],
	["isla", "i s l a", "is-la"],
	["iglú", "i g l u", "i-glú"],
	["imán", "i m a n", "i-mán"],
	["oso", "o s o", "o-so"],
	["ojo", "o j o", "o-jo"],
	["oreja", "o r e j a", "o-re-ja"],
	["uva", "u b a", "u-va"],
	["uno", "u n o", "u-no"],
	["uña", "u ñ a", "u-ña"],
	["pipa", "p i p a", "pi-pa"],
];

export const pictures: Item[] = RAW.map(([word, phonemes, syllables]) => ({
	id: pictureId(word),
	kind: "picture",
	text: word,
	phonemes: phonemes.split(" "),
	audioKey: `word:${word}`,
	imageKey: `img:${word}`,
	syllables: syllables.split("-"),
}));

export function picturesByInitialPhoneme(phoneme: string): Item[] {
	return pictures.filter((picture) => picture.phonemes[0] === phoneme);
}
