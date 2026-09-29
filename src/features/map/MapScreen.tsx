"use client";

import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import {
	activeUnitId,
	curriculum,
	nextMilestone,
	type ProgressState,
	type TemplateId,
	totalStars,
	type Unit,
	type UnitProgress,
	unitProgress,
} from "@/engine";
import { AdultDoor } from "@/features/adult/AdultDoor";
import { useApp } from "@/features/app-context";
import { Companion } from "@/features/rewards/Companion";
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

function horaHHMM(iso: string): string {
	const fecha = new Date(iso);
	const hh = String(fecha.getHours()).padStart(2, "0");
	const mm = String(fecha.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}

/**
 * ✓ discreto, para el adulto: no se toca ni compite con el aviso de fallo de guardado
 * (`SaveWarning`, arriba a la derecha). Sin `lastSavedAt` o con `saveFailed` no hay nada que
 * mostrar; el fallo ya lo cuenta `SaveWarning`.
 */
function SavedMark({
	lastSavedAt,
	saveFailed,
}: {
	lastSavedAt: string | null;
	saveFailed: boolean;
}) {
	if (lastSavedAt === null || saveFailed) return null;
	const etiqueta = `Guardado a las ${horaHHMM(lastSavedAt)}`;
	return (
		<span
			role="img"
			aria-label={etiqueta}
			title={etiqueta}
			className="fixed top-2 left-2 z-10 text-2xl text-ink-soft"
		>
			✓
		</span>
	);
}

/**
 * El total de estrellas ganadas (un número, no texto para leer) y, mientras quede hito por
 * delante, una barra hasta el próximo de `STAR_MILESTONES`. Pasado el último hito (100) solo
 * queda el total.
 */
function StarCounter({
	total,
	milestone,
}: {
	total: number;
	milestone: { from: number; to: number } | null;
}) {
	return (
		<div className="flex flex-col items-center gap-2">
			<span className="flex items-center gap-1 text-2xl font-semibold">
				<span aria-hidden="true" className="text-celebrate">
					★
				</span>
				<span>{total}</span>
			</span>
			{milestone !== null && (
				<div
					role="progressbar"
					aria-valuemin={milestone.from}
					aria-valuemax={milestone.to}
					aria-valuenow={total}
					className="h-2 w-40 overflow-hidden rounded-full bg-card"
				>
					<div
						className="h-full rounded-full bg-celebrate"
						style={{
							width: `${((total - milestone.from) / (milestone.to - milestone.from)) * 100}%`,
						}}
					/>
				</div>
			)}
		</div>
	);
}

/**
 * Avance de la unidad activa (S17): un punto lleno por ítem dominado, sin huecos vacíos —el
 * niño ve lo ganado, no lo que falta. Con 0 dominados no se pinta nada (lo decide quien llama).
 */
function UnitDots({ mastered }: { mastered: number }) {
	return (
		<div
			role="img"
			aria-label={`${mastered} letras aprendidas`}
			className="flex flex-wrap items-center justify-center gap-1"
		>
			{Array.from({ length: mastered }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: puntos idénticos sin identidad propia
					key={i}
					aria-hidden="true"
					className="h-3 w-3 rounded-full bg-calm"
				/>
			))}
		</div>
	);
}

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
			{status === "locked" && <Icon name="lock" size={32} />}
			{status === "active" && <span aria-hidden="true">▶</span>}
		</button>
	);
}

/**
 * El mapa de unidades. Pinta lo que dice `progress.units` (el estado recalculado por el
 * motor, nunca el documento del disco tal cual) y no decide nada: solo avisa de qué se tocó.
 * No hay barras de dominio: el niño ve estrellas ganadas, no lo que le falta. La unidad activa
 * sí muestra un punto lleno por ítem dominado (S17), sin huecos vacíos.
 */
export function MapScreen(props: {
	onStart: () => void;
	onOpenPanel: () => void;
	onOpenRewards: () => void;
	implemented?: ReadonlySet<TemplateId>;
}) {
	const {
		onStart,
		onOpenPanel,
		onOpenRewards,
		implemented = IMPLEMENTED_TEMPLATES,
	} = props;
	const progress: ProgressState = useApp((s) => s.progress);
	const lastSavedAt = useApp((s) => s.lastSavedAt);
	const saveFailed = useApp((s) => s.saveFailed);
	const playable = isSessionPlayable(curriculum, progress, implemented);
	const idActivo = activeUnitId(curriculum, progress);
	const sinActiva = idActivo === null;
	const avanceActivo =
		idActivo === null ? null : unitProgress(curriculum, progress, idActivo);
	const estrellas = totalStars(progress);
	const hito = nextMilestone(estrellas);

	return (
		<main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4">
			<SavedMark lastSavedAt={lastSavedAt} saveFailed={saveFailed} />
			<AdultDoor onOpen={onOpenPanel}>
				<h1 className="text-center text-3xl font-bold">Silabín</h1>
			</AdultDoor>
			<div className="flex flex-row items-center justify-center gap-4">
				<Companion />
				<button
					type="button"
					aria-label="Mis premios"
					onClick={onOpenRewards}
					className="flex min-h-18 min-w-18 items-center justify-center rounded-card bg-card"
				>
					<Icon name="gallery" />
				</button>
			</div>
			<StarCounter total={estrellas} milestone={hito} />
			{avanceActivo !== null && avanceActivo.mastered > 0 && (
				<UnitDots mastered={avanceActivo.mastered} />
			)}
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
