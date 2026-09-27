"use client";

import { useState } from "react";
import { imageFor } from "@/images";

const TAMANO = {
	lg: { px: 160, emoji: "text-9xl" },
	md: { px: 96, emoji: "text-6xl" },
} as const;

export type PictureSize = keyof typeof TAMANO;

/**
 * La imagen grande de la palabra: la ilustración WebP y, si no carga, su emoji. Sin imagen
 * para la clave no se pinta nada.
 */
export function Picture(props: {
	imageKey: string | undefined;
	size?: PictureSize;
}) {
	const { imageKey, size = "lg" } = props;
	const [fallida, setFallida] = useState<string | null>(null);
	const imagen = imageFor(imageKey ?? "");
	if (imagen === null) return null;
	const { px, emoji } = TAMANO[size];
	if (fallida === imagen.src) {
		return (
			<span
				role="img"
				aria-label={imagen.alt}
				className={`select-none leading-none ${emoji}`}
			>
				{imagen.emoji}
			</span>
		);
	}
	return (
		// biome-ignore lint/performance/noImgElement: los WebP ya vienen a su tamaño (384 px) y la PWA los precachea tal cual; el optimizador de next/image no aporta nada y necesita servidor
		<img
			src={imagen.src}
			alt={imagen.alt}
			width={px}
			height={px}
			draggable={false}
			onError={() => setFallida(imagen.src)}
			className="select-none"
		/>
	);
}
