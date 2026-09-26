import type { ButtonHTMLAttributes } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
	/** El niño no lee: el nombre accesible es para el adulto y los lectores de pantalla. */
	"aria-label": string;
};

/** Botón grande de toque, con un icono como contenido. Sin texto propio. */
export function BigButton({ className = "", type = "button", ...rest }: Props) {
	return (
		<button
			type={type}
			className={`flex min-h-24 min-w-24 items-center justify-center rounded-3xl bg-amber-300 p-6 text-6xl shadow-md active:scale-95 ${className}`}
			{...rest}
		/>
	);
}
