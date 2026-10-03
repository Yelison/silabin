"use client";

import { useState } from "react";

/** Una pieza de arte: la imagen y el emoji de respaldo si no carga (como `Picture`, D1). */
export type Art = { src: string; emoji: string };

/**
 * Una pieza de arte decorativa: el WebP y, si no carga o no tiene `src`, su emoji del mismo
 * tamaño (V7: ninguna vista se queda con una caja vacía ni con el icono de imagen rota). Es
 * `alt=""` y `aria-hidden`: el nombre accesible va en el contenedor, no aquí.
 */
export function ArtImage(props: {
	art: Art;
	/** Ancho y alto en px. */
	size: number;
	/** `object-cover`, para las miniaturas de fondo. */
	cover?: boolean;
	className?: string;
}) {
	const { art, size, cover = false, className = "" } = props;
	const [fallida, setFallida] = useState<string | null>(null);

	if (art.src === "" || fallida === art.src) {
		return (
			<span
				aria-hidden="true"
				data-art-fallback
				style={{ width: size, height: size, fontSize: size * 0.75 }}
				className={`inline-flex select-none items-center justify-center leading-none ${className}`}
			>
				{art.emoji}
			</span>
		);
	}
	return (
		// biome-ignore lint/performance/noImgElement: los WebP ya vienen a su tamaño y la PWA los precachea tal cual; el optimizador de next/image no aporta nada y necesita servidor
		<img
			src={art.src}
			alt=""
			aria-hidden="true"
			width={size}
			height={size}
			draggable={false}
			onError={() => setFallida(art.src)}
			className={`select-none ${cover ? "object-cover" : ""} ${className}`}
		/>
	);
}
