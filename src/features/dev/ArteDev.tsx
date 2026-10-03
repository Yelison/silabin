"use client";

import { useEffect, useState } from "react";
import { type Art, ArtImage } from "@/components/ArtImage";
import { BigButton } from "@/components/BigButton";
import { ICON_NAMES, Icon } from "@/components/Icon";
import { MOUTH_SHAPES, Mouth } from "@/components/Mouth";
import { cosmeticVisual } from "@/features/rewards/visuals";
import { WorldExploration } from "@/features/dev/WorldExploration";

// Herramienta de desarrollo (V15): enseña el arte y la paleta sueltos, sin sesión ni estado del
// store, para revisar de un vistazo que casan. Los ratios se calculan aquí, en el navegador, con
// el color que pinta cada muestra: así no hay una copia de la paleta que se quede atrás.

/** Cada token con su clase literal (Tailwind solo genera las clases que ve escritas). */
const MUESTRAS: readonly { token: string; clase: string; uso: string }[] = [
	{ token: "surface", clase: "bg-surface", uso: "fondo de pantalla y bandas" },
	{ token: "card", clase: "bg-card", uso: "tarjetas y opciones" },
	{ token: "ink", clase: "bg-ink", uso: "letras y sílabas" },
	{ token: "ink-soft", clase: "bg-ink-soft", uso: "texto de adulto" },
	{ token: "action", clase: "bg-action", uso: "lo que se toca" },
	{
		token: "action-ink",
		clase: "bg-action-ink",
		uso: "contenido sobre action",
	},
	{ token: "calm", clase: "bg-calm", uso: "opciones en reposo" },
	{ token: "calm-border", clase: "bg-calm-border", uso: "borde en reposo" },
	{ token: "mark", clase: "bg-mark", uso: "opción marcada" },
	{ token: "mark-border", clase: "bg-mark-border", uso: "borde de lo marcado" },
	{
		token: "celebrate",
		clase: "bg-celebrate",
		uso: "estrellas y celebraciones",
	},
	{ token: "trace-ink", clase: "bg-trace-ink", uso: "trazo del dedo" },
];

/** Los pares de CO1 (`tokens.test.ts`): texto ≥ 4,5 y bordes de estado ≥ 3. */
const PARES: readonly { fg: string; bg: string; minimo: number }[] = [
	{ fg: "ink", bg: "surface", minimo: 4.5 },
	{ fg: "ink", bg: "card", minimo: 4.5 },
	{ fg: "ink", bg: "calm", minimo: 4.5 },
	{ fg: "ink", bg: "mark", minimo: 4.5 },
	{ fg: "ink", bg: "action", minimo: 4.5 },
	{ fg: "ink-soft", bg: "surface", minimo: 4.5 },
	{ fg: "ink-soft", bg: "card", minimo: 4.5 },
	{ fg: "action-ink", bg: "action", minimo: 4.5 },
	{ fg: "calm-border", bg: "surface", minimo: 3 },
	{ fg: "calm-border", bg: "card", minimo: 3 },
	{ fg: "calm-border", bg: "calm", minimo: 3 },
	{ fg: "mark-border", bg: "surface", minimo: 3 },
	{ fg: "mark-border", bg: "card", minimo: 3 },
	{ fg: "mark-border", bg: "mark", minimo: 3 },
];

type Rgb = [number, number, number];

function aRgb(css: string): Rgb | null {
	const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
	return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}

