export const ICON_NAMES = [
	"replay",
	"next",
	"drum",
	"hand",
	"yes",
	"no",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/**
 * Icono de interfaz, decorativo: el botón que lo contiene lleva el `aria-label`.
 * `size` en px (48 por defecto).
 */
export function Icon(props: { name: IconName; size?: number }) {
	const { name, size = 48 } = props;
	return (
		// biome-ignore lint/performance/noImgElement: PNG ya a su tamaño, precacheado por la PWA; next/image no aporta nada y necesita servidor
		<img
			src={`/icons/ui-${name}.png`}
			alt=""
			aria-hidden="true"
			width={size}
			height={size}
			draggable={false}
			className="pointer-events-none select-none"
		/>
	);
}
