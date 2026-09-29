"use client";

import { useEffect, useId, useState } from "react";
import { DataSection } from "@/features/adult/DataSection";
import type { Download } from "@/features/adult/download";
import { ProgressSection } from "@/features/adult/ProgressSection";
import { useApp, useSpeech } from "@/features/app-context";
import { pickEvaluator } from "@/speech";
import type { Settings } from "@/store";

const MAX_NOMBRE = 40;

const NOMBRE_ACENTO: Record<Settings["accent"], string> = {
	do: "Dominicano",
	mx: "Mexicano",
	neutro: "Neutro",
};

/** Nombres legibles de los evaluadores de voz (§6). `browser` y `azure` no existen todavía. */
const NOMBRE_EVALUADOR: Record<string, string> = {
	parent: "adulto",
	browser: "navegador",
	azure: "Azure",
};

/**
 * El panel de padres: ajustes que se aplican al momento, el progreso del niño y los datos
 * (exportar, importar y reiniciar). `onChangePin` devuelve a `ParentGate` al paso de crear un
 * PIN nuevo; `onClose` vuelve al mapa.
 */
export function ParentPanel(props: {
	onClose: () => void;
	onChangePin: () => void;
	download: Download;
	now?: () => Date;
}) {
	const { onClose, onChangePin, download, now = () => new Date() } = props;
	const settings = useApp((s) => s.doc.settings);
	const updateSettings = useApp((s) => s.updateSettings);
	const { evaluators } = useSpeech();

	// Solo de visualización: no vuelve a leer `settings.childName` tras el primer pintado, para
	// no borrarle al adulto un espacio final que acaba de escribir (updateSettings ya lo guarda
	// recortado, y ese valor recortado no debe "corregir" lo que el campo enseña mientras escribe).
	const [nombre, setNombre] = useState(settings.childName ?? "");
	const [evaluadorActivo, setEvaluadorActivo] = useState<string | null>(null);

	useEffect(() => {
		let vivo = true;
		pickEvaluator(evaluators, settings.speechMode)
			.then((evaluador) => {
				if (vivo)
					setEvaluadorActivo(NOMBRE_EVALUADOR[evaluador.id] ?? evaluador.id);
			})
			.catch(() => {
				if (vivo) setEvaluadorActivo(null);
			});
		return () => {
			vivo = false;
		};
	}, [evaluators, settings.speechMode]);

	// Igual que en ParentGate: Escape cierra el diálogo sin depender de que el foco esté en
	// "Cerrar". El panel es su propio diálogo (se monta al autenticar, reemplazando la puerta),
	// así que necesita su propio listener en vez de heredar el de ParentGate.
	useEffect(() => {
		const alTeclado = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", alTeclado);
		return () => window.removeEventListener("keydown", alTeclado);
	}, [onClose]);

	const idAcento = useId();
	const idMinusculas = useId();
	const idSesion = useId();
	const idVoz = useId();
	const idMic = useId();
	const idCelebraciones = useId();
	const idNombre = useId();
	const idAjustes = useId();

	const alCambiarNombre = (texto: string) => {
		const recortado = texto.slice(0, MAX_NOMBRE);
		setNombre(recortado);
		const limpio = recortado.trim();
		void updateSettings({ childName: limpio === "" ? null : limpio });
	};

	return (
		<div
			role="dialog"
			aria-label="Panel de padres"
			className="fixed inset-0 z-20 overflow-y-auto bg-ink/40 p-4"
		>
			<div className="mx-auto w-full max-w-md space-y-6 rounded-card bg-card p-6 text-ink shadow-lg">
				<section aria-labelledby={idAjustes}>
					<h2 id={idAjustes} className="text-lg font-semibold">
						Ajustes
					</h2>
					<div className="mt-3 space-y-4">
						<div>
							<label htmlFor={idAcento} className="block">
								Acento
							</label>
							<select
								id={idAcento}
								value={settings.accent}
								onChange={(e) =>
									void updateSettings({
										accent: e.target.value as Settings["accent"],
									})
								}
							>
								{(Object.keys(NOMBRE_ACENTO) as Settings["accent"][]).map(
									(acento) => (
										<option key={acento} value={acento}>
											{NOMBRE_ACENTO[acento]}
										</option>
									),
								)}
							</select>
						</div>

						<label htmlFor={idMinusculas} className="flex items-center gap-2">
							<input
								id={idMinusculas}
								type="checkbox"
								checked={settings.lowercaseTracing}
								onChange={(e) =>
									void updateSettings({ lowercaseTracing: e.target.checked })
								}
							/>
							Trazo de minúsculas
						</label>

						<div>
							<label htmlFor={idSesion} className="block">
								Longitud de la sesión
							</label>
							<select
								id={idSesion}
								value={settings.sessionLength}
								onChange={(e) =>
									void updateSettings({
										sessionLength: Number(e.target.value) as 5 | 6,
									})
								}
							>
								<option value={5}>5 ejercicios</option>
								<option value={6}>6 ejercicios</option>
							</select>
						</div>

						<div>
							<label htmlFor={idVoz} className="block">
								Evaluador de voz
							</label>
							<select
								id={idVoz}
								value={settings.speechMode}
								onChange={(e) =>
									void updateSettings({
										speechMode: e.target.value as Settings["speechMode"],
									})
								}
							>
								<option value="auto">Automático</option>
								<option value="parent">Solo adulto</option>
							</select>
							{evaluadorActivo !== null && (
								<p className="text-sm text-ink-soft">
									Evaluador activo: {evaluadorActivo}
								</p>
							)}
						</div>

						<label htmlFor={idMic} className="flex items-center gap-2">
							<input
								id={idMic}
								type="checkbox"
								checked={settings.hideMic}
								onChange={(e) =>
									void updateSettings({ hideMic: e.target.checked })
								}
							/>
							Ocultar el micrófono
						</label>

						<label
							htmlFor={idCelebraciones}
							className="flex items-center gap-2"
						>
							<input
								id={idCelebraciones}
								type="checkbox"
								checked={settings.reducedCelebrations}
								onChange={(e) =>
									void updateSettings({
										reducedCelebrations: e.target.checked,
									})
								}
							/>
							Celebraciones reducidas
						</label>

						<div>
							<label htmlFor={idNombre} className="block">
								Nombre del niño
							</label>
							<input
								id={idNombre}
								type="text"
								maxLength={MAX_NOMBRE}
								value={nombre}
								onChange={(e) => alCambiarNombre(e.target.value)}
							/>
						</div>

						<button
							type="button"
							className="rounded-lg bg-calm px-4 py-2 text-ink"
							onClick={onChangePin}
						>
							Cambiar PIN
						</button>
					</div>
				</section>

				<ProgressSection />

				<DataSection download={download} now={now} />

				<button
					type="button"
					className="rounded-lg bg-action px-4 py-2 text-action-ink"
					onClick={onClose}
				>
					Cerrar
				</button>
			</div>
		</div>
	);
}
