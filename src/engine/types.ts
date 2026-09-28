import type { TemplateId } from "@/content/templates";

export type Box = 0 | 1 | 2 | 3;
export type Stars = 0 | 1 | 2 | 3;

export type ItemProgress = {
	/** 0 = aún no acertado. 1 a 3 = caja Leitner. */
	box: Box;
	/** true en cuanto el ítem se ha presentado una vez, aunque todavía no se haya acertado. */
	presented: boolean;
	/** Aciertos al primer intento, contados como máximo uno por sesión. */
	firstTryCorrect: number;
	/** Veces que se resolvió con el modelo del tercer rung. */
	assisted: number;
	lastSessionIndex: number;
	/** Última sesión que otorgó crédito de dominio, para exigir sesiones distintas. */
	lastCreditSession: number | null;
	masteredAt: string | null;
};

export type UnitStatus = "locked" | "active" | "done";
export type UnitProgress = { status: UnitStatus; bestStars: Stars };

export type Counters = {
	traces: number;
	sessions: number;
	voiceOk: number;
	wordsRead: number;
	/** Sílabas dichas con `say-it` y resueltas sin asistencia (condición de first-syllable-voice). */
	syllablesVoiced: number;
};

export type ProgressState = {
	items: Record<string, ItemProgress>;
	units: Record<string, UnitProgress>;
	sessionCounter: number;
	counters: Counters;
};

export type ExerciseResolution =
	| { status: "mastery-credit" }
	| { status: "correct-with-hint"; hintsUsed: 1 | 2 }
	| { status: "assisted" };

export type PlannedExercise = {
	/** Único dentro de la sesión. */
	id: string;
	kind: "presentation" | "evaluation";
	templateId: TemplateId;
	/** El ítem que se practica. En una presentación, el ítem que se enseña. */
	itemId: string;
	/** Opciones ya resueltas y mezcladas, incluida la correcta. Vacío en plantillas sin opciones. */
	optionIds: string[];
	/**
	 * Cuál de las opciones es la correcta. Coincide con itemId en listen-tap,
	 * pero en initial-sound la respuesta es una imagen distinta del fonema practicado.
	 * Null en las plantillas sin opciones.
	 */
	correctOptionId: string | null;
	source: "active-unit" | "review";
};

/** Una sesión terminada. `unitId` es null en una sesión de solo repaso, sin unidad activa. */
export type SessionLogEntry = {
	index: number;
	unitId: string | null;
	stars: Stars;
	endedAt: string;
};

export function emptyItemProgress(): ItemProgress {
	return {
		box: 0,
		presented: false,
		firstTryCorrect: 0,
		assisted: 0,
		lastSessionIndex: -1,
		lastCreditSession: null,
		masteredAt: null,
	};
}

export function emptyProgressState(): ProgressState {
	return {
		items: {},
		units: {},
		sessionCounter: 0,
		counters: {
			traces: 0,
			sessions: 0,
			voiceOk: 0,
			wordsRead: 0,
			syllablesVoiced: 0,
		},
	};
}
