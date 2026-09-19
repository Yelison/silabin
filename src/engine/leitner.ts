import type { Box, ItemProgress } from "@/engine/types";

export const MAX_BOX = 3 as const;
export const BOX_INTERVALS: Record<1 | 2 | 3, number> = { 1: 1, 2: 3, 3: 7 };

export function promote(box: Box): Box {
	return box >= MAX_BOX ? MAX_BOX : ((box + 1) as Box);
}

export function demote(_box: Box): Box {
	return 1;
}

export function isDue(progress: ItemProgress, sessionIndex: number): boolean {
	if (progress.box === 0) return false;
	return (
		sessionIndex - progress.lastSessionIndex >= BOX_INTERVALS[progress.box]
	);
}

export function sessionsUntilDue(
	progress: ItemProgress,
	sessionIndex: number,
): number {
	if (progress.box === 0) return 0;
	const due = progress.lastSessionIndex + BOX_INTERVALS[progress.box];
	return Math.max(0, due - sessionIndex);
}
