import type { Unit, UnitProgress } from "@/engine";
import { type NodeLook, nodeLook } from "@/features/map/node-look";
import { BadgeIcon, UnitIcon } from "@/features/map/UnitIcon";
import { type BadgeId, isLetterIcon } from "@/features/map/unit-icons";

export const LLEGA_DESPUES = "Llega en una próxima versión";

/**
 * Clases de cada aspecto. Tailwind solo genera las que aparecen escritas enteras: por eso van
 * en una tabla literal y no montadas con plantillas.
 */
const ASPECTO: Record<
	NodeLook,
	{ cara: string; borde: string; insignia: string | null; aro: string }
> = {
	available: {
		cara: "bg-action text-action-ink shadow-[inset_0_-5px_0_var(--color-action-depth)]",
		borde: "border-surface",
		insignia: null,
		aro: "before:absolute before:-inset-3.5 before:rounded-full before:border-5 before:border-mark before:pointer-events-none",
	},
	completed: {
		cara: "bg-calm-border text-card shadow-[inset_0_-5px_0_var(--color-calm-depth)]",
		borde: "border-calm",
		insignia: "bg-card text-calm-border border-calm-depth",
		aro: "",
	},
	locked: {
		cara: "bg-node-locked text-node-locked-ink shadow-[inset_0_-5px_0_var(--color-node-locked-depth)]",
		borde: "border-card",
		insignia: "bg-card text-node-locked-ink border-node-locked-depth",
		aro: "",
	},
	soon: {
		cara: "bg-node-locked text-node-locked-ink shadow-[inset_0_-5px_0_var(--color-node-locked-depth)]",
		borde: "border-card",
		insignia: "bg-card text-node-locked-ink border-node-locked-depth",
		aro: "",
	},
};

const INSIGNIA: Record<NodeLook, BadgeId | null> = {
	available: null,
	completed: "check",
	locked: "lock",
	soon: "soon",
};

function Estrellas({ n }: { n: number }) {
	return (
		<span className="text-celebrate">
			{[0, 1, 2].map((i) => (
				<span key={i}>{i < n ? "★" : "☆"}</span>
			))}
		</span>
	);
}

/**
 * Un nodo del camino. Pinta lo que dicen `progress` y `playable` (el motor y el registro de
 * sesiones) y no decide nada: solo avisa con `onStart` cuando la unidad es jugable.
 */
export function MapNode(props: {
	unit: Unit;
	progress: UnitProgress | undefined;
	playable: boolean;
	onStart: () => void;
}) {
	const { unit, progress, playable, onStart } = props;
	// Lo que no consta como terminado ni activo se trata como bloqueado.
	const status = progress?.status ?? "locked";
	const stars = progress?.bestStars ?? 0;
	const look = nodeLook(progress?.status, playable);
	const aspecto = ASPECTO[look];
	const insignia = INSIGNIA[look];

	let label: string;
	if (look === "soon") label = LLEGA_DESPUES;
	else if (look === "completed")
		label = `${unit.title}, ${stars} de 3 estrellas`;
	else if (look === "locked") label = `${unit.title}, bloqueada`;
	else label = unit.title;

	const disponible = look === "available";
	const prensable = disponible ? "motion-safe:active:translate-y-0.5" : "";

	return (
		<button
			type="button"
			data-unit={unit.id}
			data-status={status}
			data-look={look}
			aria-label={label}
			aria-current={status === "active" ? "step" : undefined}
			aria-disabled={disponible || look === "completed" ? undefined : true}
			onClick={() => {
				if (disponible) onStart();
			}}
			className={`flex min-h-18 min-w-18 flex-col items-center rounded-3xl focus-visible:outline-3 focus-visible:outline-offset-18 focus-visible:outline-trace-ink ${prensable}`}
		>
			{/* La ficha es opaca (V13): el estado se marca con color, insignia y aro, no con opacidad. */}
			<span
				className={`relative grid size-22 shrink-0 place-items-center rounded-full ${aspecto.cara} ${aspecto.aro}`}
			>
				<span
					className={`absolute inset-[9px] grid place-items-center rounded-full border-2 ${aspecto.borde}`}
				>
					<span data-symbol className="contents">
						<UnitIcon
							unitId={unit.id}
							className={isLetterIcon(unit.id) ? "size-11" : "size-9"}
						/>
					</span>
				</span>
				{insignia !== null && aspecto.insignia !== null && (
					<span
						data-badge={insignia}
						className={`absolute -right-1 -bottom-0.5 grid size-7 place-items-center rounded-full border-3 ${aspecto.insignia}`}
					>
						<BadgeIcon badge={insignia} className="size-3.5" />
					</span>
				)}
			</span>
			{look === "completed" && (
				<span
					aria-hidden="true"
					className="mt-1 rounded-full bg-card px-2 text-lg"
				>
					<Estrellas n={stars} />
				</span>
			)}
		</button>
	);
}
