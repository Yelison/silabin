import { phase0Items, phase0Units } from "@/content/phase0";
import { phase1Items, phase1Units } from "@/content/phase1";
import { phase2Items, phase2Units } from "@/content/phase2";
import { pictures } from "@/content/pictures";
import { templateIds } from "@/content/templates";
import type { Item, Unit } from "@/content/types";

export const ACCENTS = ["do", "mx", "neutro"] as const;
export type Accent = (typeof ACCENTS)[number];

const allItems: Item[] = [
	...pictures,
	...phase0Items,
	...phase1Items,
	...phase2Items,
];
const allUnits: Unit[] = [...phase0Units, ...phase1Units, ...phase2Units];

export function referencedAudioKeys(): Set<string> {
	return new Set([
		...allItems.map((i) => i.audioKey),
		...allUnits.map((u) => u.audioKey),
	]);
}

/** Sonido alargado de cada fonema. Las oclusivas no se alargan: se dicen una vez. */
const PHONEME_SOUND: Record<string, string> = {
	a: "aaa",
	e: "eee",
	i: "iii",
	o: "ooo",
	u: "uuu",
	m: "mmm",
	l: "lll",
	s: "sss",
	p: "p",
};

function textForKey(key: string): string {
	const [prefix, rest = ""] = [
		key.slice(0, key.indexOf(":")),
		key.slice(key.indexOf(":") + 1),
	];
	switch (prefix) {
		case "phoneme":
			return PHONEME_SOUND[rest] ?? rest;
		case "syllable":
		case "word":
			return allItems.find((i) => i.audioKey === key)?.text ?? rest;
		case "unit":
			return allUnits.find((u) => u.audioKey === key)?.title ?? rest;
		case "instruction": {
			const item = phase0Items.find((i) => i.audioKey === key);
			if (item === undefined) return rest;
			const [phoneme = "", word = ""] = rest.replace("hear:", "").split("-");
			return `¿Oyes ${PHONEME_SOUND[phoneme] ?? phoneme} en ${word}?`;
		}
		default:
			return rest;
	}
}

export const contentAudio: Record<string, string> = Object.fromEntries(
	[...referencedAudioKeys()].sort().map((key) => [key, textForKey(key)]),
);

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
	"listen-tap": "Escucha y toca la que suena.",
	"hear-it": "¿Oyes el sonido?",
	"count-syllables": "Escucha la palabra y toca una vez por cada parte.",
	rhyme: "¿Cuál suena parecido al final?",
	"initial-sound": "¿Cuál empieza con este sonido?",
	build: "Arrastra las piezas para formar la sílaba.",
	trace: "Sigue la letra con el dedo.",
	"say-it": "Toca el micrófono y dilo.",
	"read-word": "Lee la palabra en voz alta.",
};

export const uiAudio: Record<string, string> = {
	...Object.fromEntries(
		templateIds.map((id) => [
			`instruction:${id}`,
			TEMPLATE_INSTRUCTIONS[id] ?? "",
		]),
	),
	"celebrate:correct": "¡Muy bien!",
	"celebrate:session": "¡Terminaste! Mira tus estrellas.",
	"feedback:retry": "Mmm, otra vez.",
	"feedback:no-speech": "No te oí. ¿Lo dices otra vez?",
	"reward:new": "¡Ganaste un premio nuevo!",
	"ui:tap-to-start": "Toca para empezar.",
	"ui:mic-listening": "Te escucho.",
};

export const audioManifest: Record<string, string> = {
	...contentAudio,
	...uiAudio,
};

export function audioPath(key: string, accent: Accent): string {
	return `/audio/${accent}/${key.replace(/[:]/g, "_")}.m4a`;
}
