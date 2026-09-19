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
export {
	LETTER_SHAPE_GROUPS,
	pickDistractors,
	similarity,
} from "@/engine/distractors";
export {
	BOX_INTERVALS,
	demote,
	isDue,
	promote,
	sessionsUntilDue,
} from "@/engine/leitner";
export {
	isMastered,
	isUnitComplete,
	itemProgressOf,
	MASTERY_TARGET,
	UNIT_COMPLETION_THRESHOLD,
	unitMasteryRatio,
} from "@/engine/mastery";
export {
	MAX_PRESENTATIONS,
	owningUnits,
	planSession,
	REVIEW_SHARE,
} from "@/engine/planner";
export type { Rng } from "@/engine/random";
export { createRng } from "@/engine/random";
export type { Reward, RewardContext, RewardKind } from "@/engine/rewards";
export {
	earnedRewardIds,
	newlyEarnedRewardIds,
	REWARDS,
	STAR_MILESTONES,
	totalStars,
} from "@/engine/rewards";
export { firstTryRatio, starsForSession } from "@/engine/stars";
export type {
	Box,
	Counters,
	ExerciseResolution,
	ItemProgress,
	PlannedExercise,
	ProgressState,
	Stars,
	UnitProgress,
	UnitStatus,
} from "@/engine/types";
export { emptyItemProgress, emptyProgressState } from "@/engine/types";
export { activeUnitId, recomputeUnitStatuses } from "@/engine/unlock";
