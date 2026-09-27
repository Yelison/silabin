"use client";

import { PictureChoice } from "@/features/session/choice/PictureChoice";
import type { EvaluationProps } from "@/features/session/registry";

/** ¿Cuál rima? Arriba la imagen del objetivo y su altavoz; abajo las dos opciones. */
export function Evaluation(props: EvaluationProps) {
	return <PictureChoice {...props} showTarget />;
}
