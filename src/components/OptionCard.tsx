import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

/**
 * `idle`: en reposo. `dimmed`: distractor ya descartado (opacidad y escala menor). `pulsing`:
 * pista activa que invita a tocar. `marked`: la opción que ha marcado el modelo.
 */
export type OptionState = "idle" | "dimmed" | "pulsing" | "marked";

type Props = {
	state: OptionState;
	/** Bloqueada (turno del modelo) o atenuada: el toque no llama a `onSelect`. */
	disabled: boolean;
	/** El niño no lee: el nombre accesible es para el adulto y los lectores de pantalla. */
	"aria-label": string;
	onSelect: () => void;
	/**
	 * Tamaño mínimo de 72 px en lugar de 128 px, para cuando hay muchas a la vez (la bandeja de
	 * piezas de `build`). Sigue siendo un objetivo táctil válido.
	 */
	compact?: boolean;
	/** Una `Picture`, una letra o una sílaba. */
	children: ReactNode;
};

const BASE =
	"relative flex items-center justify-center rounded-card font-reading text-ink";
const TAMAÑO = {
	normal: "min-h-target min-w-target",
	compact: "min-h-18 min-w-18",
};

// Cada estado se ve por su forma o su movimiento, nunca solo por el color (spec §9).
const ESTILO: Record<OptionState, string> = {
	idle: "bg-calm border-2 border-calm-border",
	dimmed: "scale-90 border-2 border-calm-border bg-calm opacity-30",
	pulsing: "border-4 border-calm-border bg-calm motion-safe:animate-pulse",
	marked: "border-8 border-mark-border bg-mark",
};

/** Una opción para tocar, sin lógica de pedagogía: solo pinta lo que le manda quien la usa. */
export function OptionCard(props: Props) {
	const {
		state,
		disabled,
		onSelect,
		compact = false,
		children,
		...rest
	} = props;
	return (
		<button
			type="button"
			data-state={state}
			aria-disabled={disabled}
			onClick={() => {
				if (disabled) return;
				onSelect();
			}}
			className={`${BASE} ${compact ? TAMAÑO.compact : TAMAÑO.normal} ${ESTILO[state]}`}
			{...rest}
		>
			{children}
			{state === "marked" && (
				<span
					aria-hidden="true"
					// El ancho va fijo: sin él, un `absolute` con `left-1/2` se encoge a la mitad de la
					// tarjeta y la mano de la compacta salía a 28 px. Los desplazamientos cuentan desde el borde interior (el marcado tiene 8 px de borde). En la compacta la mano baja hasta
					// apoyarse en el borde (sin llegar a la letra) y cabe en el hueco de la fila de arriba.
					className={`-translate-x-1/2 absolute left-1/2 ${compact ? "-top-9 w-10" : "-top-8 w-14"}`}
				>
					<Icon name="hand" size={compact ? 40 : 56} />
				</span>
			)}
		</button>
	);
}
