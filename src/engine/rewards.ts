import type { CurriculumIndex } from "@/content/index";
import { isMastered, itemProgressOf } from "@/engine/mastery";
import type { ProgressState } from "@/engine/types";

export type RewardKind =
	| "badge"
	| "background"
	| "companion"
	| "trail"
	| "sticker"
	| "trophy";

export type RewardContext = {
	content: CurriculumIndex;
	state: ProgressState;
	totalStars: number;
};

export type Reward = {
	id: string;
	name: string;
	kind: RewardKind;
	/** Cómo se consigue, en texto para el adulto. */
	requirement: string;
	isEarned(ctx: RewardContext): boolean;
};

export const STAR_MILESTONES = [10, 25, 50, 100];

const VOWEL_LETTERS = [
	"letter:a",
	"letter:e",
	"letter:o",
	"letter:i",
	"letter:u",
];
const PHASE2_UNITS = ["phase2:m", "phase2:l", "phase2:s", "phase2:p"];

export function totalStars(state: ProgressState): number {
	return Object.values(state.units).reduce(
		(sum, unit) => sum + unit.bestStars,
		0,
	);
}

const BASE_REWARDS: Reward[] = [
	{
		id: "first-session",
		name: "Pradera",
		kind: "background",
		requirement: "Completar la primera sesión.",
		isEarned: ({ state }) => state.counters.sessions >= 1,
	},
	{
		id: "vowel-a",
		name: "A de avión",
		kind: "sticker",
		requirement: "Dominar la vocal a.",
		isEarned: ({ state }) => isMastered(itemProgressOf(state, "letter:a")),
	},
	{
		id: "five-vowels",
		name: "Compañero nuevo",
		kind: "companion",
		requirement: "Dominar las cinco vocales.",
		isEarned: ({ state }) =>
			VOWEL_LETTERS.every((id) => isMastered(itemProgressOf(state, id))),
	},
	{
		id: "first-syllable-voice",
		name: "Estrellitas",
		kind: "trail",
		requirement: "Decir una sílaba en voz alta correctamente por primera vez.",
		isEarned: ({ state }) => state.counters.syllablesVoiced >= 1,
	},
	{
		id: "steady-hand",
		name: "Espacio",
		kind: "background",
		requirement: "Completar 10 trazos.",
		isEarned: ({ state }) => state.counters.traces >= 10,
	},
	{
		id: "ten-sessions",
		name: "Gorra del compañero",
		kind: "badge",
		requirement: "Completar 10 sesiones, no hace falta que sean seguidas.",
		isEarned: ({ state }) => state.counters.sessions >= 10,
	},
	{
		id: "word-reader",
		name: "Burbujas",
		kind: "trail",
		requirement: "Leer 5 palabras en voz alta.",
		isEarned: ({ state }) => state.counters.wordsRead >= 5,
	},
	{
		id: "phase2-done",
		name: "Bosque y trofeo",
		kind: "trophy",
		requirement: "Completar toda la Fase 2.",
		isEarned: ({ state }) =>
			PHASE2_UNITS.every((id) => state.units[id]?.status === "done"),
	},
];

const MILESTONE_REWARDS: Reward[] = STAR_MILESTONES.map((threshold) => ({
	id: `stars:${threshold}`,
	name: `Pegatina de ${threshold} estrellas`,
	kind: "sticker" as const,
	requirement: `Acumular ${threshold} estrellas.`,
	isEarned: ({ totalStars: stars }: RewardContext) => stars >= threshold,
}));

export const REWARDS: Reward[] = [...BASE_REWARDS, ...MILESTONE_REWARDS];

export function earnedRewardIds(ctx: RewardContext): string[] {
	return REWARDS.filter((reward) => reward.isEarned(ctx)).map(
		(reward) => reward.id,
	);
}

export function newlyEarnedRewardIds(
	alreadyUnlocked: readonly string[],
	ctx: RewardContext,
): string[] {
	const known = new Set(alreadyUnlocked);
	return earnedRewardIds(ctx).filter((id) => !known.has(id));
}
