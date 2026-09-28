import type { Item } from "@/engine";
import type { SpeechLang, SpeechTarget } from "@/speech/types";

/** P14: solo hay voces `es-MX` y `es-US` fiables; el acento dominicano se reconoce como `es-US`. */
const LANG: Record<"do" | "mx" | "neutro", SpeechLang> = {
	do: "es-US",
	mx: "es-MX",
	neutro: "es-US",
};

export function speechTarget(
	item: Item,
	accent: "do" | "mx" | "neutro",
): SpeechTarget {
	return { text: item.text, phonemes: [...item.phonemes], lang: LANG[accent] };
}
