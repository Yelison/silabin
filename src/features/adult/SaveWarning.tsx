"use client";

import { useState } from "react";
import { useApp } from "@/features/app-context";

const SIN_GUARDAR =
	"El progreso no se está guardando en este dispositivo. Suele pasar en navegación privada o sin espacio libre. Exporta el progreso para no perderlo.";
const RECUPERADO =
	"Una parte del progreso guardado estaba dañada y se ha recuperado lo que se pudo.";

/**
 * Aviso para el adulto, no para el niño: un icono pequeño y gris en una esquina, sin rojo ni
 * aspa, que solo existe mientras haya algo que contar. El niño no lo lee ni le hace falta.
 */
export function SaveWarning() {
	const saveFailed = useApp((s) => s.saveFailed);
	const recovered = useApp((s) => s.recovered);
	const retrySave = useApp((s) => s.retrySave);
	const [open, setOpen] = useState(false);

	if (!saveFailed && !recovered) {
		// Sin nada que contar, el panel vuelve cerrado: si el guardado falla otra vez, sale el
		// icono y no un diálogo a pantalla completa encima del niño. Se reajusta durante el
		// render (patrón de React para estado derivado), sin efecto ni parpadeo.
		if (open) setOpen(false);
		return null;
	}

	return (
		<>
			<button
				type="button"
				aria-label="Aviso para el adulto sobre el progreso guardado"
				onClick={() => setOpen(true)}
				className="fixed top-2 right-2 z-10 rounded-full p-2 text-gray-400"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-hidden="true"
				>
					<title>Disco</title>
					<path d="M4 4h13l3 3v13H4z" />
					<path d="M8 4v6h8V4" />
					<path d="M8 20v-6h8v6" />
				</svg>
			</button>
			{open && (
				<div
					role="dialog"
					aria-label="Aviso para el adulto"
					className="fixed inset-0 z-20 flex items-center justify-center bg-gray-900/40 p-4"
				>
					<div className="max-w-md space-y-4 rounded-2xl bg-white p-6 text-gray-800 shadow-lg">
						{saveFailed && <p>{SIN_GUARDAR}</p>}
						{recovered && <p>{RECUPERADO}</p>}
						<div className="flex gap-3">
							<button
								type="button"
								className="rounded-lg bg-gray-200 px-4 py-2"
								onClick={() => {
									void retrySave();
								}}
							>
								Reintentar
							</button>
							<button
								type="button"
								className="rounded-lg bg-gray-200 px-4 py-2"
								onClick={() => setOpen(false)}
							>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
