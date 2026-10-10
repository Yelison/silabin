import { worldName } from "@/engine";

/**
 * Una clase por mundo, escrita entera para que Tailwind la genere (MC13): nunca se monta con
 * una plantilla a partir de la fase.
 */
export const FONDO_MUNDO: Readonly<Record<number, string>> = {
	0: "bg-world-0",
	1: "bg-world-1",
	2: "bg-world-2",
	3: "bg-world-3",
};

/** El fondo de la fase; las que aún no tienen token caen en el beis neutro del mundo 3. */
export function fondoDeMundo(phase: number): string {
	return FONDO_MUNDO[phase] ?? "bg-world-3";
}

/**
 * Avance de la unidad activa (S17): un punto lleno por ítem dominado, sin huecos vacíos —el
 * niño ve lo ganado, no lo que falta. Con 0 dominados no se pinta nada (lo decide quien llama).
 */
function UnitDots({ mastered }: { mastered: number }) {
	return (
		<div
			role="img"
			aria-label={`${mastered} letras aprendidas`}
			className="flex flex-wrap items-center justify-center gap-1"
		>
			{Array.from({ length: mastered }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: puntos idénticos sin identidad propia
					key={i}
					aria-hidden="true"
					data-unit-dot
					className="h-3 w-3 rounded-full bg-calm-border"
				/>
			))}
		</div>
	);
}

/**
 * La tarjeta que abre cada mundo y corta el camino (D50). Es decoración y texto para el adulto:
 * ningún estado depende de su color (D48). Los puntos de avance solo salen en la del mundo de
 * la unidad activa (D57); sin icono (MC2).
 */
export function ChapterCard(props: {
	phase: number;
	/** Ítems dominados de la unidad activa si es de esta fase y > 0; si no, null. */
	mastered: number | null;
}) {
	const { phase, mastered } = props;
	return (
		<div
			className={`flex items-center justify-between gap-3 rounded-card border-b-4 border-chapter-edge px-4 py-3 text-ink ${fondoDeMundo(phase)}`}
		>
			<div className="flex flex-col">
				<span className="text-xs font-bold tracking-widest">
					{/* Una sola cadena: dos nodos de texto («MUNDO » y «3») se verían como un «3» suelto. */}
					{`MUNDO ${phase + 1}`}
				</span>
				<span className="text-xl font-extrabold">{worldName(phase)}</span>
			</div>
			{mastered !== null && <UnitDots mastered={mastered} />}
		</div>
	);
}
