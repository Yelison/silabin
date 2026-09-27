import { Icon } from "@/components/Icon";

type Props = {
	onReplay: () => void;
	disabled?: boolean;
	/** El niño no lee: el nombre accesible es para el adulto y los lectores de pantalla. */
	"aria-label": string;
};

/**
 * Botón de "oír otra vez": solo pinta e informa del toque. No decide qué suena ni cuándo;
 * eso lo decide quien lo usa. Icono fijo, sin texto para el niño.
 */
export function ReplayButton(props: Props) {
	const { onReplay, disabled = false, ...rest } = props;
	return (
		<button
			type="button"
			aria-disabled={disabled}
			onClick={() => {
				if (disabled) return;
				onReplay();
			}}
			className={`flex min-h-18 min-w-18 items-center justify-center rounded-card bg-action p-4 text-action-ink shadow-md active:scale-95 ${disabled ? "opacity-30" : ""}`}
			{...rest}
		>
			<Icon name="replay" />
		</button>
	);
}
