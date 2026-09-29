import type { Art } from "@/components/ArtImage";
import { REWARDS, STAR_MILESTONES } from "@/engine";

/**
 * Traduce un id de cosmético o de logro a algo que se ve. Es el único sitio que lo hace (S21):
 * cada pieza es una imagen de `public/images/arte/` con su respaldo —el degradado con tokens
 * para los fondos, el emoji para el resto (V7)—, así que ninguna vista se queda vacía si el
 * fichero no carga.
 */

export type CosmeticVisual =
	| { slot: "background"; src: string; gradient: string }
	| { slot: "companion"; art: Art; withCap: Art }
	| { slot: "trail"; particle: Art | null; cursor: string | null };

const arte = (nombre: string) => `/images/arte/${nombre}.webp`;
const pieza = (nombre: string, emoji: string): Art => ({
	src: arte(nombre),
	emoji,
});
const fondo = (nombre: string, gradient: string): CosmeticVisual => ({
	slot: "background",
	src: arte(nombre),
	gradient,
});
const companero = (
	nombre: string,
	emoji: string,
): Extract<CosmeticVisual, { slot: "companion" }> => ({
	slot: "companion",
	art: pieza(nombre, emoji),
	withCap: pieza(`${nombre}-gorra`, emoji),
});
const rastro = (
	nombre: string,
	emoji: string,
): Extract<CosmeticVisual, { slot: "trail" }> => ({
	slot: "trail",
	particle: pieza(`particle-${nombre}`, emoji),
	cursor: `/icons/cursor-${nombre}.png`,
});

const COSMETIC_VISUALS: Record<string, CosmeticVisual> = {
	"bg:default": fondo("bg-default", "from-surface to-calm"),
	"bg:pradera": fondo("bg-pradera", "from-calm to-action"),
	"bg:espacio": fondo("bg-espacio", "from-ink to-calm-border"),
	"bg:bosque": fondo("bg-bosque", "from-calm-border to-mark"),
	"companion:first": companero("companion-1", "🐣"),
	"companion:second": companero("companion-2", "🦊"),
	"trail:none": { slot: "trail", particle: null, cursor: null },
	"trail:estrellitas": rastro("estrellita", "✨"),
	"trail:burbujas": rastro("burbuja", "🫧"),
};

/**
 * Cada logro pinta la pieza que desbloquea (V8). El respaldo nunca es una letra ni una cifra:
 * el niño lee sonidos, no nombres (por eso `vowel-a` es un avión y no una 🅰️).
 */
const REWARD_ART: Record<string, Art> = {
	"first-session": pieza("bg-pradera", "🌄"),
	"vowel-a": pieza("sticker-avion", "✈️"),
	"five-vowels": pieza("companion-2", "🦊"),
	"first-syllable-voice": pieza("particle-estrellita", "✨"),
	"steady-hand": pieza("bg-espacio", "🌌"),
	"ten-sessions": pieza("companion-1-gorra", "🧢"),
	"word-reader": pieza("particle-burbuja", "🫧"),
	"phase2-done": pieza("trophy", "🏆"),
	...Object.fromEntries(
		STAR_MILESTONES.map(
			(threshold) =>
				[`stars:${threshold}`, pieza(`sticker-${threshold}`, "🌟")] as const,
		),
	),
};

/** `true` si `id` (de cosmético o de logro) tiene una entrada aquí. */
export function hasVisual(id: string): boolean {
	return Object.hasOwn(COSMETIC_VISUALS, id) || Object.hasOwn(REWARD_ART, id);
}

/**
 * La imagen y el respaldo de un cosmético. Cae a `bg:default` para un id que no tenga entrada: no debería
 * pasar con los ids de `COSMETICS`, pero una vista nunca debe quedarse sin nada que pintar.
 */
export function cosmeticVisual(cosmeticId: string): CosmeticVisual {
	return (
		COSMETIC_VISUALS[cosmeticId] ?? fondo("bg-default", "from-surface to-calm")
	);
}

/** La pieza de un logro del álbum. Cae a una medalla sin imagen si el id no tiene entrada. */
export function rewardArt(rewardId: string): Art {
	return Object.hasOwn(REWARD_ART, rewardId)
		? (REWARD_ART[rewardId] as Art)
		: { src: "", emoji: "🏅" };
}

/** El nombre para mostrar de un cosmético: el de su logro si lo tiene, o uno por omisión. */
const DEFAULT_COSMETIC_LABELS: Record<string, string> = {
	"bg:default": "Fondo clásico",
	"companion:first": "Compañero inicial",
	"trail:none": "Sin rastro",
};

export function cosmeticLabel(
	cosmeticId: string,
	rewardId: string | null,
): string {
	if (rewardId !== null) {
		const reward = REWARDS.find((r) => r.id === rewardId);
		if (reward !== undefined) return reward.name;
	}
	return DEFAULT_COSMETIC_LABELS[cosmeticId] ?? cosmeticId;
}
