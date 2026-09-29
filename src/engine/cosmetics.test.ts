import { describe, expect, it } from "vitest";
import {
	COSMETICS,
	type CosmeticSlot,
	canEquip,
	cosmeticsFor,
	DEFAULT_COSMETICS,
	isUnlocked,
	resolveEquipped,
	wearsCap,
} from "@/engine/cosmetics";
import { REWARDS } from "@/engine/rewards";

function equippedOf(overrides: Partial<Record<CosmeticSlot, string | null>>) {
	return {
		background: overrides.background ?? null,
		companion: overrides.companion ?? null,
		trail: overrides.trail ?? null,
	};
}

describe("K1 resolveEquipped", () => {
	it("con todo null devuelve los tres cosméticos por defecto", () => {
		const result = resolveEquipped({
			unlockedAt: {},
			equipped: equippedOf({}),
		});
		expect(result).toEqual(DEFAULT_COSMETICS);
	});

	it("bg:pradera con first-session desbloqueado se resuelve a bg:pradera", () => {
		const result = resolveEquipped({
			unlockedAt: { "first-session": "2026-01-01" },
			equipped: equippedOf({ background: "bg:pradera" }),
		});
		expect(result.background).toBe("bg:pradera");
	});

	it("bg:pradera sin desbloquear cae al fondo por defecto", () => {
		const result = resolveEquipped({
			unlockedAt: {},
			equipped: equippedOf({ background: "bg:pradera" }),
		});
		expect(result.background).toBe("bg:default");
	});

	it("un id desconocido cae al fondo por defecto", () => {
		const result = resolveEquipped({
			unlockedAt: { "first-session": "2026-01-01" },
			equipped: equippedOf({ background: "bg:luna" }),
		});
		expect(result.background).toBe("bg:default");
	});

	it("un id de otra ranura en background cae al fondo por defecto", () => {
		const result = resolveEquipped({
			unlockedAt: { "word-reader": "2026-01-01" },
			equipped: equippedOf({ background: "trail:burbujas" }),
		});
		expect(result.background).toBe("bg:default");
	});
});

describe("K2 canEquip", () => {
	it("desbloqueado devuelve true", () => {
		expect(canEquip("bg:pradera", { "first-session": "2026-01-01" })).toBe(
			true,
		);
	});

	it("bloqueado devuelve false", () => {
		expect(canEquip("bg:pradera", {})).toBe(false);
	});

	it("un id desconocido devuelve false", () => {
		expect(canEquip("bg:luna", { "first-session": "2026-01-01" })).toBe(false);
	});

	it("los cosméticos por defecto siempre son equipables", () => {
		expect(canEquip("bg:default", {})).toBe(true);
		expect(canEquip("companion:first", {})).toBe(true);
		expect(canEquip("trail:none", {})).toBe(true);
	});
});

describe("K3 cosmeticsFor", () => {
	it("devuelve los de trail en orden del catálogo con unlocked calculado", () => {
		const result = cosmeticsFor("trail", { "word-reader": "2026-01-01" });
		expect(result.map((c) => c.id)).toEqual([
			"trail:none",
			"trail:estrellitas",
			"trail:burbujas",
		]);
		expect(result.map((c) => c.unlocked)).toEqual([true, false, true]);
	});
});

describe("K4 catálogo", () => {
	it("cada rewardId no nulo existe en REWARDS", () => {
		const rewardIds = new Set(REWARDS.map((r) => r.id));
		for (const cosmetic of COSMETICS) {
			if (cosmetic.rewardId !== null) {
				expect(rewardIds.has(cosmetic.rewardId)).toBe(true);
			}
		}
	});

	it("hay exactamente un cosmético por defecto por ranura", () => {
		const slots: CosmeticSlot[] = ["background", "companion", "trail"];
		for (const slot of slots) {
			const defaults = COSMETICS.filter(
				(c) => c.slot === slot && c.rewardId === null,
			);
			expect(defaults).toHaveLength(1);
		}
	});

	it("DEFAULT_COSMETICS coincide con los cosméticos por defecto del catálogo", () => {
		const slots: CosmeticSlot[] = ["background", "companion", "trail"];
		for (const slot of slots) {
			const defaultCosmetic = COSMETICS.find(
				(c) => c.slot === slot && c.rewardId === null,
			);
			expect(DEFAULT_COSMETICS[slot]).toBe(defaultCosmetic?.id);
		}
	});

	it("los ids del catálogo son únicos", () => {
		const ids = COSMETICS.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("K5 wearsCap", () => {
	it("con ten-sessions desbloqueado devuelve true", () => {
		expect(wearsCap({ "ten-sessions": "2026-01-01" })).toBe(true);
	});

	it("sin ten-sessions devuelve false", () => {
		expect(wearsCap({})).toBe(false);
	});
});

describe("isUnlocked", () => {
	it("un cosmético sin rewardId siempre está desbloqueado", () => {
		const cosmetic = COSMETICS.find((c) => c.id === "bg:default");
		expect(cosmetic).toBeDefined();
		if (cosmetic === undefined) return;
		expect(isUnlocked(cosmetic, {})).toBe(true);
	});
});
