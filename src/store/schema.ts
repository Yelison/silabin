import { z } from "zod";
import type { Counters, ItemProgress, UnitProgress } from "@/engine/types";
import { emptyProgressState } from "@/engine/types";

export const CURRENT_VERSION = 1;

const starsSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
]);

export const settingsSchema = z.object({
	accent: z.enum(["do", "mx", "neutro"]),
	lowercaseTracing: z.boolean(),
	sessionLength: z.union([z.literal(5), z.literal(6)]),
	speechMode: z.enum(["auto", "parent"]),
	reducedCelebrations: z.boolean(),
	childName: z.string().nullable(),
	pinHash: z.string().nullable(),
});
export type Settings = z.infer<typeof settingsSchema>;

// El `satisfies` ata este esquema a ItemProgress de @/engine/types: si un campo
// se borra o cambia de tipo en cualquiera de los dos lados, el compilador falla
// aquí mismo en vez de dejar que el esquema y el tipo del motor se desincronicen
// en silencio. Es de un solo sentido: detecta un campo que falte (o que cambie
// de tipo), pero no un campo de más en el esquema ni uno quitado de ItemProgress
// que el esquema todavía declare.
const itemProgressSchema = z.object({
	box: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
	presented: z.boolean(),
	firstTryCorrect: z.number().int().min(0),
	assisted: z.number().int().min(0),
	lastSessionIndex: z.number().int(),
	lastCreditSession: z.number().int().nullable(),
	masteredAt: z.string().nullable(),
}) satisfies z.ZodType<ItemProgress>;

// Misma ata para UnitProgress. Ver el comentario sobre itemProgressSchema.
const unitProgressSchema = z.object({
	status: z.enum(["locked", "active", "done"]),
	bestStars: starsSchema,
}) satisfies z.ZodType<UnitProgress>;

export const sessionRecordSchema = z.object({
	index: z.number().int().min(0),
	unitId: z.string().min(1),
	stars: starsSchema,
	endedAt: z.string().min(1),
});
export type SessionRecord = z.infer<typeof sessionRecordSchema>;

export const rewardStateSchema = z.object({
	unlockedAt: z.record(z.string(), z.string()),
	equipped: z.object({
		background: z.string().nullable(),
		companion: z.string().nullable(),
		trail: z.string().nullable(),
	}),
});
export type RewardState = z.infer<typeof rewardStateSchema>;

// Misma ata para Counters. Ver el comentario sobre itemProgressSchema.
const countersSchema = z.object({
	traces: z.number().int().min(0),
	sessions: z.number().int().min(0),
	voiceOk: z.number().int().min(0),
	wordsRead: z.number().int().min(0),
}) satisfies z.ZodType<Counters>;

export const persistedStateSchema = z.object({
	version: z.literal(CURRENT_VERSION),
	settings: settingsSchema,
	items: z.record(z.string(), itemProgressSchema),
	units: z.record(z.string(), unitProgressSchema),
	sessionCounter: z.number().int().min(0),
	counters: countersSchema,
	sessions: z.array(sessionRecordSchema),
	rewards: rewardStateSchema,
});
export type PersistedState = z.infer<typeof persistedStateSchema>;

export function emptyPersistedState(): PersistedState {
	return {
		version: CURRENT_VERSION,
		settings: {
			accent: "neutro",
			lowercaseTracing: false,
			sessionLength: 5,
			// Hasta que existan Azure y la API del navegador, el adulto es el evaluador real.
			speechMode: "parent",
			reducedCelebrations: false,
			childName: null,
			pinHash: null,
		},
		// El spread va después de settings a propósito: si algún día ProgressState gana una clave
		// llamada settings, este orden la dejaría ganar. No reordenar sin revisar el esquema.
		...emptyProgressState(),
		sessions: [],
		rewards: {
			unlockedAt: {},
			equipped: { background: null, companion: null, trail: null },
		},
	};
}

/**
 * Lleva cualquier documento leído del disco a la versión actual.
 * Si no se puede, devuelve un estado vacío y avisa con recovered en true,
 * para que la interfaz pueda ofrecer restaurar desde una exportación.
 */
export function migrate(raw: unknown): {
	state: PersistedState;
	recovered: boolean;
} {
	const parsed = persistedStateSchema.safeParse(raw);
	if (parsed.success) return { state: parsed.data, recovered: false };

	// Punto de extensión: cuando exista la versión 2, aquí se transformará una v1 en v2
	// antes de volver a validar. Mientras solo hay una versión, cualquier fallo se recupera.
	return { state: emptyPersistedState(), recovered: true };
}
