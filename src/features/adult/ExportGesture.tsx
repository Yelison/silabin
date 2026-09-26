"use client";

import type { ReactNode } from "react";
import { useLongPress } from "@/components/use-long-press";
import { useApp } from "@/features/app-context";

/** Lo que hay que mantener el logo para exportar. Un niño no lo hace por casualidad. */
export const EXPORT_HOLD_MS = 3000;

export type Download = (filename: string, contents: string) => void;

/** `silabin-progreso-<YYYY-MM-DD>.json`, con la fecha local del dispositivo. */
export function exportFilename(date: Date): string {
	const dos = (n: number) => String(n).padStart(2, "0");
	return `silabin-progreso-${date.getFullYear()}-${dos(date.getMonth() + 1)}-${dos(date.getDate())}.json`;
}

/** Descarga real en el navegador: Blob, URL temporal y un `<a download>` pulsado por código. */
export const downloadInBrowser: Download = (filename, contents) => {
	const url = URL.createObjectURL(
		new Blob([contents], { type: "application/json" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Safari y Firefox pueden cancelar la descarga si se revoca justo tras el clic.
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

/**
 * Puerta del adulto para sacar el progreso: mantener el logo 3 s. No hay botón ni texto que
 * invite al niño a tocarlo. `download` se inyecta para que los tests no toquen el DOM.
 */
export function ExportGesture(props: {
	download: Download;
	children: ReactNode;
	now?: () => Date;
}) {
	const { download, children, now = () => new Date() } = props;
	const exportJson = useApp((s) => s.exportJson);
	const handlers = useLongPress(() => {
		download(exportFilename(now()), exportJson());
	}, EXPORT_HOLD_MS);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: gesto oculto del adulto, sin equivalente de teclado a propósito: no es un control para el niño
		<div
			{...handlers}
			// Sin menú contextual ni selección de texto: mantener pulsado es el gesto.
			onContextMenu={(e) => e.preventDefault()}
			style={{ touchAction: "none", userSelect: "none" }}
		>
			{children}
		</div>
	);
}
