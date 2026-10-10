"use client";

import { type CSSProperties, useEffect, useRef } from "react";
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
import { useApp } from "@/features/app-context";
import { ChapterCard } from "@/features/map/ChapterCard";
import { MapFooter, type PlayMode } from "@/features/map/MapFooter";
import { MapHeader } from "@/features/map/MapHeader";
import { MapNode } from "@/features/map/MapNode";
import {
	type Cell,
	COLUMNAS,
	DISPOSICIONES,
	type Disposicion,
	layoutCells,
	layoutPath,
	layoutRows,
} from "@/features/map/serpentine";
import {
	IMPLEMENTED_TEMPLATES,
	isSessionPlayable,
} from "@/features/session/registry";
import { hayAvisoAdulto } from "@/store";

type Fase = {
	phase: number;
	units: Unit[];
	/** Dónde va cada unidad en la rejilla de cada disposición. */
	celdas: Record<Disposicion, Cell[]>;
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
			celdas: layoutCells(units.length),
		}));
}

const FASES = unidadesPorFase();

/**
 * Una tabla literal por disposición: Tailwind solo genera las clases que aparecen escritas
 * enteras, así que nada de montarlas con plantillas a partir de `DISPOSICIONES`.
 */
const CAMINO: Record<Disposicion, string> = {
	base: "md:hidden",
	md: "hidden md:block lg:hidden",
	lg: "hidden lg:block",
};

/** La celda de cada nodo: su columna y su fila (base 1) en cada rejilla, sin unidades. */
const CELDA =
	"relative z-10 grid place-items-center col-start-(--cb) row-start-(--rb) md:col-start-(--c3) md:row-start-(--r3) lg:col-start-(--c5) lg:row-start-(--r5)";

function posicion(
	celdas: Record<Disposicion, Cell[]>,
	i: number,
): CSSProperties {
	const [cb, c3, c5] = DISPOSICIONES.map((d) => celdas[d][i]);
	return {
		"--cb": (cb?.col ?? 0) + 1,
		"--rb": (cb?.row ?? 0) + 1,
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
	layout,
	count,
	cells,
}: {
	layout: Disposicion;
	count: number;
	cells: readonly Cell[];
}) {
	return (
		<svg
			aria-hidden="true"
			data-layout={layout}
			viewBox={`0 0 ${COLUMNAS[layout]} ${layoutRows(layout, count)}`}
			preserveAspectRatio="none"
			className={`pointer-events-none absolute inset-0 size-full ${CAMINO[layout]}`}
		>
			{cells.length >= 2 && (
				<path
					d={layoutPath(layout, cells)}
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
	const avisoAdulto = useApp(hayAvisoAdulto);
	const playable = isSessionPlayable(curriculum, progress, implemented);
	const idActivo = activeUnitId(curriculum, progress);
	/** La cara del botón grande del pie (D53): jugar la activa, repasar o «llega después». */
	const mode: PlayMode = !playable
		? "soon"
		: idActivo === null
			? "review"
			: "play";
	const avanceActivo =
		idActivo === null ? null : unitProgress(curriculum, progress, idActivo);
	const faseActiva =
		idActivo === null ? null : (curriculum.units.get(idActivo)?.phase ?? null);
	/** Los puntos de avance van solo en la tarjeta del mundo de la unidad activa (D57). */
	const dominadosEn = (phase: number): number | null =>
		avanceActivo !== null && faseActiva === phase && avanceActivo.mastered > 0
			? avanceActivo.mastered
			: null;
	const estrellas = totalStars(progress);
	const hito = nextMilestone(estrellas);
	// MP12: la celda de la unidad activa se centra una vez, al montar y sin animación.
	const celdaActiva = useRef<HTMLDivElement>(null);
	useEffect(() => {
		celdaActiva.current?.scrollIntoView?.({ block: "center" });
	}, []);

	return (
		<main className="flex h-dvh w-full flex-col">
			<MapHeader
				stars={estrellas}
				milestone={hito}
				lastSavedAt={lastSavedAt}
				saveFailed={saveFailed}
				onOpenPanel={onOpenPanel}
				avisoAdulto={avisoAdulto}
			/>
			{/* La única zona que se desplaza (MC4); la activa se centra aquí dentro (MP12). El camino va
			    en un panel opaco (MP10, V13) que ensancha con la pantalla. */}
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				<div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-card bg-surface p-2 md:max-w-2xl md:p-4 lg:max-w-4xl">
					{FASES.map(({ phase, units, celdas }) => (
						<section key={phase} aria-label={`Fase ${phase}`}>
							<ChapterCard phase={phase} mastered={dominadosEn(phase)} />
							<div className="relative grid grid-cols-5 auto-rows-[9rem] md:grid-cols-3 lg:grid-cols-5">
								{DISPOSICIONES.map((layout) => (
									<Camino
										key={layout}
										layout={layout}
										count={units.length}
										cells={celdas[layout]}
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
							</div>
						</section>
					))}
				</div>
			</div>
			<MapFooter mode={mode} onStart={onStart} onOpenRewards={onOpenRewards} />
		</main>
	);
}
