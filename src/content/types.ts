import { z } from "zod";
import {
	type ItemKind,
	itemKindSchema,
	type TemplateId,
	templateIdSchema,
} from "@/content/kinds";

export type { ItemKind, TemplateId };

export const itemTaskSchema = z.object({
	answer: z.string().min(1),
	optionIds: z.array(z.string().min(1)).optional(),
});
export type ItemTask = z.infer<typeof itemTaskSchema>;

const itemBase = z.object({
	id: z.string().min(1),
	kind: itemKindSchema,
	text: z.string().min(1),
	phonemes: z.array(z.string().min(1)),
	audioKey: z.string().min(1),
	display: z
		.object({ upper: z.string().min(1), lower: z.string().min(1) })
		.optional(),
	imageKey: z.string().min(1).optional(),
	syllables: z.array(z.string().min(1)).optional(),
	accented: z.boolean().optional(),
	task: itemTaskSchema.optional(),
});

export const itemSchema = itemBase
	.refine((i) => i.kind === "oral-skill" || i.phonemes.length > 0, {
		message: "phonemes es obligatorio salvo en oral-skill",
		path: ["phonemes"],
	})
	.refine((i) => i.kind !== "letter" || i.display !== undefined, {
		message: "una letra necesita display con su par mayúscula y minúscula",
		path: ["display"],
	})
	.refine((i) => i.kind !== "word" || (i.syllables?.length ?? 0) > 0, {
		message: "una palabra necesita sus sílabas",
		path: ["syllables"],
	})
	.refine((i) => i.kind !== "oral-skill" || i.task !== undefined, {
		message: "una habilidad oral necesita task con la respuesta esperada",
		path: ["task"],
	});
export type Item = z.infer<typeof itemBase>;

export const unitExerciseSchema = z.object({
	templateId: templateIdSchema,
	weight: z.number().int().min(1).max(5),
});
export type UnitExercise = { templateId: TemplateId; weight: number };

export const unitSchema = z
	.object({
		id: z.string().min(1),
		phase: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
		title: z.string().min(1),
		audioKey: z.string().min(1),
		requires: z.array(z.string().min(1)),
		introduces: z.array(z.string().min(1)),
		exercises: z.array(unitExerciseSchema),
	})
	.refine((u) => u.phase === 3 || u.introduces.length > 0, {
		message: "una unidad jugable debe introducir al menos un ítem",
		path: ["introduces"],
	})
	.refine((u) => u.phase === 3 || u.exercises.length > 0, {
		message: "una unidad jugable debe declarar al menos una plantilla",
		path: ["exercises"],
	});
export type Unit = z.infer<typeof unitSchema>;

export const curriculumSchema = z.object({
	items: z.array(itemSchema),
	units: z.array(unitSchema),
});
export type Curriculum = { items: Item[]; units: Unit[] };
