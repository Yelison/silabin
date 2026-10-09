import type { UnitStatus } from "@/engine";

/** Cómo se pinta un nodo del camino. Lo decide el motor; aquí solo se traduce. */
export type NodeLook = "available" | "soon" | "completed" | "locked";

/**
 * Del estado de la unidad y de si ya hay sesión jugable al aspecto del nodo. Lo que no consta
 * (`undefined`) se trata como bloqueado; una unidad activa sin sesión jugable es «soon».
 */
export function nodeLook(
	status: UnitStatus | undefined,
	playable: boolean,
): NodeLook {
	if (status === "done") return "completed";
	if (status === "active") return playable ? "available" : "soon";
	return "locked";
}
