import type { Item } from "@/engine";

/**
 * Lo que el niño lee de un ítem. Una letra va siempre con su par, minúscula grande y mayúscula
 * al lado (spec §2: «par A/a siempre visible»); una sílaba o una palabra, en minúscula. La
 * fuente de lectura la pone quien lo contiene.
 */
export function Written(props: { item: Item; size: "lg" | "md" }) {
	const { item, size } = props;
	// En grande, el tamaño se ajusta al ancho: una palabra de cuatro letras a `text-9xl` mide
	// ~406 px y a 360 px de pantalla se cortaba. Con `min()` sigue en 8 rem en pantallas anchas.
	const grande = size === "lg" ? "text-[min(8rem,26vw)]" : "text-7xl";
	const chica = size === "lg" ? "text-[min(4.5rem,15vw)]" : "text-5xl";
	if (item.display !== undefined)
		return (
			<span className="flex items-baseline gap-3 leading-none text-ink">
				<span className={grande}>{item.display.lower}</span>
				<span className={chica}>{item.display.upper}</span>
			</span>
		);
	return (
		<span className={`${grande} leading-none text-ink`}>
			{item.text.toLowerCase()}
		</span>
	);
}
