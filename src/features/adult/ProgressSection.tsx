"use client";

import { useId } from "react";
import {
	curriculum,
	type ItemStatus,
	type PhaseReport,
	progressReport,
	type UnitStatus,
} from "@/engine";
import { useApp } from "@/features/app-context";

const NOMBRE_FASE: Record<PhaseReport["phase"], string> = {
	0: "Fase 0",
	1: "Fase 1",
	2: "Fase 2",
};

const NOMBRE_ESTADO_UNIDAD: Record<UnitStatus, string> = {
	locked: "Bloqueada",
	active: "Activa",
	done: "Completa",
};

const NOMBRE_ESTADO_ITEM: Record<ItemStatus, string> = {
	mastered: "Dominado",
	learning: "En repaso",
	unseen: "Sin ver",
};

/** «Repaso» si la sesión no tiene unidad (sesión de solo repaso), o el título de la unidad. */
function tituloSesion(unitId: string | null): string {
	if (unitId === null) return "Repaso";
	return curriculum.units.get(unitId)?.title ?? unitId;
}

/**
 * El progreso del panel de padres: `progressReport` por fase y unidad, con los ítems
 * desplegables, y las últimas 10 sesiones. Solo lee del motor y del documento: no recalcula
 * nada por su cuenta (T6, D1/D2).
 */
export function ProgressSection() {
	const progress = useApp((s) => s.progress);
	const sessions = useApp((s) => s.doc.sessions);
	const idProgreso = useId();
	const report = progressReport(curriculum, progress);
	// Del documento vienen en orden cronológico ascendente: las últimas 10, de la más nueva a
	// la más antigua.
	const ultimasSesiones = sessions.slice(-10).reverse();

	return (
		<section aria-labelledby={idProgreso}>
			<h2 id={idProgreso} className="text-lg font-semibold">
				Progreso
			</h2>
			<div className="mt-3 space-y-4">
				{report.map((phase) => (
					<div key={phase.phase}>
						<h3 className="font-semibold">{NOMBRE_FASE[phase.phase]}</h3>
						<div className="mt-2 space-y-2">
							{phase.units.map((unit) => (
								<details
									key={unit.unitId}
									className="rounded-lg bg-calm p-3 text-ink"
								>
									<summary>
										{unit.title} — {NOMBRE_ESTADO_UNIDAD[unit.status]} —{" "}
										{unit.bestStars} de 3 estrellas
									</summary>
									<p className="mt-2 text-sm text-ink-soft">
										{unit.counts.mastered} dominados, {unit.counts.learning} en
										repaso, {unit.counts.unseen} sin ver
									</p>
									<ul className="mt-2 list-disc pl-5">
										{unit.items.map((item) => (
											<li key={item.itemId}>
												{item.text}: {NOMBRE_ESTADO_ITEM[item.status]}
											</li>
										))}
									</ul>
								</details>
							))}
						</div>
					</div>
				))}

				<div>
					<h3 className="font-semibold">Últimas sesiones</h3>
					{ultimasSesiones.length === 0 ? (
						<p className="mt-2 text-ink-soft">Todavía no hay sesiones</p>
					) : (
						<ul className="mt-2 space-y-1">
							{ultimasSesiones.map((sesion) => (
								<li key={sesion.index}>
									{new Date(sesion.endedAt).toLocaleDateString("es")} —{" "}
									{tituloSesion(sesion.unitId)} — {sesion.stars} de 3 estrellas
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
