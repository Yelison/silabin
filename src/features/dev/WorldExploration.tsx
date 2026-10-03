"use client";

import { type CSSProperties, useState } from "react";

type LevelState = "completed" | "current" | "locked";

type LevelNodeProps = {
	number: number;
	label: string;
	state: LevelState;
	stars?: number;
	left: string;
	top: string;
};

const HQ = "/images/worlds/hq";
const SHARED = "/images/worlds/shared";

function HqImage({
	src,
	fallback,
	alt = "",
	className = "",
	style,
}: {
	src: string;
	fallback: string;
	alt?: string;
	className?: string;
	style?: CSSProperties;
}) {
	const [resolvedSrc, setResolvedSrc] = useState(src);

	return (
		// biome-ignore lint/performance/noImgElement: playground visual con fallback explícito
		<img
			src={resolvedSrc}
			alt={alt}
			aria-hidden={alt === "" ? "true" : undefined}
			draggable={false}
			className={className}
			style={style}
			onError={() => {
				if (resolvedSrc !== fallback) setResolvedSrc(fallback);
			}}
		/>
	);
}

function LevelNode({
	number,
	label,
	state,
	stars = 0,
	left,
	top,
}: LevelNodeProps) {
	const current = state === "current";
	const completed = state === "completed";
	const locked = state === "locked";

	const houseSrc = current
		? `${HQ}/level-house-current.webp`
		: completed
			? `${HQ}/level-house-completed.webp`
			: `${HQ}/level-house-locked.webp`;

	const nodeSize = current ? 140 : 96;

	return (
		<div
			data-world-node={state}
			className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
			style={{ left, top }}
			title={label}
			aria-label={`Nivel ${number}: ${label}`}
		>
			<div
				className="relative"
				style={{ width: nodeSize, height: current ? 166 : 110 }}
			>
				{current && (
					<div
						aria-hidden="true"
						className="absolute left-1/2 top-[40%] -z-10 h-[74%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFE178]/32 blur-xl"
					/>
				)}

				<HqImage
					src={houseSrc}
					fallback={`${SHARED}/house-01.svg`}
					className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 object-contain drop-shadow-[0_8px_10px_rgba(52,61,72,0.16)]"
					style={{ width: nodeSize, height: nodeSize }}
				/>

				<span
					className={
						current
							? "absolute left-1/2 top-[67%] flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-action text-[12px] font-extrabold text-action-ink shadow-[0_3px_8px_rgba(124,86,0,0.20)]"
							: "absolute left-1/2 top-[66%] flex size-5 -translate-x-1/2 items-center justify-center rounded-full bg-white/96 text-[9px] font-extrabold text-[#234A91] shadow-[0_2px_5px_rgba(45,57,78,0.16)]"
					}
				>
					{number}
				</span>

				{current && (
					<>
						<div className="absolute left-1/2 top-[77%] w-[136px] -translate-x-1/2 rounded-[1rem] border border-[#F5D98B]/45 bg-[#FFF8E9]/97 px-3 py-2 text-center shadow-[0_5px_12px_rgba(90,67,29,0.12)]">
							<span className="block text-[11px] font-extrabold leading-[1.12] text-[#173B6C]">
								{label}
							</span>
							<div className="mt-1 whitespace-nowrap text-[15px] font-extrabold tracking-[0.07em] text-celebrate drop-shadow-[0_1px_0_white]">
								{[0, 1, 2].map((i) => (
									<span key={i}>{i < stars ? "★" : "☆"}</span>
								))}
							</div>
						</div>
					</>
				)}

				{completed && !current && (
					<div className="absolute left-1/2 top-[86%] -translate-x-1/2 whitespace-nowrap text-[11px] font-extrabold tracking-[0.05em] text-celebrate">
						{[0, 1, 2].map((i) => (
							<span key={i}>{i < stars ? "★" : "☆"}</span>
						))}
					</div>
				)}

				{locked && (
					<span
						aria-hidden="true"
						className="absolute left-1/2 top-[82%] flex size-[16px] -translate-x-1/2 items-center justify-center rounded-full bg-[#E6E2DC]/96 text-[8px] shadow-sm"
					>
						🔒
					</span>
				)}
			</div>
		</div>
	);
}

function StateSample({
	state,
	title,
	detail,
}: {
	state: LevelState;
	title: string;
	detail: string;
}) {
	const styles = {
		completed: "bg-white border-white",
		current: "bg-action border-[#FFE27A]",
		locked: "bg-[#E9E2D7] border-white",
	}[state];

	return (
		<div className="flex items-center gap-3 rounded-card bg-card p-3 shadow-sm">
			<span
				className={`flex size-12 shrink-0 items-center justify-center rounded-full border-4 text-lg font-extrabold shadow-md ${styles}`}
			>
				{state === "locked" ? "🔒" : state === "current" ? "1" : "2"}
			</span>
			<span>
				<span className="block text-sm font-bold">{title}</span>
				<span className="block text-xs text-ink-soft">{detail}</span>
			</span>
		</div>
	);
}


