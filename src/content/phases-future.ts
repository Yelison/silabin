import type { Unit } from "@/content/types";

const FUTURE = [
	["t", "La t"],
	["n", "La n"],
	["d", "La d"],
	["r", "La r suave"],
	["f", "La f"],
	["enie", "La ñ"],
	["c", "La c con a, o, u"],
	["b", "La b"],
] as const;

export const phase3Units: Unit[] = FUTURE.map(([slug, title], index) => {
	const previous = FUTURE[index - 1];
	return {
		id: `phase3:${slug}`,
		phase: 3,
		title,
		audioKey: `unit:phase3:${slug}`,
		requires: previous === undefined ? ["phase2:p"] : [`phase3:${previous[0]}`],
		introduces: [],
		exercises: [],
	};
});
