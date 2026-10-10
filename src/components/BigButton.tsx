import type { ButtonHTMLAttributes } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
	/** Versión de 72 px de alto para los pies fijos (`MapFooter`): el objetivo táctil, sin más. */
	compact?: boolean;
	/** El niño no lee: el nombre accesible es para el adulto y los lectores de pantalla. */
	"aria-label": string;
};

/** Botón grande de toque, con un icono como contenido. Sin texto propio. */
export function BigButton({
	className = "",
	type = "button",
	compact = false,
	...rest
}: Props) {
	const tamano = compact
		? "min-h-18 min-w-18 px-6 py-2 text-4xl"
		: "min-h-24 min-w-24 p-6 text-6xl";
	return (
		<button
			type={type}
			className={`flex ${tamano} items-center justify-center rounded-card bg-action text-action-ink shadow-md active:scale-95 ${className}`}
			{...rest}
		/>
	);
}
