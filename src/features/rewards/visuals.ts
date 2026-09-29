import { REWARDS, STAR_MILESTONES } from "@/engine";

/**
 * Traduce un id de cosmético o de logro a algo que se ve. Es el único sitio que lo hace (S21):
 * hoy son marcadores —degradados con tokens para los fondos, emoji para los compañeros, las
 * pegatinas y el trofeo, y una forma por rastro— y el Plan 7 cambia solo este fichero y los
 * assets, sin tocar quien lo llama.
 */

export type CosmeticVisual =
	| { slot: "background"; gradient: string }
	| { slot: "companion"; emoji: string }
	| { slot: "trail"; shape: "none" | "star" | "circle" };

const COSMETIC_VISUALS: Record<string, CosmeticVisual> = {
	"bg:default": { slot: "background", gradient: "from-surface to-calm" },
	"bg:pradera": { slot: "background", gradient: "from-calm to-action" },
	"bg:espacio": { slot: "background", gradient: "from-ink to-calm-border" },
	"bg:bosque": { slot: "background", gradient: "from-calm-border to-mark" },
	"companion:first": { slot: "companion", emoji: "🐣" },
	"companion:second": { slot: "companion", emoji: "🦊" },
	"trail:none": { slot: "trail", shape: "none" },
	"trail:estrellitas": { slot: "trail", shape: "star" },
	"trail:burbujas": { slot: "trail", shape: "circle" },
};

const REWARD_ICONS: Record<string, string> = {
	"first-session": "🌄",
	"vowel-a": "🅰️",
	"five-vowels": "🐥",
	"first-syllable-voice": "🎤",
	"steady-hand": "✍️",
	"ten-sessions": "🧢",
	"word-reader": "📖",
	"phase2-done": "🏆",
	...Object.fromEntries(
		STAR_MILESTONES.map((threshold) => [`stars:${threshold}`, "🌟"] as const),
	),
};

/** `true` si `id` (de cosmético o de logro) tiene una entrada aquí. */
export function hasVisual(id: string): boolean {
	return Object.hasOwn(COSMETIC_VISUALS, id) || Object.hasOwn(REWARD_ICONS, id);
}

/**
 * El marcador de un cosmético. Cae a `bg:default` para un id que no tenga entrada: no debería
 * pasar con los ids de `COSMETICS`, pero una vista nunca debe quedarse sin nada que pintar.
 */
export function cosmeticVisual(cosmeticId: string): CosmeticVisual {
	return (
		COSMETIC_VISUALS[cosmeticId] ?? {
			slot: "background",
			gradient: "from-surface to-calm",
		}
	);
}

/** El icono de un logro del álbum. Cae a un emoji genérico si el id no tiene entrada. */
export function rewardIcon(rewardId: string): string {
	return REWARD_ICONS[rewardId] ?? "🏅";
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
