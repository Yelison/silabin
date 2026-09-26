export type { CurriculumIndex } from "@/content/index";
export { curriculum } from "@/content/index";
export type { HintStep, TemplateId } from "@/content/templates";
export { templates } from "@/content/templates";
export type { Item, Unit } from "@/content/types";
export {
	applyPresentation,
	applyResolution,
	applySessionEnd,
} from "@/engine/apply";
export type {
	AttemptOutcome,
	AttemptState,
	AttemptStep,
} from "@/engine/attempts";
export { createAttemptState, recordAttempt } from "@/engine/attempts";
export type { DistractorLevel } from "@/engine/distractors";
export { LETTER_SHAPE_GROUPS, pickDistractors } from "@/engine/distractors";
export { BOX_INTERVALS, isDue, sessionsUntilDue } from "@/engine/leitner";
export {
	isMastered,
	isUnitComplete,
	itemProgressOf,
	UNIT_COMPLETION_THRESHOLD,
} from "@/engine/mastery";
export { MAX_PRESENTATIONS, planSession } from "@/engine/planner";
export type { Rng } from "@/engine/random";
export type { Reward, RewardContext, RewardKind } from "@/engine/rewards";
export {
	earnedRewardIds,
	newlyEarnedRewardIds,
	REWARDS,
	STAR_MILESTONES,
	totalStars,
} from "@/engine/rewards";
export type {
	AttemptFeedback,
	SessionRun,
	SessionSummary,
} from "@/engine/session";
export {
	checkAnswer,
	completePresentation,
	currentExercise,
	finishSession,
	isSessionOver,
	nextExercise,
	startSession,
	submitAnswer,
} from "@/engine/session";
export { firstTryRatio, starsForSession } from "@/engine/stars";
export type {
	Box,
	Counters,
	ExerciseResolution,
	ItemProgress,
	PlannedExercise,
	ProgressState,
	SessionLogEntry,
	Stars,
	UnitProgress,
	UnitStatus,
} from "@/engine/types";
export { emptyItemProgress, emptyProgressState } from "@/engine/types";
export { activeUnitId, recomputeUnitStatuses } from "@/engine/unlock";
