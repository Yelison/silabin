import type { ExerciseResolution, Stars } from "@/engine/types";

export const THREE_STAR_RATIO = 1;
export const TWO_STAR_RATIO = 0.8;

export function firstTryRatio(
	resolutions: readonly ExerciseResolution[],
): number {
	if (resolutions.length === 0) return 0;
	const firstTry = resolutions.filter(
		(r) => r.status === "mastery-credit",
	).length;
	return firstTry / resolutions.length;
}

export function starsForSession(
	resolutions: readonly ExerciseResolution[],
): Stars {
	if (resolutions.length === 0) return 0;
	const ratio = firstTryRatio(resolutions);
	if (ratio >= THREE_STAR_RATIO) return 3;
	if (ratio >= TWO_STAR_RATIO) return 2;
	return 1;
}
