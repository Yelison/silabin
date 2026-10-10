/** Nombre del mundo de cada fase, para el adulto (D58). La fase 0 es el «Mundo 1» (MC5). */
export const WORLD_NAMES: Readonly<Record<number, string>> = {
	0: "Oído de explorador",
	1: "Las vocales",
	2: "Las sílabas",
	3: "Más letras",
};

/** El nombre de la fase; lanza RangeError si la fase no tiene nombre. */
export function worldName(phase: number): string {
	const nombre = WORLD_NAMES[phase];
	if (nombre === undefined)
		throw new RangeError(`La fase ${phase} no tiene nombre de mundo`);
	return nombre;
}
