export type WorldNodeVisualKind =
	| "rhythm-stage"
	| "rhyme-bounce"
	| "sound-detective"
	| "listening-station"
	| "vowel-garden"
	| "syllable-workshop"
	| "future-landmark";

export type WorldNodeVisual = {
	kind: WorldNodeVisualKind;
	variant?: string;
	asset: string;
	accent: string;
};

const PHASE0_VISUALS: Readonly<Record<string, WorldNodeVisual>> = {
	"phase0:clap": {
		kind: "rhythm-stage",
		asset: "node-rhythm.webp",
		accent: "#F9BE23",
	},
	"phase0:rhyme": {
		kind: "rhyme-bounce",
		asset: "node-rhyme.webp",
		accent: "#A994F4",
	},
	"phase0:initial": {
		kind: "sound-detective",
		asset: "node-detective.webp",
		accent: "#82C8F5",
	},
	"phase0:hear-it": {
		kind: "listening-station",
		asset: "node-listen.webp",
		accent: "#F3A77C",
	},
};

const VOWEL_ACCENTS: Readonly<Record<string, string>> = {
	a: "#A994F4",
	e: "#82C8F5",
	o: "#F3A77C",
	i: "#CBB6FF",
	u: "#9ED8C3",
};

const CONSONANT_ACCENTS = [
	"#FFD8C2",
	"#F5C3A6",
	"#F3B996",
	"#EFAE87",
	"#EDC89D",
	"#DDB7A4",
	"#F2C7B7",
	"#E7B892",
] as const;

function stableAccent(value: string): string {
	let hash = 0;
	for (const character of value) {
		hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	}
	return CONSONANT_ACCENTS[hash % CONSONANT_ACCENTS.length] ?? "#FFD8C2";
}

/**
 * Resuelve la identidad visual por patrón curricular, no con una lista cerrada de unidades.
 *
 * Fase 0 tiene cuatro experiencias deliberadamente únicas.
 * Las vocales comparten una familia y solo cambia la vocal/acento.
 * Las consonantes y sílabas comparten un taller y la variante sale del slug de la unidad.
 * Así las fases futuras pueden crecer sin necesitar un edificio nuevo por cada unidad.
 */
export function worldNodeVisualFor(unitId: string): WorldNodeVisual {
	const phase0 = PHASE0_VISUALS[unitId];
	if (phase0 !== undefined) return phase0;

	const vowelMatch = /^phase1:vowel-(.+)$/.exec(unitId);
	if (vowelMatch !== null) {
		const variant = vowelMatch[1] ?? "a";
		return {
			kind: "vowel-garden",
			variant,
			asset: "node-vowel-base.webp",
			accent: VOWEL_ACCENTS[variant] ?? "#82C8F5",
		};
	}

	const consonantMatch = /^phase(?:2|3):(.+)$/.exec(unitId);
	if (consonantMatch !== null) {
		const variant = consonantMatch[1] ?? "letter";
		return {
			kind: "syllable-workshop",
			variant,
			asset: "node-syllable-base.webp",
			accent: stableAccent(variant),
		};
	}

	return {
		kind: "future-landmark",
		variant: unitId,
		asset: "node-future-base.webp",
		accent: "#E9E2D7",
	};
}
