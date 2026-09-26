import { pictureId, pictures } from "@/content/pictures";
import type { Item, Unit } from "@/content/types";

function syllablesOf(word: string): string[] {
	const picture = pictures.find((p) => p.id === pictureId(word));
	return picture?.syllables ?? [];
}

const CLAP_WORDS = [
	"sol",
	"pan",
	"mesa",
	"casa",
	"gato",
	"mano",
	"pelota",
	"banana",
	"tomate",
];

// Las sílabas viajan con el ítem para que la interfaz pueda dar las pistas (una palmada por
// sílaba) sin decidir nada: la respuesta sigue siendo su cantidad.
const clapItems: Item[] = CLAP_WORDS.map((word) => {
	const syllables = syllablesOf(word);
	return {
		id: `oral:clap:${word}`,
		kind: "oral-skill",
		text: word,
		phonemes: [],
		audioKey: `word:${word}`,
		imageKey: `img:${word}`,
		syllables,
		task: { answer: String(syllables.length) },
	};
});

/** [objetivo, palabra que rima, distractor que no rima] */
const RHYME_TRIOS: [string, string, string][] = [
	["gato", "pato", "mesa"],
	["casa", "masa", "sol"],
	["luna", "cuna", "gato"],
	["ratón", "limón", "casa"],
	["sopa", "copa", "luna"],
	["pelo", "velo", "pan"],
];

const rhymeItems: Item[] = RHYME_TRIOS.map(([target, rhymes, distractor]) => ({
	id: `oral:rhyme:${target}`,
	kind: "oral-skill",
	text: target,
	phonemes: [],
	audioKey: `word:${target}`,
	imageKey: `img:${target}`,
	task: {
		answer: pictureId(rhymes),
		optionIds: [pictureId(rhymes), pictureId(distractor)],
	},
}));

/** [imagen, fonema inicial, dos imágenes que empiezan por otro sonido] */
const INITIAL_TRIOS: [string, string, [string, string]][] = [
	["avión", "a", ["oso", "uva"]],
	["árbol", "a", ["imán", "uno"]],
	["elefante", "e", ["ala", "ojo"]],
	["estrella", "e", ["uva", "isla"]],
	["isla", "i", ["oso", "ala"]],
	["iglú", "i", ["uno", "escoba"]],
	["oso", "o", ["avión", "uña"]],
	["ojo", "o", ["iglú", "elefante"]],
	["uva", "u", ["ala", "oreja"]],
	["uno", "u", ["isla", "árbol"]],
];

const initialItems: Item[] = INITIAL_TRIOS.map(([word, phoneme, others]) => ({
	id: `oral:initial:${word}`,
	kind: "oral-skill",
	text: word,
	phonemes: [],
	audioKey: `phoneme:${phoneme}`,
	task: {
		answer: pictureId(word),
		optionIds: [pictureId(word), pictureId(others[0]), pictureId(others[1])],
	},
}));

/** [fonema, palabra, lo contiene] */
const HEAR_TRIPLES: [string, string, boolean][] = [
	["a", "pato", true],
	["a", "sol", false],
	["o", "oso", true],
	["i", "mesa", false],
	["e", "mesa", true],
	["u", "luna", true],
	["o", "pan", false],
	["i", "pipa", true],
];

const hearItems: Item[] = HEAR_TRIPLES.map(([phoneme, word, present]) => ({
	id: `oral:hear:${phoneme}-${word}`,
	kind: "oral-skill",
	text: word,
	phonemes: [],
	audioKey: `instruction:hear:${phoneme}-${word}`,
	imageKey: `img:${word}`,
	// Como en clapItems: viajan con el ítem para la pista "despacio", sin que la interfaz
	// tenga que decidir nada.
	syllables: syllablesOf(word),
	task: { answer: present ? "si" : "no" },
}));

export const phase0Items: Item[] = [
	...clapItems,
	...rhymeItems,
	...initialItems,
	...hearItems,
];

export const phase0Units: Unit[] = [
	{
		id: "phase0:clap",
		phase: 0,
		title: "Palabras con palmas",
		audioKey: "unit:phase0:clap",
		requires: [],
		introduces: clapItems.map((i) => i.id),
		exercises: [{ templateId: "count-syllables", weight: 1 }],
	},
	{
		id: "phase0:rhyme",
		phase: 0,
		title: "Rimas saltarinas",
		audioKey: "unit:phase0:rhyme",
		requires: ["phase0:clap"],
		introduces: rhymeItems.map((i) => i.id),
		exercises: [{ templateId: "rhyme", weight: 1 }],
	},
	{
		id: "phase0:initial",
		phase: 0,
		title: "Detectives de sonidos",
		audioKey: "unit:phase0:initial",
		requires: ["phase0:rhyme"],
		introduces: initialItems.map((i) => i.id),
		exercises: [{ templateId: "initial-sound", weight: 1 }],
	},
	{
		id: "phase0:hear-it",
		phase: 0,
		title: "¿Lo oyes?",
		audioKey: "unit:phase0:hear-it",
		requires: ["phase0:initial"],
		introduces: hearItems.map((i) => i.id),
		exercises: [{ templateId: "hear-it", weight: 1 }],
	},
];
