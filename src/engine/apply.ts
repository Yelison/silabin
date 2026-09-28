import type { CurriculumIndex } from "@/content/index";
import type { ItemKind } from "@/content/kinds";
import type { TemplateId } from "@/content/templates";
import { demote, promote } from "@/engine/leitner";
import { isMastered, itemProgressOf } from "@/engine/mastery";
import type {
	ExerciseResolution,
	ItemProgress,
	ProgressState,
	Stars,
} from "@/engine/types";
import { recomputeUnitStatuses } from "@/engine/unlock";

export function applyPresentation(
	state: ProgressState,
	itemId: string,
	sessionIndex: number,
): ProgressState {
	const current = itemProgressOf(state, itemId);
	const next: ItemProgress = {
		...current,
		presented: true,
		lastSessionIndex: sessionIndex,
	};
	return { ...state, items: { ...state.items, [itemId]: next } };
}

function bumpCounters(
	state: ProgressState,
	templateId: TemplateId,
	itemKind: ItemKind,
	resolution: ExerciseResolution,
): ProgressState["counters"] {
	const counters = { ...state.counters };
	const succeeded = resolution.status !== "assisted";

	if (templateId === "trace") counters.traces += 1;
	if ((templateId === "say-it" || templateId === "read-word") && succeeded)
		counters.voiceOk += 1;
	if (templateId === "say-it" && itemKind === "syllable" && succeeded)
		counters.syllablesVoiced += 1;
	if (templateId === "read-word" && succeeded) counters.wordsRead += 1;

	return counters;
}

export function applyResolution(input: {
	content: CurriculumIndex;
	state: ProgressState;
	itemId: string;
	templateId: TemplateId;
	resolution: ExerciseResolution;
	sessionIndex: number;
	now: string;
}): ProgressState {
	const { content, state, itemId, templateId, resolution, sessionIndex, now } =
		input;
	const item = content.items.get(itemId);
	if (item === undefined) throw new Error(`Ítem desconocido: ${itemId}`);

	const current = itemProgressOf(state, itemId);
	const next: ItemProgress = {
		...current,
		presented: true,
		lastSessionIndex: sessionIndex,
	};

	if (resolution.status === "mastery-credit") {
		const alreadyCredited = current.lastCreditSession === sessionIndex;
		if (!alreadyCredited) {
			next.firstTryCorrect = current.firstTryCorrect + 1;
			next.lastCreditSession = sessionIndex;
			next.box = promote(current.box);
		}
	} else {
		if (resolution.status === "assisted") next.assisted = current.assisted + 1;
		next.box = demote(current.box);
	}

	if (next.masteredAt === null && isMastered(next)) next.masteredAt = now;

	const withItem: ProgressState = {
		...state,
		items: { ...state.items, [itemId]: next },
		counters: bumpCounters(state, templateId, item.kind, resolution),
	};

	return { ...withItem, units: recomputeUnitStatuses(content, withItem) };
}

export function applySessionEnd(input: {
	content: CurriculumIndex;
	state: ProgressState;
	/** Null en una sesión de solo repaso: cuenta la sesión pero no toca ninguna mejor marca. */
	unitId: string | null;
	stars: Stars;
}): ProgressState {
	const { content, state, unitId, stars } = input;

	const withSession: ProgressState = {
		...state,
		sessionCounter: state.sessionCounter + 1,
		counters: { ...state.counters, sessions: state.counters.sessions + 1 },
	};

	const units = recomputeUnitStatuses(content, withSession);
	const previous = unitId === null ? undefined : units[unitId];
	if (unitId !== null && previous !== undefined) {
		units[unitId] = {
			status: previous.status,
			bestStars: Math.max(previous.bestStars, stars) as Stars,
		};
	}

	return { ...withSession, units };
}
