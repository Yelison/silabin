import type { Item } from "@/engine";

/**
 * Lo que el niño lee de un ítem. Una letra va siempre con su par, minúscula grande y mayúscula
 * al lado (spec §2: «par A/a siempre visible»); una sílaba o una palabra, en minúscula. La
 * fuente de lectura la pone quien lo contiene.
 */
export function Written(props: { item: Item; size: "lg" | "md" }) {
	const { item, size } = props;
	const grande = size === "lg" ? "text-9xl" : "text-7xl";
	const chica = size === "lg" ? "text-7xl" : "text-5xl";
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
