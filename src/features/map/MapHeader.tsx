"use client";

import { Icon } from "@/components/Icon";
import { AdultDoor } from "@/features/adult/AdultDoor";

function horaHHMM(iso: string): string {
	const fecha = new Date(iso);
	const hh = String(fecha.getHours()).padStart(2, "0");
	const mm = String(fecha.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}

/**
 * ✓ discreto, para el adulto, junto al wordmark: va en el flujo de la cabecera y no flota (un ✓
 * fijo a la izquierda pisaba el wordmark). Sin `lastSavedAt` o con `saveFailed` no hay nada que
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
			className="text-xl leading-none text-ink-soft"
		>
			✓
		</span>
	);
}

/**
 * El total de estrellas ganadas (un número, no texto para leer) y, mientras quede hito por
 * delante, una barra fina hasta el próximo de `STAR_MILESTONES` (D56). Pasado el último hito
 * (100) solo queda el total.
 */
function StarCounter({
	total,
	milestone,
}: {
	total: number;
	milestone: { from: number; to: number } | null;
}) {
	return (
		<div className="flex flex-col items-center gap-1">
			<span className="flex items-center gap-1 text-2xl font-extrabold">
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
					className="h-2 w-20 overflow-hidden sm:w-24 rounded-full border border-calm-border bg-card"
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
 * La cabecera fija del mapa (MC4, D60): el wordmark, las estrellas y el candado de la puerta de
 * padres (D51). Va en `bg-card` opaco (MC14): el fondo equipado puede ser un cielo de noche.
 * El candado es un `role="img"` y no un botón: no hace nada al toque (ver `AdultDoor`).
 */
export function MapHeader(props: {
	stars: number;
	milestone: { from: number; to: number } | null;
	lastSavedAt: string | null;
	saveFailed: boolean;
	onOpenPanel: () => void;
	/**
	 * Hay un aviso de guardado a la vista (`SaveWarning`, fijo arriba a la derecha): la cabecera
	 * deja libre ese rincón para que no tape el candado.
	 */
	avisoAdulto?: boolean;
}) {
	const {
		stars,
		milestone,
		lastSavedAt,
		saveFailed,
		onOpenPanel,
		avisoAdulto = false,
	} = props;
	return (
		<header
			className={`flex shrink-0 items-center justify-between gap-3 border-b-2 border-node-locked-depth bg-card py-2 pl-4 ${avisoAdulto ? "pr-12" : "pr-4"}`}
		>
			<div className="flex items-center gap-2">
				<h1 className="flex items-center gap-1 text-2xl font-extrabold text-brand sm:text-3xl">
					Silabín
					<span aria-hidden="true" className="text-calm-border">
						✦
					</span>
				</h1>
				<SavedMark lastSavedAt={lastSavedAt} saveFailed={saveFailed} />
			</div>
			<div className="flex items-center gap-3">
				<StarCounter total={stars} milestone={milestone} />
				<AdultDoor onOpen={onOpenPanel}>
					<div
						role="img"
						aria-label="Panel de padres"
						className="flex size-11 items-center justify-center rounded-full border-2 border-node-locked-depth bg-card"
					>
						<Icon name="lock" size={24} />
					</div>
				</AdultDoor>
			</div>
		</header>
	);
}
