"use client";

import { PictureChoice } from "@/features/session/choice/PictureChoice";
import type { EvaluationProps } from "@/features/session/registry";

/** ¿Cuál empieza con este sonido? Solo el altavoz del fonema y las imágenes. */
export function Evaluation(props: EvaluationProps) {
	return <PictureChoice {...props} showTarget={false} />;
}
