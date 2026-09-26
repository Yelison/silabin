import { imageFor } from "@/images";

const TAMANO = {
	lg: "text-9xl",
	md: "text-6xl",
} as const;

export type PictureSize = keyof typeof TAMANO;

/** La imagen grande de la palabra (emoji provisional). Sin imagen no se pinta nada. */
export function Picture(props: {
	imageKey: string | undefined;
	size?: PictureSize;
}) {
	const { imageKey, size = "lg" } = props;
	const imagen = imageFor(imageKey ?? "");
	if (imagen === null) return null;
	return (
		<span
			role="img"
			aria-label={imagen.alt}
			className={`select-none leading-none ${TAMANO[size]}`}
		>
			{imagen.emoji}
		</span>
	);
}
