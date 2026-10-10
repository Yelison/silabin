"use client";

import { BigButton } from "@/components/BigButton";
import { Icon } from "@/components/Icon";
import { LLEGA_DESPUES } from "@/features/map/MapNode";
import { Companion } from "@/features/rewards/Companion";

/** La cara del botón grande: la decide `MapScreen` a partir del motor, no el pie. */
export type PlayMode = "play" | "review" | "soon";

/**
 * El pie fijo del mapa (MC4, D53-D55): «Mis premios», el botón grande y el compañero. Va en
 * `bg-card` opaco (MC14). Las palabras «Jugar», «Repasar» y «Mis premios» son para el adulto
 * (MC11); el niño se guía por el icono.
 */
export function MapFooter(props: {
	mode: PlayMode;
	onStart: () => void;
	onOpenRewards: () => void;
}) {
	const { mode, onStart, onOpenRewards } = props;
	const soon = mode === "soon";
	return (
		<footer className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t-2 border-node-locked-depth bg-card px-4 py-2 apaisado-bajo:py-1">
			<button
				type="button"
				aria-label="Mis premios"
				onClick={onOpenRewards}
				className="flex min-h-18 min-w-18 flex-col items-center justify-center justify-self-start rounded-card bg-calm px-3 text-ink"
			>
				<Icon name="gallery" size={36} />
				<span className="text-sm font-semibold">Mis premios</span>
			</button>
			<BigButton
				compact
				aria-label={
					soon ? LLEGA_DESPUES : mode === "review" ? "Repasar" : "Jugar"
				}
				aria-disabled={soon ? true : undefined}
				onClick={() => {
					if (!soon) onStart();
				}}
			>
				{/* La opacidad va en el contenido, no en el botón: el botón sigue siendo una
				    superficie opaca (LE1-LE6, MC12). */}
				<span className={`flex items-center gap-2 ${soon ? "opacity-50" : ""}`}>
					<span aria-hidden="true">{mode === "review" ? "🔁" : "▶"}</span>
					<span className="text-xl font-extrabold">
						{mode === "review" ? "Repasar" : "Jugar"}
					</span>
				</span>
			</BigButton>
			<Companion
				size={72}
				className="size-18 justify-self-end apaisado-bajo:size-14"
			/>
		</footer>
	);
}
