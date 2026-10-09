import { createElement } from "react";
import {
	BADGE_ICONS,
	type BadgeId,
	type IconShape,
	isLetterIcon,
	UNIT_ICONS,
} from "@/features/map/unit-icons";

/** `stroke-width` → `strokeWidth`: React espera camelCase en los atributos SVG. */
function aCamelCase(clave: string): string {
	return clave.replace(/-([a-z])/g, (_, letra: string) => letra.toUpperCase());
}

function Formas({ formas }: { formas: readonly IconShape[] }) {
	// biome-ignore-start lint/suspicious/noArrayIndexKey: lista estática de formas, nunca se reordena
	return formas.map(([tag, attrs], i) =>
		createElement(tag, {
			...Object.fromEntries(
				Object.entries(attrs).map(([k, v]) => [aCamelCase(k), v]),
			),
			key: i,
		}),
	);
	// biome-ignore-end lint/suspicious/noArrayIndexKey: lista estática de formas, nunca se reordena
}

export function UnitIcon({
	unitId,
	className,
}: {
	unitId: string;
	className?: string;
}) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.3}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			data-letter={isLetterIcon(unitId) ? "true" : undefined}
			className={className}
		>
			<Formas formas={UNIT_ICONS[unitId] ?? []} />
		</svg>
	);
}

export function BadgeIcon({
	badge,
	className,
}: {
	badge: BadgeId;
	className?: string;
}) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={badge === "check" ? 3 : 2.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			<Formas formas={BADGE_ICONS[badge]} />
		</svg>
	);
}
