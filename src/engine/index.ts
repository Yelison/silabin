export {
	endingKey,
	picturesStartingWith,
	rimeOf,
	stretchInKey,
	stretchKey,
} from "@/content/audio-keys";
export type { Glyph, GlyphPoint, LetterCase } from "@/content/glyphs";
export { glyphFor } from "@/content/glyphs";
export type { CurriculumIndex } from "@/content/index";
export { curriculum } from "@/content/index";
export type { MouthShape } from "@/content/mouths";
export { mouthShapesFor } from "@/content/mouths";
export type { HintStep, TemplateId } from "@/content/templates";
export { templates } from "@/content/templates";
export type { Item, Unit } from "@/content/types";
export {
	expectedAnswer,
	expectedPieces,
	firstSyllableAudioKey,
	reducedPieces,
} from "@/engine/answers";
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
export type { Cosmetic, CosmeticSlot, Equipped } from "@/engine/cosmetics";
export {
	COSMETICS,
	canEquip,
	cosmeticsFor,
	DEFAULT_COSMETICS,
	isUnlocked,
	resolveEquipped,
	wearsCap,
} from "@/engine/cosmetics";
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
export type {
	ItemStatus,
	PhaseReport,
	UnitReport,
} from "@/engine/progress-report";
export { progressReport, unitProgress } from "@/engine/progress-report";
export type { Rng } from "@/engine/random";
export type { Reward, RewardContext, RewardKind } from "@/engine/rewards";
export {
	earnedRewardIds,
	newlyEarnedRewardIds,
	nextMilestone,
	REWARDS,
	STAR_MILESTONES,
	totalStars,
} from "@/engine/rewards";
export type {
	AttemptFeedback,
	SessionRun,
	SessionSummary,
	SpokenVerdict,
	TraceGuide,
} from "@/engine/session";
export {
	acceptsModelTrace,
	checkAnswer,
	completePresentation,
	currentExercise,
	finishSession,
	isSessionOver,
	nextExercise,
	startSession,
	submitAnswer,
	submitSpeech,
	submitTrace,
	traceGuide,
} from "@/engine/session";
export { firstTryRatio, starsForSession } from "@/engine/stars";
export type { GuideLevel, TraceScore, TraceStroke } from "@/engine/trace";
export { guideLevel, scoreTrace } from "@/engine/trace";
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
