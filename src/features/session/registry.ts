import type { ComponentType } from "react";
import {
	type AttemptFeedback,
	activeUnitId,
	type CurriculumIndex,
	type Item,
	type PlannedExercise,
	type ProgressState,
	type TemplateId,
	type Unit,
} from "@/engine";
import { Evaluation as CountSyllablesEvaluation } from "@/features/session/count-syllables/Evaluation";
import { Presentation as CountSyllablesPresentation } from "@/features/session/count-syllables/Presentation";
import { Evaluation as HearItEvaluation } from "@/features/session/hear-it/Evaluation";
import { Presentation as HearItPresentation } from "@/features/session/hear-it/Presentation";
import { Evaluation as InitialSoundEvaluation } from "@/features/session/initial-sound/Evaluation";
import { Presentation as InitialSoundPresentation } from "@/features/session/initial-sound/Presentation";
import { Evaluation as ListenTapEvaluation } from "@/features/session/listen-tap/Evaluation";
import { Presentation as ListenTapPresentation } from "@/features/session/listen-tap/Presentation";
import { Evaluation as RhymeEvaluation } from "@/features/session/rhyme/Evaluation";
import { Presentation as RhymePresentation } from "@/features/session/rhyme/Presentation";

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

/** Las vistas que la interfaz sabe pintar. Cada plantilla nueva se registra aquí. */
export const templateViews: Partial<Record<TemplateId, TemplateViews>> = {
	"count-syllables": {
		Presentation: CountSyllablesPresentation,
		Evaluation: CountSyllablesEvaluation,
	},
	rhyme: { Presentation: RhymePresentation, Evaluation: RhymeEvaluation },
	"initial-sound": {
		Presentation: InitialSoundPresentation,
		Evaluation: InitialSoundEvaluation,
	},
	"hear-it": {
		Presentation: HearItPresentation,
		Evaluation: HearItEvaluation,
	},
	"listen-tap": {
		Presentation: ListenTapPresentation,
		Evaluation: ListenTapEvaluation,
	},
};

/** Plantillas con las que hay sesión jugable hoy. Crece una a una con cada plantilla nueva. */
export const IMPLEMENTED_TEMPLATES: ReadonlySet<TemplateId> =
	new Set<TemplateId>([
		"count-syllables",
		"rhyme",
		"initial-sound",
		"hear-it",
		"listen-tap",
	]);

/**
 * ¿Puede la interfaz jugar hoy una sesión con este progreso? Hay que saber pintar todas las
 * plantillas que la sesión puede sacar:
 * - las de la unidad activa, si la hay;
 * - las de toda unidad con algún ítem ya presentado, porque el planificador mezcla ítems de
 *   repaso y elige su plantilla entre las de la unidad que los introduce, no las de la activa.
 * En repaso (sin unidad activa) solo cuenta lo segundo. Si falta una, no se ofrece sesión: es
 * mejor atenuar una unidad de más que dejar al niño ante un ejercicio que no se sabe pintar.
 */
export function isSessionPlayable(
	content: CurriculumIndex,
	progress: ProgressState,
	implemented: ReadonlySet<TemplateId>,
): boolean {
	const activa = activeUnitId(content, progress);
	const unidades = new Set<Unit>();
	if (activa !== null) {
		const unit = content.units.get(activa);
		if (unit === undefined) return false;
		unidades.add(unit);
	}
	for (const unit of content.units.values()) {
		if (unit.introduces.some((id) => progress.items[id]?.presented === true))
			unidades.add(unit);
	}
	const declaradas = [...unidades].flatMap((u) =>
		u.exercises.map((e) => e.templateId),
	);
	return declaradas.length > 0 && declaradas.every((t) => implemented.has(t));
}
