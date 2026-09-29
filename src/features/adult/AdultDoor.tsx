"use client";

import type { ReactNode } from "react";
import { useLongPress } from "@/components/use-long-press";

/** Lo que hay que mantener el logo para abrir el panel de padres. Un niño no lo hace por casualidad. */
export const PANEL_HOLD_MS = 3000;

/**
 * Puerta oculta del adulto: mantener el logo 3 s abre la puerta del PIN del panel de padres.
 * No hay botón ni texto que invite al niño a tocarlo; `onOpen` solo abre la puerta, nunca hace
 * nada por sí sola (el PIN y el panel viven en `ParentGate`/`ParentPanel`).
 */
export function AdultDoor(props: { onOpen: () => void; children: ReactNode }) {
	const { onOpen, children } = props;
	const handlers = useLongPress(onOpen, PANEL_HOLD_MS);

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
