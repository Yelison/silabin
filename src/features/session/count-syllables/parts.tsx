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
					className={`h-6 w-6 rounded-full bg-mark ${i === props.count - 1 ? "scale-125 shadow-[0_0_16px_6px_rgba(255,226,122,0.7)]" : ""}`}
				/>
			))}
		</div>
	);
}
