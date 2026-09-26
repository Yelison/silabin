import type { ComponentType } from "react";
import {
	type AttemptFeedback,
	activeUnitId,
	type CurriculumIndex,
	type Item,
	type PlannedExercise,
	type ProgressState,
	type TemplateId,
} from "@/engine";

/** Lo que recibe la vista de presentación de una plantilla: enseña el ítem y avisa al terminar. */
export type PresentationProps = {
	exercise: PlannedExercise;
	item: Item;
	onDone(): void;
};

/** Lo que recibe la vista de evaluación. La interfaz pinta; el motor decide. */
export type EvaluationProps = {
	exercise: PlannedExercise;
	item: Item;
	/** Cambia con cada intento nuevo: el componente reinicia su entrada. */
	attemptKey: number;
	/** La última respuesta del motor a este ejercicio. */
	feedback: AttemptFeedback | null;
	/** True mientras suena el feedback: ignorar toques. */
	locked: boolean;
	onAnswer(answer: string): void;
	/** El niño reprodujo el modelo del tercer rung. */
	onModelDone(): void;
};

export type TemplateViews = {
	Presentation: ComponentType<PresentationProps>;
	Evaluation: ComponentType<EvaluationProps>;
};

/** Las vistas que la interfaz sabe pintar. La Tarea 8 registra aquí `count-syllables`. */
export const templateViews: Partial<Record<TemplateId, TemplateViews>> = {};

/** Plantillas con las que hay sesión jugable hoy. Crece una a una con cada plantilla nueva. */
export const IMPLEMENTED_TEMPLATES: ReadonlySet<TemplateId> =
	new Set<TemplateId>(["count-syllables"]);

/**
 * ¿Puede la interfaz jugar hoy una sesión con este progreso? Con unidad activa, todas las
 * plantillas que declara deben estar implementadas. En repaso (sin unidad activa), todas las de
 * las unidades con algún ítem ya presentado. Si falta una, no se ofrece sesión: es mejor no
 * dejar jugar que dejar al niño ante un ejercicio que no se sabe pintar.
 */
export function isSessionPlayable(
	content: CurriculumIndex,
	progress: ProgressState,
	implemented: ReadonlySet<TemplateId>,
): boolean {
	const activa = activeUnitId(content, progress);
	const unidades =
		activa !== null
			? [content.units.get(activa)]
			: [...content.units.values()].filter((u) =>
					u.introduces.some((id) => progress.items[id]?.presented === true),
				);
	const declaradas = unidades.flatMap((u) =>
		(u?.exercises ?? []).map((e) => e.templateId),
	);
	if (unidades.length === 0 || unidades.some((u) => u === undefined))
		return false;
	return declaradas.length > 0 && declaradas.every((t) => implemented.has(t));
}
