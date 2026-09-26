import { z } from "zod";
import type {
	Counters,
	ItemProgress,
	SessionLogEntry,
	UnitProgress,
} from "@/engine/types";
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

// unitId es null en una sesión de solo repaso. Ensanchar el campo no invalida documentos v1
// (todos traen un id), así que no hay migración. Misma ata que itemProgressSchema.
export const sessionRecordSchema = z.object({
	index: z.number().int().min(0),
	unitId: z.string().min(1).nullable(),
	stars: starsSchema,
	endedAt: z.string().min(1),
}) satisfies z.ZodType<SessionLogEntry>;
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

/** Cualquier objeto leído del disco, con sus claves todavía sin validar. */
const documentoSinValidar = z.record(z.string(), z.unknown());

/** Lo que valide, y si no, lo que se pasa por omisión. */
function rescatar<T>(schema: z.ZodType<T>, valor: unknown, porOmision: T): T {
	const parsed = schema.safeParse(valor);
	return parsed.success ? parsed.data : porOmision;
}

/**
 * Rescata un diccionario entrada a entrada: una entrada corrupta se descarta sola, sin
 * arrastrar a las demás. Es la diferencia entre perder el progreso de una letra y perder
 * el de todas. Se usa Object.fromEntries y no la asignación por índice porque define las
 * claves en vez de asignarlas, y así una clave "__proto__" guardada en el disco es un dato
 * más y no toca el prototipo del objeto que se devuelve.
 */
function rescatarEntradas<T>(
	schema: z.ZodType<T>,
	valor: unknown,
): Record<string, T> {
	const entradas = documentoSinValidar.safeParse(valor);
	if (!entradas.success) return {};
	return Object.fromEntries(
		Object.entries(entradas.data).flatMap(([clave, dato]) => {
			const parsed = schema.safeParse(dato);
			return parsed.success ? [[clave, parsed.data] as const] : [];
		}),
	);
}

/**
 * Lleva cualquier documento leído del disco a la versión actual.
 *
 * Si el documento no valida entero, se rescata clave por clave: se conserva lo que valida y
 * solo se repone por omisión lo que no. Una sola clave corrupta y ajena al progreso —por
 * ejemplo settings.pinHash— ya no cuesta ni una estrella, ni un ítem dominado, ni un premio.
 * Dentro de items y de units el descarte es entrada a entrada, no por bloque.
 *
 * Antes se descartaba el documento entero, con el argumento de que la interfaz ofrecería
 * restaurar desde una exportación. Pero la exportación vive en el panel de padres, que llega
 * en el Plan 6, mientras que los datos empiezan a acumularse en el Plan 2: serían tres planes
 * enteros en los que un niño acumula meses de progreso sin ninguna forma de exportarlo. Y la
 * spec:328 pide "restaurar desde exportación o reiniciar", de lo que solo existe reiniciar.
 * Tirarlo todo por una clave ajena contradice además la promesa de "sin castigos: nada resta
 * estrellas, dominio ni progreso".
 *
 * recovered sigue siendo true en cuanto hubo que reponer algo, para que la interfaz avise.
 */
export function migrate(raw: unknown): {
	state: PersistedState;
	recovered: boolean;
} {
	const parsed = persistedStateSchema.safeParse(raw);
	if (parsed.success) return { state: parsed.data, recovered: false };

	const porOmision = emptyPersistedState();
	// Basura sin remedio: null, un número, una cadena o un array no tienen claves que mirar.
	const documento = documentoSinValidar.safeParse(raw);
	if (!documento.success) return { state: porOmision, recovered: true };
	const doc = documento.data;

	// Punto de extensión: cuando exista la versión 2, aquí se transformará una v1 en v2 antes
	// de rescatar. Mientras solo hay una versión, el documento se rescata tal cual y la versión
	// se escribe a la actual: llegar aquí ya significa que algo hubo que reponer.
	return {
		state: {
			version: CURRENT_VERSION,
			settings: rescatar(settingsSchema, doc.settings, porOmision.settings),
			items: rescatarEntradas(itemProgressSchema, doc.items),
			units: rescatarEntradas(unitProgressSchema, doc.units),
			sessionCounter: rescatar(
				z.number().int().min(0),
				doc.sessionCounter,
				porOmision.sessionCounter,
			),
			counters: rescatar(countersSchema, doc.counters, porOmision.counters),
			sessions: rescatar(
				z.array(sessionRecordSchema),
				doc.sessions,
				porOmision.sessions,
			),
			rewards: rescatar(rewardStateSchema, doc.rewards, porOmision.rewards),
		},
		recovered: true,
	};
}
