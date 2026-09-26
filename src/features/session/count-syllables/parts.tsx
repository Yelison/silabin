import { imageFor } from "@/images";

/** La imagen grande de la palabra (emoji provisional). Sin imagen no se pinta nada. */
export function Imagen(props: { imageKey: string | undefined }) {
	const imagen = imageFor(props.imageKey ?? "");
	if (imagen === null) return null;
	return (
		<span
			role="img"
			aria-label={imagen.alt}
			className="select-none text-9xl leading-none"
		>
			{imagen.emoji}
		</span>
	);
}

/**
 * Una luz por sílaba que ya ha sonado. Crecen con el sonido y no antes: pintar de entrada tantas
 * luces como sílabas diría el número, y la pista tiene que ser el sonido, no la cifra.
 */
export function Luces(props: { count: number }) {
	// El hueco se reserva siempre: si la primera luz lo creara, empujaría el tambor.
	return (
		<div
			aria-hidden="true"
			data-lights
			className="flex min-h-8 items-center gap-3"
		>
			{Array.from({ length: props.count }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: las luces no tienen identidad propia
					key={i}
					data-light
					className={`h-6 w-6 rounded-full ${i === props.count - 1 ? "scale-125 bg-yellow-300 shadow-[0_0_16px_6px_rgba(253,224,71,0.8)]" : "bg-yellow-200"}`}
				/>
			))}
		</div>
	);
}
