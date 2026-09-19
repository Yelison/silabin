import { z } from "zod";

export const itemKindSchema = z.enum([
	"phoneme",
	"letter",
	"syllable",
	"word",
	"picture",
	"oral-skill",
]);
export type ItemKind = z.infer<typeof itemKindSchema>;

export const templateIds = [
	"listen-tap",
	"hear-it",
	"count-syllables",
	"rhyme",
	"initial-sound",
	"build",
	"trace",
	"say-it",
	"read-word",
] as const;
export type TemplateId = (typeof templateIds)[number];
export const templateIdSchema = z.enum(templateIds);
