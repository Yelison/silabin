import type { ItemKind, TemplateId } from "@/content/kinds";

export type { TemplateId } from "@/content/kinds";
export { templateIdSchema, templateIds } from "@/content/kinds";

export type HintRung = "reduce" | "sound" | "model";
export type HintStep = { rung: HintRung; action: string; note: string };

export type ExerciseTemplate = {
	id: TemplateId;
	itemKinds: ItemKind[];
	evaluation: "tap" | "taps" | "trace" | "voice" | "drag";
	options?: { min: number; max: number };
	difficulty: number;
	hints: [HintStep, HintStep, HintStep];
};

export const templates: Record<TemplateId, ExerciseTemplate> = {
	"listen-tap": {
		id: "listen-tap",
		itemKinds: ["letter", "syllable", "word"],
		evaluation: "tap",
		options: { min: 2, max: 3 },
		difficulty: 1,
		hints: [
			{
				rung: "reduce",
				action: "dim-one-distractor+replay",
				note: "Se atenúa un distractor, quedan 2, y se repite el audio.",
			},
			{
				rung: "sound",
				action: "pulse-correct+lengthen-first-phoneme",
				note: "La opción correcta pulsa y se alarga su primer sonido.",
			},
			{
				rung: "model",
				action: "mark-correct+await-tap",
				note: "Se marca la correcta; el niño la toca para continuar.",
			},
		],
	},
	"hear-it": {
		id: "hear-it",
		itemKinds: ["oral-skill"],
		evaluation: "tap",
		difficulty: 2,
		hints: [
			{
				rung: "reduce",
				action: "replay-word-slowly",
				note: "Se repite la palabra despacio, separando sus partes.",
			},
			{
				rung: "sound",
				action: "lengthen-target-phoneme-in-word",
				note: "Se repite la palabra alargando el sonido buscado si está.",
			},
			{
				rung: "model",
				action: "mark-correct-button+await-tap",
				note: "Se marca el botón correcto, sí o no; el niño lo toca.",
			},
		],
	},
	"count-syllables": {
		id: "count-syllables",
		itemKinds: ["oral-skill"],
		evaluation: "taps",
		difficulty: 3,
		hints: [
			{
				rung: "reduce",
				action: "replay-by-syllable+light-per-syllable",
				note: "Se repite la palabra sílaba a sílaba con una luz por sílaba.",
			},
			{
				rung: "sound",
				action: "replay-with-audible-beats",
				note: "Se oye la palabra con un golpe audible por sílaba.",
			},
			{
				rung: "model",
				action: "prefill-circles+await-taps",
				note: "Aparecen los círculos ya contados; el niño los toca.",
			},
		],
	},
	rhyme: {
		id: "rhyme",
		itemKinds: ["oral-skill"],
		evaluation: "tap",
		options: { min: 2, max: 2 },
		difficulty: 4,
		hints: [
			{
				rung: "reduce",
				action: "replay-target-ending",
				note: 'Se repite el final de la palabra objetivo, por ejemplo "-ato".',
			},
			{
				rung: "sound",
				action: "replay-each-option-ending",
				note: "Se oye el final de cada opción, una tras otra.",
			},
			{
				rung: "model",
				action: "mark-correct+await-tap",
				note: "Se marca la que rima; el niño la toca.",
			},
		],
	},
	"initial-sound": {
		id: "initial-sound",
		// Acepta oral-skill porque la unidad phase0:initial plantea el mismo ejercicio
		// con ítems orales que ya traen sus opciones en el dato.
		itemKinds: ["phoneme", "oral-skill"],
		evaluation: "tap",
		options: { min: 2, max: 3 },
		difficulty: 5,
		hints: [
			{
				rung: "reduce",
				action: "dim-one-distractor+replay-phoneme",
				note: "Se atenúa un distractor y se repite el fonema aislado.",
			},
			{
				rung: "sound",
				action: "replay-each-option-onset",
				note: 'Se oye el inicio de cada imagen, por ejemplo "a… vión".',
			},
			{
				rung: "model",
				action: "mark-correct+await-tap",
				note: "Se marca la correcta; el niño la toca.",
			},
		],
	},
	build: {
		id: "build",
		itemKinds: ["syllable"],
		evaluation: "drag",
		difficulty: 6,
		hints: [
			{
				rung: "reduce",
				action: "dim-nonmatching-pieces",
				note: "Se atenúan las piezas que no entran; quedan la consonante y las 5 vocales.",
			},
			{
				rung: "sound",
				action: "pulse-vowel-piece+play-vowel",
				note: "La pieza de la vocal pulsa y se oye su sonido.",
			},
			{
				rung: "model",
				action: "highlight-both-pieces-in-order",
				note: "Las dos piezas correctas quedan resaltadas en orden; el niño las arrastra.",
			},
		],
	},
	trace: {
		id: "trace",
		itemKinds: ["letter"],
		evaluation: "trace",
		difficulty: 7,
		hints: [
			{
				rung: "reduce",
				action: "restore-previous-guide-level",
				note: "Reaparece la guía completa del nivel anterior, desvanecimiento inverso.",
			},
			{
				rung: "sound",
				action: "animate-dot-along-stroke+play-phoneme",
				note: "Un punto recorre el trazo mientras se oye el sonido de la letra.",
			},
			{
				rung: "model",
				action: "animate-full-stroke+await-retrace",
				note: "El trazo se anima entero; el niño lo repite encima con la guía visible.",
			},
		],
	},
	"say-it": {
		id: "say-it",
		itemKinds: ["letter", "syllable"],
		evaluation: "voice",
		difficulty: 8,
		hints: [
			{
				rung: "reduce",
				action: "show-mouth+replay-instruction",
				note: "Se muestra la boca articulando y se repite la instrucción, sin dar el sonido.",
			},
			{
				rung: "sound",
				action: "lengthen-first-phoneme",
				note: 'Se oye el primer sonido alargado, "mmm…", y el niño completa.',
			},
			{
				rung: "model",
				action: "play-full+accept-any-speech",
				note: "Se oye la sílaba entera; el niño la repite y basta que hable.",
			},
		],
	},
	"read-word": {
		id: "read-word",
		itemKinds: ["word"],
		evaluation: "voice",
		difficulty: 9,
		hints: [
			{
				rung: "reduce",
				action: "split-syllables+replay-instruction",
				note: "Se separan visualmente las sílabas, ma·pa, y se repite la instrucción.",
			},
			{
				rung: "sound",
				action: "play-first-syllable",
				note: "Se oye la primera sílaba; el niño completa.",
			},
			{
				rung: "model",
				action: "play-full+accept-any-speech",
				note: "Se oye la palabra entera; el niño la repite y basta que hable.",
			},
		],
	},
};