function aHex([r, g, b]: Rgb): string {
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function luminancia(rgb: Rgb): number {
	const [r, g, b] = rgb.map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	}) as Rgb;
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: Rgb, b: Rgb): number {
	const [la, lb] = [luminancia(a), luminancia(b)];
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** El color que el navegador pinta para cada token, leído de las propias muestras. */
function useColores(): Record<string, Rgb> {
	const [colores, setColores] = useState<Record<string, Rgb>>({});
	useEffect(() => {
		const leidos: Record<string, Rgb> = {};
		for (const el of document.querySelectorAll<HTMLElement>("[data-token]")) {
			const rgb = aRgb(getComputedStyle(el).backgroundColor);
			if (rgb !== null && el.dataset.token !== undefined)
				leidos[el.dataset.token] = rgb;
		}
		setColores(leidos);
	}, []);
	return colores;
}

function Paleta() {
	const colores = useColores();
	return (
		<section aria-labelledby="arte-paleta" className="flex flex-col gap-4">
			<h2 id="arte-paleta" className="text-2xl font-bold">
				Paleta
			</h2>
			<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{MUESTRAS.map(({ token, clase, uso }) => {
					const rgb = colores[token];
					return (
						<li key={token} className="flex flex-col gap-1">
							<span
								data-token={token}
								className={`h-16 rounded-card border-2 border-ink-soft ${clase}`}
							/>
							<span className="font-semibold">{token}</span>
							<span className="text-sm text-ink-soft">
								{rgb === undefined ? "…" : aHex(rgb)} · {uso}
							</span>
						</li>
					);
				})}
			</ul>
			<table className="w-full max-w-xl border-collapse text-left">
				<caption className="pb-2 text-left text-sm text-ink-soft">
					Contraste (CO1): texto ≥ 4,5 y bordes de estado ≥ 3
				</caption>
				<thead>
					<tr>
						<th className="border-b-2 border-ink-soft py-1">Par</th>
						<th className="border-b-2 border-ink-soft py-1">Ratio</th>
						<th className="border-b-2 border-ink-soft py-1">Mínimo</th>
					</tr>
				</thead>
				<tbody>
					{PARES.map(({ fg, bg, minimo }) => {
						const a = colores[fg];
						const b = colores[bg];
						const r = a === undefined || b === undefined ? null : ratio(a, b);
						return (
							<tr key={`${fg}-${bg}`}>
								<td className="py-1">
									{fg} sobre {bg}
								</td>
								<td className="py-1">
									{r === null ? "…" : `${r.toFixed(2)} : 1`}
									{r !== null && r >= minimo ? " ✓" : ""}
								</td>
								<td className="py-1">{minimo} : 1</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</section>
	);
}

function Companeros() {
	const ids = ["companion:first", "companion:second"];
	return (
		<section aria-labelledby="arte-companeros" className="flex flex-col gap-4">
			<h2 id="arte-companeros" className="text-2xl font-bold">
				Compañeros, sin y con gorra
			</h2>
			{[112, 160].map((size) => (
				<div key={size} className="flex flex-wrap items-end gap-6">
					<span className="w-16 text-sm text-ink-soft">{size} px</span>
					{ids.map((id) => {
						const visual = cosmeticVisual(id);
						if (visual.slot !== "companion") return null;
						return [visual.art, visual.withCap].map((art, i) => (
							<span
								key={`${id}-${art.src}`}
								className="rounded-card bg-surface p-3"
								title={i === 0 ? `${id}, sin gorra` : `${id}, con gorra`}
							>
								<ArtImage art={art} size={size} />
							</span>
						));
					})}
				</div>
			))}
		</section>
	);
}

const FONDOS = ["bg:default", "bg:pradera", "bg:espacio", "bg:bosque"];

/** La banda del mapa a escala: título, contador de estrellas y una unidad activa. */
function BandaMapa() {
	return (
		<div className="flex w-full flex-col items-center gap-2 rounded-card bg-surface p-3">
			<span className="text-xl font-bold">Silabín</span>
			<span className="flex items-center gap-1 font-semibold">
				<span aria-hidden="true" className="text-celebrate">
					★
				</span>
				<span>27</span>
			</span>
			<span className="h-2 w-24 overflow-hidden rounded-full border-2 border-calm-border bg-card">
				<span className="block h-full w-1/2 rounded-full bg-celebrate" />
			</span>
			<span className="w-full rounded-2xl bg-action p-2 text-center text-sm font-semibold ring-2 ring-action">
				Unidad activa
			</span>
		</div>
	);
}

/** Un fondo equipado a pantalla reducida, con la banda del mapa encima, en el formato dado. */
function MarcoFondo(props: { id: string; forma: string; clase: string }) {
	const visual = cosmeticVisual(props.id);
	const [fallida, setFallida] = useState(false);
	if (visual.slot !== "background") return null;
	return (
		<figure className="flex flex-col gap-1">
			<div
				className={`relative isolate flex items-start justify-center overflow-hidden rounded-card p-3 bg-gradient-to-b ${visual.gradient} ${props.clase}`}
			>
				{!fallida && (
					// biome-ignore lint/performance/noImgElement: página de desarrollo; el WebP ya viene a su tamaño y next/image no aporta nada
					<img
						src={visual.src}
						alt=""
						aria-hidden="true"
						draggable={false}
						onError={() => setFallida(true)}
						className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover"
					/>
				)}
				<BandaMapa />
			</div>
			<figcaption className="text-sm text-ink-soft">
				{props.id}, {props.forma}
			</figcaption>
		</figure>
	);
}

function Fondos() {
	return (
		<section aria-labelledby="arte-fondos" className="flex flex-col gap-4">
			<h2 id="arte-fondos" className="text-2xl font-bold">
				Fondos con la banda del mapa
			</h2>
			<p className="max-w-xl text-sm text-ink-soft">
				Retrato 3:4 y apaisado 16:9: el recorte con <code>object-cover</code> no
				debe dejar franjas ni tapar lo importante.
			</p>
			<div className="flex flex-wrap items-start gap-6">
				{FONDOS.map((id) => (
					<MarcoFondo key={`r-${id}`} id={id} forma="3:4" clase="h-80 w-60" />
				))}
			</div>
			<div className="flex flex-wrap items-start gap-6">
				{FONDOS.map((id) => (
					<MarcoFondo key={`a-${id}`} id={id} forma="16:9" clase="h-45 w-80" />
				))}
			</div>
		</section>
	);
}

const nombre = (n: string, emoji: string): Art => ({
	src: `/images/arte/${n}.webp`,
	emoji,
});

const PIEZAS: readonly { etiqueta: string; art: Art; size: number }[] = [
	{ etiqueta: "sticker-avion", art: nombre("sticker-avion", "✈️"), size: 96 },
	{ etiqueta: "sticker-10", art: nombre("sticker-10", "🌟"), size: 96 },
	{ etiqueta: "sticker-25", art: nombre("sticker-25", "🌟"), size: 96 },
	{ etiqueta: "sticker-50", art: nombre("sticker-50", "🌟"), size: 96 },
	{ etiqueta: "sticker-100", art: nombre("sticker-100", "🌟"), size: 96 },
	{ etiqueta: "trophy", art: nombre("trophy", "🏆"), size: 96 },
	{
		etiqueta: "particle-estrellita",
		art: nombre("particle-estrellita", "✨"),
		size: 48,
	},
	{
		etiqueta: "particle-burbuja",
		art: nombre("particle-burbuja", "🫧"),
		size: 48,
	},
];

function Pegatinas() {
	return (
		<section aria-labelledby="arte-pegatinas" className="flex flex-col gap-4">
			<h2 id="arte-pegatinas" className="text-2xl font-bold">
				Pegatinas, trofeo y partículas
			</h2>
			<ul className="flex flex-wrap items-end gap-4">
				{PIEZAS.map(({ etiqueta, art, size }) => (
					<li
						key={etiqueta}
						className="flex flex-col items-center gap-1 rounded-card bg-surface p-3"
					>
						<ArtImage art={art} size={size} />
						<span className="text-xs text-ink-soft">{etiqueta}</span>
					</li>
				))}
				{["estrellita", "burbuja"].map((n) => (
					<li
						key={n}
						className="flex flex-col items-center gap-1 rounded-card bg-surface p-3"
					>
						{/* biome-ignore lint/performance/noImgElement: página de desarrollo; PNG ya a su tamaño */}
						<img
							src={`/icons/cursor-${n}.png`}
							alt=""
							aria-hidden="true"
							width={32}
							height={32}
						/>
						<span className="text-xs text-ink-soft">cursor-{n}</span>
					</li>
				))}
			</ul>
		</section>
	);
}

/**
 * Devuelve `true` solo en el navegador, tras hidratar. Con `BOCAS_PUBLICADAS` encendido, `Mouth`
 * cae al dibujo esquemático con el `onError` de sus `<img>`, pero React no ve un error de carga
 * que ocurre antes de hidratar: si el servidor pinta fotogramas que no existen, se quedan rotos.
 * Aquí las bocas se pintan ya en el cliente, como en la app (donde salen tras un toque).
 */
function useMontado(): boolean {
	const [montado, setMontado] = useState(false);
	useEffect(() => setMontado(true), []);
	return montado;
}

function Bocas() {
	const montado = useMontado();
	return (
		<section aria-labelledby="arte-bocas" className="flex flex-col gap-4">
			<h2 id="arte-bocas" className="text-2xl font-bold">
				Las seis bocas, a 128 px
			</h2>
			<p
				data-nota="bocas-aplazadas"
				className="max-w-xl rounded-card bg-mark p-3 text-sm"
			>
				El arte de las bocas está aplazado: todavía no hay ningún{" "}
				<code>mouth-*.webp</code> y <code>BOCAS_PUBLICADAS</code> está apagado,
				así que aquí se ve el dibujo esquemático del componente{" "}
				<code>Mouth</code>.
			</p>
			<ul className="flex flex-wrap items-center gap-4">
				{MOUTH_SHAPES.map((forma) => (
					<li
						key={forma}
						className="flex flex-col items-center gap-1 rounded-card bg-surface p-3"
					>
						{montado ? (
							<Mouth shapes={[forma]} playing={false} />
						) : (
							<span className="size-32" />
						)}
						<span className="text-xs text-ink-soft">{forma}</span>
					</li>
				))}
			</ul>
		</section>
	);
}

function Iconos() {
	return (
		<section aria-labelledby="arte-iconos" className="flex flex-col gap-4">
			<h2 id="arte-iconos" className="text-2xl font-bold">
				Iconos dentro de BigButton
			</h2>
			<ul className="flex flex-wrap gap-4">
				{ICON_NAMES.map((n) => (
					<li key={n} className="flex flex-col items-center gap-1">
						<BigButton aria-label={n}>
							<Icon name={n} />
						</BigButton>
						<span className="text-xs text-ink-soft">{n}</span>
					</li>
				))}
			</ul>
		</section>
	);
}

export function ArteDev() {
	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-6">
			<h1 className="text-3xl font-bold">Arte y paleta (desarrollo)</h1>
			<Paleta />
			<WorldExploration />
			<Companeros />
			<Fondos />
			<Pegatinas />
			<Bocas />
			<Iconos />
		</main>
	);
}
