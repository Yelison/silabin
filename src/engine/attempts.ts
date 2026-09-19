import { type HintStep, type TemplateId, templates } from "@/content/templates";
import type { ExerciseResolution } from "@/engine/types";

export type AttemptState = {
	attempt: 1 | 2 | 3;
	hintsShown: 0 | 1 | 2 | 3;
	resolved: boolean;
};
export type AttemptOutcome = "correct" | "wrong";
export type AttemptStep = {
	state: AttemptState;
	hint: HintStep | null;
	resolution: ExerciseResolution | null;
};

export function createAttemptState(): AttemptState {
	return { attempt: 1, hintsShown: 0, resolved: false };
}

export function recordAttempt(
	templateId: TemplateId,
	state: AttemptState,
	outcome: AttemptOutcome,
): AttemptStep {
	if (state.resolved) {
		throw new Error(
			"El ejercicio ya está resuelto: no se pueden registrar más intentos",
		);
	}

	const hints = templates[templateId].hints;

	if (outcome === "correct") {
		const resolution: ExerciseResolution =
			state.attempt === 1
				? { status: "mastery-credit" }
				: {
						status: "correct-with-hint",
						hintsUsed: state.attempt === 2 ? 1 : 2,
					};
		return { state: { ...state, resolved: true }, hint: null, resolution };
	}

	if (state.attempt === 3) {
		const model = hints[2];
		return {
			state: { attempt: 3, hintsShown: 3, resolved: true },
			hint: model,
			resolution: { status: "assisted" },
		};
	}

	const nextAttempt = (state.attempt + 1) as 2 | 3;
	const hint = hints[state.attempt - 1];
	if (hint === undefined)
		throw new Error(
			`La plantilla ${templateId} no define la pista ${state.attempt}`,
		);
	return {
		state: {
			attempt: nextAttempt,
			hintsShown: state.attempt as 1 | 2,
			resolved: false,
		},
		hint,
		resolution: null,
	};
}
