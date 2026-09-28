import type { Item } from "@/engine";
import { Written } from "@/features/session/listen-tap/Written";

/**
 * La palabra que el niño lee. Entera es `Written` (minúscula, con su tilde). Separada, las
 * sílabas van con un punto medio («ma·pa»), que es ayuda visual y no forma parte de la palabra:
 * el lector de pantalla recibe la palabra entera y salta el punto.
 */
export function Palabra(props: { item: Item; separada: boolean }) {
	const { item, separada } = props;
	if (!separada || item.syllables === undefined)
		return <Written item={item} size="lg" />;
	return (
		<span className="text-[min(8rem,26vw)] leading-none text-ink">
			<span aria-hidden="true">{item.syllables.join("·")}</span>
			<span className="sr-only">{item.text.toLowerCase()}</span>
		</span>
	);
}
