import {
	endingKey,
	rimeOf,
	stretchInKey,
	stretchKey,
} from "@/content/audio-keys";
import { phase0Items, phase0Units } from "@/content/phase0";
import { phase1Items, phase1Units } from "@/content/phase1";
import { phase2Items, phase2Units } from "@/content/phase2";
import { pictureId, pictures } from "@/content/pictures";
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

const rhymeItems = phase0Items.filter((i) => i.id.startsWith("oral:rhyme:"));
const hearItems = phase0Items.filter((i) => i.id.startsWith("oral:hear:"));
// Lo que evalúa listen-tap: letras, sílabas y palabras. Solo esos ítems necesitan el sonido
// alargado de su primer fonema (rung 2 de esa plantilla).
const stretchableItems = allItems.filter(
	(i) => i.kind === "letter" || i.kind === "syllable" || i.kind === "word",
);

/** `ending:<palabra>` para el objetivo y cada opción de cada ítem de rima. */
function rhymeEndingKeys(): string[] {
	const out: string[] = [];
	for (const item of rhymeItems) {
		out.push(endingKey(pictureId(item.text)));
		for (const optionId of item.task?.optionIds ?? [])
			out.push(endingKey(optionId));
	}
	return out;
}

/** `stretch-in:<fonema>-<palabra>` solo para "¿lo oyes?" cuando la respuesta es que sí está. */
function stretchInKeys(): string[] {
	return hearItems
		.filter((i) => i.task?.answer === "si")
		.map((i) => stretchInKey(i.id));
}

export function referencedAudioKeys(): Set<string> {
	return new Set([
		...allItems.map((i) => i.audioKey),
		...allUnits.map((u) => u.audioKey),
		...rhymeEndingKeys(),
		...stretchableItems.map((i) => stretchKey(i.id)),
		...stretchInKeys(),
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

/** El sonido alargado del primer fonema de un ítem, seguido del resto de su texto tal cual. */
function stretchedText(item: Item): string {
	const first = item.phonemes[0] ?? "";
	const sound = PHONEME_SOUND[first] ?? first;
	return sound + item.text.slice(1);
}

/** La palabra con la primera aparición de la vocal alargada: "a-pato" → "paaato". */
function stretchInText(rest: string): string {
	const separator = rest.indexOf("-");
	const phoneme = rest.slice(0, separator);
	const word = rest.slice(separator + 1);
	const sound = PHONEME_SOUND[phoneme] ?? phoneme;
	const index = word.indexOf(phoneme);
	if (index < 0) return word;
	return word.slice(0, index) + sound + word.slice(index + phoneme.length);
}

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
		case "ending":
			return rimeOf(rest);
		case "stretch": {
			const item = allItems.find((i) => i.id === rest);
			return item === undefined ? rest : stretchedText(item);
		}
		case "stretch-in":
			return stretchInText(rest);
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
	"ui:hear-yes": "Si lo oyes, toca aquí.",
	"ui:hear-no": "Si no lo oyes, toca aquí.",
};

export const audioManifest: Record<string, string> = {
	...contentAudio,
	...uiAudio,
};

export function audioPath(key: string, accent: Accent): string {
	return `/audio/${accent}/${key.replace(/[:]/g, "_")}.m4a`;
}
