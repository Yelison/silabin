import type { Item } from "@/content/types";

/** Forma de la boca al decir un sonido (D21). Esquemática, no realista. */
export type MouthShape =
	| "open"
	| "spread"
	| "round"
	| "closed"
	| "teeth"
	| "tongue";

const FORMAS: Readonly<Record<string, MouthShape>> = {
	a: "open",
	e: "spread",
	i: "spread",
	o: "round",
	u: "round",
	m: "closed",
	p: "closed",
	s: "teeth",
	l: "tongue",
};

/**
 * Una forma de boca por fonema del ítem, en orden. Un fonema sin forma es un fallo de contenido
 * (un fonema nuevo sin dibujar) y falla alto: una boca equivocada enseñaría el sonido mal.
 */
export function mouthShapesFor(item: Item): MouthShape[] {
	return item.phonemes.map((fonema) => {
		const forma = FORMAS[fonema];
		if (forma === undefined)
			throw new Error(
				`El fonema "${fonema}" de ${item.id} no tiene forma de boca`,
			);
		return forma;
	});
}
