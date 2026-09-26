export type PictureImage = { emoji: string; alt: string };

/**
 * Imagen provisional: un emoji por palabra, hasta que haya ilustraciones reales.
 * Cubre las 35 palabras de `pictures.ts` y las palabras de la fase 2. Las palabras
 * abstractas (ama, amo, eso, uso…) llevan un emoji aproximado; se sustituirán con el resto.
 */
const EMOJI: Record<string, string> = {
	// pictures.ts
	sol: "☀️",
	pan: "🍞",
	mesa: "🪑",
	casa: "🏠",
	gato: "🐱",
	mano: "✋",
	pelota: "⚽",
	banana: "🍌",
	tomate: "🍅",
	pato: "🦆",
	masa: "🫓",
	luna: "🌙",
	cuna: "🛏️",
	ratón: "🐭",
	limón: "🍋",
	sopa: "🍲",
	copa: "🍷",
	pelo: "💇",
	velo: "👰",
	avión: "✈️",
	árbol: "🌳",
	ala: "🪽",
	elefante: "🐘",
	estrella: "⭐",
	escoba: "🧹",
	isla: "🏝️",
	iglú: "🛖",
	imán: "🧲",
	oso: "🐻",
	ojo: "👁️",
	oreja: "👂",
	uva: "🍇",
	uno: "1️⃣",
	uña: "💅",
	pipa: "🍼",
	// fase 2
	mama: "👩",
	mimo: "🤗",
	mima: "🥰",
	ama: "❤️",
	amo: "💕",
	lima: "🍈",
	loma: "⛰️",
	mula: "🫏",
	mala: "👎",
	malo: "😠",
	lelo: "🥴",
	ola: "🌊",
	misa: "⛪",
	suma: "➕",
	sumo: "🧮",
	sola: "🧍",
	sala: "🛋️",
	uso: "🖐️",
	eso: "👉",
	asa: "🫖",
	papa: "🥔",
	mapa: "🗺️",
	sapo: "🐸",
	pesa: "🏋️",
	puma: "🐆",
	pala: "⛏️",
	polo: "👕",
	lupa: "🔍",
	paso: "👣",
	piso: "🏢",
};

const PREFIX = "img:";

export function imageFor(imageKey: string): PictureImage | null {
	if (!imageKey.startsWith(PREFIX)) return null;
	const word = imageKey.slice(PREFIX.length);
	if (!Object.hasOwn(EMOJI, word)) return null;
	const emoji = EMOJI[word];
	if (emoji === undefined) return null;
	return { emoji, alt: word };
}
