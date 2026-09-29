"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Download } from "@/features/adult/download";
import { exportFilename } from "@/features/adult/download";
import { useApp } from "@/features/app-context";
import type { ImportPreview } from "@/store";

const MENSAJE_RECHAZO: Record<
	Extract<ImportPreview, { ok: false }>["reason"],
	string
> = {
	json: "El fichero no es una exportación de Silabín",
	version: "Esta exportación es de otra versión de Silabín",
	schema: "La exportación está dañada",
};

const MENSAJE_REINICIAR = "Se borrará todo el progreso. El PIN se conserva.";
const MENSAJE_IMPORTADO = "Progreso importado";
const MENSAJE_LECTURA_FALLIDA =
	"No se puede reiniciar: no se pudo leer el progreso guardado. Recarga la página.";

/** Solo para el resumen mostrado tras leer un fichero válido. */
type ResumenImport = Extract<ImportPreview, { ok: true }>;

/**
 * "Datos" del panel de padres: exportar (ya existía), importar con vista previa antes de
 * sustituir nada, y reiniciar con doble confirmación (T6, D3-D7).
 */
export function DataSection(props: { download: Download; now?: () => Date }) {
	const { download, now = () => new Date() } = props;
	const childName = useApp((s) => s.doc.settings.childName);
	const exportJson = useApp((s) => s.exportJson);
	const previewImport = useApp((s) => s.previewImport);
	const importDoc = useApp((s) => s.importDoc);
	const resetAll = useApp((s) => s.resetAll);

	const [resumen, setResumen] = useState<ResumenImport | null>(null);
	const [mensajeImport, setMensajeImport] = useState<string | null>(null);
	const [resetAbierto, setResetAbierto] = useState(false);
	const [mensajeReset, setMensajeReset] = useState<string | null>(null);

	const idDatos = useId();
	const idAlertaReset = useId();
	const cancelarResetRef = useRef<HTMLButtonElement>(null);

	// El foco entra en el diálogo al abrirlo, en el botón menos destructivo (D7).
	useEffect(() => {
		if (resetAbierto) cancelarResetRef.current?.focus();
	}, [resetAbierto]);

	// Mientras el diálogo de reiniciar está abierto, su Escape se captura antes de que llegue
	// al listener de ParentPanel (fase de captura en window, registrado más arriba en el árbol
	// de eventos que la fase de burbuja de ParentPanel), así que cancela solo este diálogo y no
	// cierra el panel entero.
	useEffect(() => {
		if (!resetAbierto) return;
		const alTeclado = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			e.stopPropagation();
			setResetAbierto(false);
		};
		window.addEventListener("keydown", alTeclado, true);
		return () => window.removeEventListener("keydown", alTeclado, true);
	}, [resetAbierto]);

	const alElegirArchivo = async (file: File) => {
		const texto = await file.text();
		const resultado = previewImport(texto);
		if (resultado.ok) {
			setResumen(resultado);
			setMensajeImport(null);
		} else {
			setResumen(null);
			setMensajeImport(MENSAJE_RECHAZO[resultado.reason]);
		}
	};

	const confirmarImport = async () => {
		if (resumen === null) return;
		await importDoc(resumen.state);
		setResumen(null);
		setMensajeImport(MENSAJE_IMPORTADO);
	};

	const confirmarReset = async () => {
		const resultado = await resetAll();
		setResetAbierto(false);
		if (!resultado.done && resultado.reason === "read-failed") {
			setMensajeReset(MENSAJE_LECTURA_FALLIDA);
		} else {
			setMensajeReset(null);
		}
	};

	return (
		<section aria-labelledby={idDatos}>
			<h2 id={idDatos} className="text-lg font-semibold">
				Datos
			</h2>
			<div className="mt-3 space-y-4">
				<button
					type="button"
					className="rounded-lg bg-calm px-4 py-2 text-ink"
					onClick={() =>
						download(exportFilename(now(), childName), exportJson())
					}
				>
					Exportar
				</button>

				<div>
					<label htmlFor={`${idDatos}-importar`} className="block">
						Importar
					</label>
					<input
						id={`${idDatos}-importar`}
						type="file"
						accept="application/json,.json"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file !== undefined) void alElegirArchivo(file);
							e.target.value = "";
						}}
					/>
					{mensajeImport !== null && (
						<p role="status" className="mt-2 text-ink-soft">
							{mensajeImport}
						</p>
					)}
					{resumen !== null && (
						<div className="mt-2 space-y-2 rounded-lg bg-calm p-3 text-ink">
							<p>
								{resumen.summary.childName ?? "Sin nombre"} —{" "}
								{resumen.summary.sessions} sesiones,{" "}
								{resumen.summary.totalStars} estrellas,{" "}
								{resumen.summary.unitsDone} unidades completas
								{resumen.summary.lastSessionAt !== null && (
									<>
										, última sesión el{" "}
										{new Date(resumen.summary.lastSessionAt).toLocaleDateString(
											"es",
										)}
									</>
								)}
							</p>
							<div className="flex gap-3">
								<button
									type="button"
									className="rounded-lg bg-action px-4 py-2 text-action-ink"
									onClick={() => {
										void confirmarImport();
									}}
								>
									Sustituir el progreso actual
								</button>
								<button
									type="button"
									className="rounded-lg bg-calm px-4 py-2 text-ink"
									onClick={() => setResumen(null)}
								>
									Cancelar
								</button>
							</div>
						</div>
					)}
				</div>

				<div>
					<button
						type="button"
						className="rounded-lg bg-calm px-4 py-2 text-ink"
						onClick={() => {
							setMensajeReset(null);
							setResetAbierto(true);
						}}
					>
						Reiniciar todo
					</button>
					{mensajeReset !== null && (
						<p role="alert" className="mt-2 text-ink-soft">
							{mensajeReset}
						</p>
					)}
				</div>
			</div>

			{resetAbierto && (
				<div
					role="alertdialog"
					aria-labelledby={idAlertaReset}
					className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4"
				>
					<div className="w-full max-w-sm space-y-4 rounded-card bg-card p-6 text-ink shadow-lg">
						<p id={idAlertaReset}>{MENSAJE_REINICIAR}</p>
						<div className="flex gap-3">
							<button
								type="button"
								className="rounded-lg bg-action px-4 py-2 text-action-ink"
								onClick={() => {
									void confirmarReset();
								}}
							>
								Sí, borrar todo
							</button>
							<button
								ref={cancelarResetRef}
								type="button"
								className="rounded-lg bg-calm px-4 py-2 text-ink"
								onClick={() => setResetAbierto(false)}
							>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
