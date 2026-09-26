import type { ReactNode } from "react";

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
	/** Una `Picture`, una letra o una sílaba. */
	children: ReactNode;
};

const BASE =
	"relative flex min-h-target min-w-target items-center justify-center rounded-card font-reading text-ink";

// Cada estado se ve por su forma o su movimiento, nunca solo por el color (spec §9).
const ESTILO: Record<OptionState, string> = {
	idle: "bg-calm border-2 border-calm-border",
	dimmed: "scale-90 border-2 border-calm-border bg-calm opacity-30",
	pulsing: "border-4 border-calm-border bg-calm motion-safe:animate-pulse",
	marked: "border-8 border-mark-border bg-mark",
};

/** Una opción para tocar, sin lógica de pedagogía: solo pinta lo que le manda quien la usa. */
export function OptionCard(props: Props) {
	const { state, disabled, onSelect, children, ...rest } = props;
	return (
		<button
			type="button"
			data-state={state}
			aria-disabled={disabled}
			onClick={() => {
				if (disabled) return;
				onSelect();
			}}
			className={`${BASE} ${ESTILO[state]}`}
			{...rest}
		>
			{children}
			{state === "marked" && (
				<span aria-hidden="true" className="absolute -top-3 -right-3 text-4xl">
					👆
				</span>
			)}
		</button>
	);
}
