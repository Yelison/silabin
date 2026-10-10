"use client";

import { type CSSProperties, Fragment, useEffect, useRef } from "react";
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
	unitProgress,
} from "@/engine";
import { AdultDoor } from "@/features/adult/AdultDoor";
import { useApp } from "@/features/app-context";
import { LLEGA_DESPUES, MapNode } from "@/features/map/MapNode";
import {
	type Cell,
	COLUMNAS,
	type Columnas,
	serpentine,
	serpentinePath,
} from "@/features/map/serpentine";
import { Companion } from "@/features/rewards/Companion";
import {
	IMPLEMENTED_TEMPLATES,
	isSessionPlayable,
} from "@/features/session/registry";

type Fase = {
	phase: number;
	units: Unit[];
	/** Dónde va cada unidad en la rejilla de cada número de columnas. */
	celdas: Record<Columnas, Cell[]>;
};

function unidadesPorFase(): Fase[] {
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
		.map(([phase, units]) => ({
			phase,
			units,
			celdas: {
				2: serpentine(units.length, 2),
				3: serpentine(units.length, 3),
				5: serpentine(units.length, 5),
			},
		}));
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
			className="fixed top-2 left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-card text-2xl text-ink-soft"
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
					className="h-3 w-40 overflow-hidden rounded-full border-2 border-calm-border bg-card"
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
					data-unit-dot
					className="h-3 w-3 rounded-full bg-calm-border"
				/>
			))}
		</div>
	);
}

/**
 * Una tabla literal por número de columnas: Tailwind solo genera las clases que aparecen
 * escritas enteras, así que nada de montarlas con plantillas a partir de `COLUMNAS`.
 */
const CAMINO: Record<Columnas, string> = {
	2: "md:hidden",
	3: "hidden md:block lg:hidden",
	5: "hidden lg:block",
};

/** La celda de cada nodo: su columna y su fila (base 1) en cada rejilla, sin unidades. */
const CELDA =
	"relative z-10 grid place-items-center col-start-(--c2) row-start-(--r2) md:col-start-(--c3) md:row-start-(--r3) lg:col-start-(--c5) lg:row-start-(--r5)";

function posicion(celdas: Record<Columnas, Cell[]>, i: number): CSSProperties {
	const [c2, c3, c5] = COLUMNAS.map((cols) => celdas[cols][i]);
	return {
		"--c2": (c2?.col ?? 0) + 1,
		"--r2": (c2?.row ?? 0) + 1,
		"--c3": (c3?.col ?? 0) + 1,
		"--r3": (c3?.row ?? 0) + 1,
		"--c5": (c5?.col ?? 0) + 1,
		"--r5": (c5?.row ?? 0) + 1,
	} as CSSProperties;
}

/**
 * El camino de una fase, en unidades de celda (MP7): `viewBox` y `preserveAspectRatio="none"`
 * lo estiran a la rejilla sin medir el DOM. Va detrás de los nodos (sus celdas son `z-10`) y no
 * recibe toques.
 */
function Camino({
	cols,
	count,
	cells,
}: {
	cols: Columnas;
	count: number;
	cells: readonly Cell[];
}) {
	return (
		<svg
			aria-hidden="true"
			data-columns={cols}
			viewBox={`0 0 ${cols} ${Math.ceil(count / cols)}`}
			preserveAspectRatio="none"
			className={`pointer-events-none absolute inset-0 size-full ${CAMINO[cols]}`}
		>
			{cells.length >= 2 && (
				<path
					d={serpentinePath(cells, cols)}
					fill="none"
					className="stroke-node-locked-depth"
					strokeWidth={8}
					strokeLinecap="round"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</svg>
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
	// MP12: la celda de la unidad activa se centra una vez, al montar y sin animación.
	const celdaActiva = useRef<HTMLDivElement>(null);
	useEffect(() => {
		celdaActiva.current?.scrollIntoView?.({ block: "center" });
	}, []);

	return (
		<main className="mx-auto flex w-full flex-col gap-6 p-4">
			<SavedMark lastSavedAt={lastSavedAt} saveFailed={saveFailed} />
			{/* Todo lo que se pinta suelto (título, compañero, estrellas, avance) va sobre una
			    superficie opaca (V13): el fondo equipado puede ser un cielo de noche. */}
			<div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-card bg-surface p-4">
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
			</div>
			{/* El camino va en un panel opaco (MP10, V13): ensancha con la pantalla, la cabecera no. */}
			<div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-card bg-surface p-2 md:max-w-2xl md:p-4 lg:max-w-4xl">
				{FASES.map(({ phase, units, celdas }, f) => (
					<Fragment key={phase}>
						{f > 0 && (
							<div
								aria-hidden="true"
								className="border-t-4 border-dashed border-node-locked-depth"
							/>
						)}
						<section
							aria-label={`Fase ${phase}`}
							className="relative grid grid-cols-2 auto-rows-[9rem] md:grid-cols-3 lg:grid-cols-5"
						>
							{COLUMNAS.map((cols) => (
								<Camino
									key={cols}
									cols={cols}
									count={units.length}
									cells={celdas[cols]}
								/>
							))}
							{units.map((unit, i) => (
								<div
									key={unit.id}
									ref={unit.id === idActivo ? celdaActiva : undefined}
									className={CELDA}
									style={posicion(celdas, i)}
								>
									<MapNode
										unit={unit}
										progress={progress.units[unit.id]}
										playable={playable}
										onStart={onStart}
									/>
								</div>
							))}
						</section>
					</Fragment>
				))}
			</div>
			{sinActiva && (
				<BigButton
					className="mx-auto w-full max-w-xl"
					aria-label={playable ? "Repasar" : LLEGA_DESPUES}
					aria-disabled={playable ? undefined : true}
					onClick={() => {
						if (playable) onStart();
					}}
				>
					<span className={playable ? "" : "opacity-50"}>🔁</span>
				</BigButton>
			)}
		</main>
	);
}
