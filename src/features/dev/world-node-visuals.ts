export type WorldNodeVisualKind =
	| "rhythm-stage"
	| "rhyme-bounce"
	| "sound-detective"
	| "listening-station"
	| "vowel-garden"
	| "syllable-workshop";

export type WorldNodeVisual = {
	kind: WorldNodeVisualKind;
	variant?: string;
	asset: string;
	accent: string;
};

export const WORLD_NODE_VISUALS: Readonly<Record<string, WorldNodeVisual>> = {
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
	"phase1:vowel-a": {
		kind: "vowel-garden",
		variant: "a",
		asset: "node-vowel-base.webp",
		accent: "#A994F4",
	},
	"phase1:vowel-e": {
		kind: "vowel-garden",
		variant: "e",
		asset: "node-vowel-base.webp",
		accent: "#82C8F5",
	},
	"phase1:vowel-o": {
		kind: "vowel-garden",
		variant: "o",
		asset: "node-vowel-base.webp",
		accent: "#F3A77C",
	},
	"phase1:vowel-i": {
		kind: "vowel-garden",
		variant: "i",
		asset: "node-vowel-base.webp",
		accent: "#CBB6FF",
	},
	"phase1:vowel-u": {
		kind: "vowel-garden",
		variant: "u",
		asset: "node-vowel-base.webp",
		accent: "#9ED8C3",
	},
	"phase2:m": {
		kind: "syllable-workshop",
		variant: "m",
		asset: "node-syllable-base.webp",
		accent: "#FFD8C2",
	},
	"phase2:l": {
		kind: "syllable-workshop",
		variant: "l",
		asset: "node-syllable-base.webp",
		accent: "#F5C3A6",
	},
	"phase2:s": {
		kind: "syllable-workshop",
		variant: "s",
		asset: "node-syllable-base.webp",
		accent: "#F3B996",
	},
	"phase2:p": {
		kind: "syllable-workshop",
		variant: "p",
		asset: "node-syllable-base.webp",
		accent: "#EFAE87",
	},
};
