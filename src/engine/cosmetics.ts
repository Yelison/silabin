export type CosmeticSlot = "background" | "companion" | "trail";

export type Cosmetic = {
	id: string;
	slot: CosmeticSlot;
	rewardId: string | null;
};

export const COSMETICS: readonly Cosmetic[] = [
	{ id: "bg:default", slot: "background", rewardId: null },
	{ id: "bg:pradera", slot: "background", rewardId: "first-session" },
	{ id: "bg:espacio", slot: "background", rewardId: "steady-hand" },
	{ id: "bg:bosque", slot: "background", rewardId: "phase2-done" },
	{ id: "companion:first", slot: "companion", rewardId: null },
	{ id: "companion:second", slot: "companion", rewardId: "five-vowels" },
	{ id: "trail:none", slot: "trail", rewardId: null },
	{ id: "trail:estrellitas", slot: "trail", rewardId: "first-syllable-voice" },
	{ id: "trail:burbujas", slot: "trail", rewardId: "word-reader" },
];

export const DEFAULT_COSMETICS: Readonly<Record<CosmeticSlot, string>> = {
	background: "bg:default",
	companion: "companion:first",
	trail: "trail:none",
};

export type Equipped = Record<CosmeticSlot, string>;

const CAP_REWARD_ID = "ten-sessions";

/** `true` si el cosmético no requiere logro, o si el logro que requiere está desbloqueado. */
export function isUnlocked(
	cosmetic: Cosmetic,
	unlockedAt: Record<string, string>,
): boolean {
	if (cosmetic.rewardId === null) return true;
	return unlockedAt[cosmetic.rewardId] !== undefined;
}

/**
 * Siempre tres ids válidos: el guardado si existe, es de esa ranura y está desbloqueado;
 * si no, el de por defecto.
 */
export function resolveEquipped(rewards: {
	unlockedAt: Record<string, string>;
	equipped: {
		background: string | null;
		companion: string | null;
		trail: string | null;
	};
}): Equipped {
	const out = { ...DEFAULT_COSMETICS };
	for (const slot of Object.keys(DEFAULT_COSMETICS) as CosmeticSlot[]) {
		const savedId = rewards.equipped[slot];
		if (savedId === null) continue;
		const cosmetic = COSMETICS.find((c) => c.id === savedId);
		if (cosmetic === undefined) continue;
		if (cosmetic.slot !== slot) continue;
		if (!isUnlocked(cosmetic, rewards.unlockedAt)) continue;
		out[slot] = savedId;
	}
	return out;
}

/** `true` si el cosmético existe y está desbloqueado. `slot` sale del catálogo. */
export function canEquip(
	cosmeticId: string,
	unlockedAt: Record<string, string>,
): boolean {
	const cosmetic = COSMETICS.find((c) => c.id === cosmeticId);
	if (cosmetic === undefined) return false;
	return isUnlocked(cosmetic, unlockedAt);
}

/** Los de esa ranura, en el orden del catálogo, con `unlocked` calculado. */
export function cosmeticsFor(
	slot: CosmeticSlot,
	unlockedAt: Record<string, string>,
): Array<Cosmetic & { unlocked: boolean }> {
	return COSMETICS.filter((c) => c.slot === slot).map((c) => ({
		...c,
		unlocked: isUnlocked(c, unlockedAt),
	}));
}

/** La gorra de `ten-sessions` no tiene ranura (S5): el compañero la lleva si está ganada. */
export function wearsCap(unlockedAt: Record<string, string>): boolean {
	return unlockedAt[CAP_REWARD_ID] !== undefined;
}
