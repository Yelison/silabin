"use client";

import { BigButton } from "@/components/BigButton";
import {
	activeUnitId,
	curriculum,
	type ProgressState,
	type TemplateId,
	type Unit,
	type UnitProgress,
} from "@/engine";
import { AdultDoor } from "@/features/adult/AdultDoor";
import { useApp } from "@/features/app-context";
import {
	IMPLEMENTED_TEMPLATES,
	isSessionPlayable,
} from "@/features/session/registry";

const LLEGA_DESPUES = "Llega en una próxima versión";

function unidadesPorFase(): { phase: number; units: Unit[] }[] {
	const grupos = new Map<number, Unit[]>();
	for (const id of curriculum.unitOrder) {
		const unit = curriculum.units.get(id);
		if (unit === undefined) continue;
		const grupo = grupos.get(unit.phase);
		if (grupo === undefined) grupos.set(unit.phase, [unit]);
		else grupo.push(unit);
	}
	return [...grupos.entries()]
		.sort(([a], [b]) => a - b)
		.map(([phase, units]) => ({ phase, units }));
}

const FASES = unidadesPorFase();

function Estrellas({ n }: { n: number }) {
	return (
		<span aria-hidden="true" className="text-celebrate">
			{[0, 1, 2].map((i) => (
				<span key={i}>{i < n ? "★" : "☆"}</span>
			))}
		</span>
	);
}

function UnitButton(props: {
	unit: Unit;
	progress: UnitProgress | undefined;
	playable: boolean;
	onStart: () => void;
}) {
	const { unit, progress, playable, onStart } = props;
	// Lo que no consta como terminado ni activo se trata como bloqueado.
	const status = progress?.status ?? "locked";
	const stars = progress?.bestStars ?? 0;
	const aparte = status === "active" && !playable;
	const jugable = status === "active" && playable;

	let label: string;
	if (aparte) label = LLEGA_DESPUES;
	else if (status === "done") label = `${unit.title}, ${stars} de 3 estrellas`;
	else if (status === "locked") label = `${unit.title}, bloqueada`;
	else label = unit.title;

	const estilo = {
		done: "bg-calm",
		locked: "bg-card text-ink-soft opacity-60",
		active: "bg-action ring-4 ring-action font-semibold",
	}[status];

	return (
		<button
			type="button"
			data-unit={unit.id}
			data-status={status}
			aria-label={label}
			aria-current={status === "active" ? "step" : undefined}
			aria-disabled={jugable || status === "done" ? undefined : true}
			onClick={() => {
				if (jugable) onStart();
			}}
			className={`flex min-h-18 w-full items-center justify-between gap-3 rounded-2xl p-4 text-left text-xl ${estilo} ${aparte ? "opacity-50" : ""}`}
		>
			<span>{unit.title}</span>
			{status === "done" && <Estrellas n={stars} />}
			{status === "locked" && <span aria-hidden="true">🔒</span>}
			{status === "active" && <span aria-hidden="true">▶</span>}
		</button>
	);
}

/**
 * El mapa de unidades. Pinta lo que dice `progress.units` (el estado recalculado por el
 * motor, nunca el documento del disco tal cual) y no decide nada: solo avisa de qué se tocó.
 * No hay barras de dominio: el niño ve estrellas ganadas, no lo que le falta.
 */
export function MapScreen(props: {
	onStart: () => void;
	onOpenPanel: () => void;
	implemented?: ReadonlySet<TemplateId>;
}) {
	const { onStart, onOpenPanel, implemented = IMPLEMENTED_TEMPLATES } = props;
	const progress: ProgressState = useApp((s) => s.progress);
	const playable = isSessionPlayable(curriculum, progress, implemented);
	const sinActiva = activeUnitId(curriculum, progress) === null;

	return (
		<main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4">
			<AdultDoor onOpen={onOpenPanel}>
				<h1 className="text-center text-3xl font-bold">Silabín</h1>
			</AdultDoor>
			{FASES.map(({ phase, units }) => (
				<section
					key={phase}
					aria-label={`Fase ${phase}`}
					className="flex flex-col gap-3"
				>
					{units.map((unit) => (
						<UnitButton
							key={unit.id}
							unit={unit}
							progress={progress.units[unit.id]}
							playable={playable}
							onStart={onStart}
						/>
					))}
				</section>
			))}
			{sinActiva && (
				<BigButton
					aria-label={playable ? "Repasar" : LLEGA_DESPUES}
					aria-disabled={playable ? undefined : true}
					className={playable ? "" : "opacity-50"}
					onClick={() => {
						if (playable) onStart();
					}}
				>
					🔁
				</BigButton>
			)}
		</main>
	);
}