export function WorldExploration() {
	const levels: LevelNodeProps[] = [
		{
			number: 1,
			label: "Palabras con palmas",
			state: "current",
			stars: 2,
			left: "17%",
			top: "49%",
		},
		{
			number: 2,
			label: "Rimas saltarinas",
			state: "locked",
			left: "34%",
			top: "41%",
		},
		{
			number: 3,
			label: "Detectives de sonidos",
			state: "locked",
			left: "48%",
			top: "45%",
		},
		{
			number: 4,
			label: "¿Lo oyes?",
			state: "locked",
			left: "61%",
			top: "39%",
		},
		{
			number: 5,
			label: "La vocal a",
			state: "locked",
			left: "75%",
			top: "42%",
		},
		{
			number: 6,
			label: "La vocal e",
			state: "locked",
			left: "87%",
			top: "50%",
		},
		{
			number: 7,
			label: "La vocal o",
			state: "locked",
			left: "82%",
			top: "62%",
		},
		{
			number: 8,
			label: "La vocal i",
			state: "locked",
			left: "69%",
			top: "63%",
		},
		{
			number: 9,
			label: "La vocal u",
			state: "locked",
			left: "55%",
			top: "62%",
		},
		{
			number: 10,
			label: "La m y sus sílabas",
			state: "locked",
			left: "38%",
			top: "64%",
		},
	];

	return (
		<section
			aria-labelledby="world-exploration-title"
			className="flex flex-col gap-5"
			style={{ fontFamily: "var(--font-nunito), sans-serif" }}
		>
			<div className="flex max-w-3xl flex-col gap-2">
				<h2 id="world-exploration-title" className="text-2xl font-extrabold">
					Silabín — World Exploration
				</h2>
				<p className="text-sm font-semibold leading-relaxed text-ink-soft">
					Dirección HQ refinada: nodos compactos sobre el sendero, menos ruido
					visual y una jerarquía mucho más cercana al concepto de referencia.
				</p>
			</div>

			<div className="overflow-x-auto pb-2">
				<div className="min-w-[980px]">
					<div
						data-world-composition
						className="relative isolate mx-auto aspect-[16/10] w-full max-w-[1180px] overflow-hidden rounded-[2.25rem] border-[11px] border-[#20242D] bg-[#BDEBFF] shadow-[0_24px_58px_rgba(43,42,51,0.20)]"
					>
						<HqImage
							src={`${HQ}/bg-world-01.webp`}
							fallback="/images/arte/bg-pradera.webp"
							className="absolute inset-0 -z-20 h-full w-full object-cover"
							style={{ filter: "saturate(.70) brightness(1.07) contrast(.90)" }}
						/>
						<div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,251,241,0.16)_0%,rgba(255,255,255,0.12)_44%,rgba(255,249,235,0.10)_100%)]" />

						<HqImage
							src={`${HQ}/cloud-01.webp`}
							fallback={`${SHARED}/cloud-01.svg`}
							className="world-cloud-a pointer-events-none absolute left-[3%] top-[3%] z-[2] w-[14%] opacity-[0.48]"
						/>
						<HqImage
							src={`${HQ}/cloud-02.webp`}
							fallback={`${SHARED}/cloud-02.svg`}
							className="world-cloud-b pointer-events-none absolute right-[10%] top-[6%] z-[2] w-[13%] opacity-[0.42]"
						/>

						<div className="absolute left-[2.4%] top-[2.5%] z-40 flex items-center gap-2 rounded-[1rem] border border-white/80 bg-white/95 px-3 py-2 shadow-[0_7px_18px_rgba(35,74,145,0.14)]">
							<div
								aria-hidden="true"
								className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(145deg,#CBEAFF,#FFF2C8)] text-[15px] font-extrabold text-[#234A91] shadow-inner"
							>
								M
							</div>
							<div className="leading-tight">
								<div className="text-[11px] font-extrabold text-[#173B6C]">Mateo</div>
								<div className="text-[11px] font-extrabold text-celebrate">★ 12</div>
							</div>
						</div>

						<h3 className="absolute left-1/2 top-[2.4%] z-40 -translate-x-1/2 text-[34px] font-extrabold tracking-[-0.035em] text-[#234A91] drop-shadow-[0_2px_0_rgba(255,255,255,0.75)]">
							Silabín
						</h3>

						<button
							type="button"
							aria-label="Configuración"
							className="absolute right-[2.5%] top-[2.7%] z-40 flex size-10 items-center justify-center rounded-full border border-white/90 bg-white/96 text-[18px] shadow-[0_6px_16px_rgba(35,74,145,0.14)]"
						>
							<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-[#234A91] stroke-[2.2]">
								<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
								<path d="M19 13.1v-2.2l-2-.6a7.5 7.5 0 0 0-.8-1.8l1-1.8-1.6-1.6-1.8 1a7.5 7.5 0 0 0-1.8-.8l-.6-2H9.2l-.6 2a7.5 7.5 0 0 0-1.8.8L5 5.1 3.4 6.7l1 1.8a7.5 7.5 0 0 0-.8 1.8l-2 .6v2.2l2 .6a7.5 7.5 0 0 0 .8 1.8l-1 1.8L5 18.9l1.8-1a7.5 7.5 0 0 0 1.8.8l.6 2h2.2l.6-2a7.5 7.5 0 0 0 1.8-.8l1.8 1 1.6-1.6-1-1.8a7.5 7.5 0 0 0 .8-1.8l2-.6Z" />
							</svg>
						</button>

						<div className="absolute left-[25%] top-[9%] z-[35] flex items-center gap-2">
							<img
								src="/images/arte/companion-1.webp"
								alt=""
								aria-hidden="true"
								className="world-mascot w-[78px] object-contain drop-shadow-[0_9px_9px_rgba(23,59,108,0.18)]"
							/>
							<div className="relative rounded-[1.25rem] border border-white/80 bg-white/96 px-3.5 py-2 text-[12px] font-extrabold text-[#234A91] shadow-[0_7px_18px_rgba(35,74,145,0.14)]">
								¡Vamos a
								<br />
								leer juntos!
								<span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 bg-white" />
							</div>
						</div>

						{levels.map((level) => (
							<LevelNode key={level.number} {...level} />
						))}

						<div className="absolute bottom-[8%] left-[3.4%] z-40 rounded-[0.8rem] border border-[#7D4928]/20 bg-[#98613A]/95 px-4 py-2.5 text-[12px] font-extrabold leading-tight text-white shadow-[0_7px_16px_rgba(85,53,34,0.24)]">
							Palabras
							<br />
							con palmas
						</div>

						<div className="absolute bottom-[3%] right-[2.8%] z-40 flex size-[52px] items-center justify-center rounded-[1rem] border border-white/90 bg-white/96 text-[22px] shadow-[0_6px_16px_rgba(35,74,145,0.14)]">
							<svg aria-hidden="true" viewBox="0 0 32 32" className="size-7">
								<path d="M4 7.5 11 5l10 3 7-2.5v19L21 27l-10-3-7 2.5Z" fill="#F8D760" stroke="#2E6DB4" strokeWidth="1.7" strokeLinejoin="round" />
								<path d="M11 5v19M21 8v19" fill="none" stroke="#2E6DB4" strokeWidth="1.7" />
								<path d="M5.5 10 9.5 8.5v12.5L5.5 22.5ZM12.5 8l7 2v13l-7-2ZM22.5 10l4-1.5v12.5l-4 1.5Z" fill="#78CFF2" opacity=".9" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				<StateSample
					state="completed"
					title="Completado"
					detail="Casita ilustrada + estrellas, sin competir con el nivel actual."
				/>
				<StateSample
					state="current"
					title="Actual"
					detail="Amarillo Silabín, mayor escala y glow cálido."
				/>
				<StateSample
					state="locked"
					title="Bloqueado"
					detail="Ilustración desaturada y menor contraste."
				/>
			</div>

			<style>{`
				@media (prefers-reduced-motion: no-preference) {
					.world-cloud-a { animation: silabin-cloud-a 16s ease-in-out infinite alternate; }
					.world-cloud-b { animation: silabin-cloud-b 20s ease-in-out infinite alternate; }
					.world-mascot { animation: silabin-mascot 3.2s ease-in-out infinite; }
					[data-world-node="current"] { animation: silabin-current 2.8s ease-in-out infinite; }
				}
				@keyframes silabin-cloud-a {
					from { transform: translateX(0); }
					to { transform: translateX(18px); }
				}
				@keyframes silabin-cloud-b {
					from { transform: translateX(0); }
					to { transform: translateX(-20px); }
				}
				@keyframes silabin-mascot {
					0%, 100% { transform: translateY(0) rotate(-2deg); }
					50% { transform: translateY(-6px) rotate(2deg); }
				}
				@keyframes silabin-current {
					0%, 100% { transform: translate(-50%, -50%) translateY(0); }
					50% { transform: translate(-50%, -50%) translateY(-4px); }
				}
			`}</style>
		</section>
	);
}
