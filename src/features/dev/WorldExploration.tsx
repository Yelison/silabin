"use client";

import { useState } from "react";

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
}: {
	src: string;
	fallback: string;
	alt?: string;
	className?: string;
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

	return (
		<div
			data-world-node={state}
			className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
			style={{ left, top }}
		>
			<div
				className={
					current
						? "relative flex w-[156px] flex-col items-center rounded-[1.8rem] border-[3px] border-[#FFE27A] bg-[#FFF9E9]/96 px-3 pb-3 pt-[72px] shadow-[0_0_0_9px_rgba(249,190,35,0.18),0_13px_0_rgba(183,129,13,0.16),0_22px_42px_rgba(72,55,20,0.24)]"
						: "relative flex w-[112px] flex-col items-center rounded-[1.55rem] border-[3px] border-white/90 bg-[#FFF9EE]/94 px-2 pb-2.5 pt-[54px] shadow-[0_8px_0_rgba(80,71,61,0.11),0_15px_26px_rgba(50,69,88,0.17)]"
				}
			>
				<HqImage
					src={houseSrc}
					fallback={`${SHARED}/house-01.svg`}
					className={
						current
							? "pointer-events-none absolute -top-[82px] left-1/2 w-[122px] -translate-x-1/2 object-contain"
							: `pointer-events-none absolute -top-[59px] left-1/2 w-[92px] -translate-x-1/2 object-contain ${locked ? "grayscale opacity-60" : ""}`
					}
				/>

				<span
					className={
						current
							? "mb-1 flex size-7 items-center justify-center rounded-full bg-action text-[12px] font-extrabold text-action-ink shadow-sm"
							: "mb-0.5 flex size-6 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#214987] shadow-sm"
					}
				>
					{number}
				</span>

				<span
					className={
						locked
							? "max-w-[94px] text-center text-[10px] font-bold leading-[1.15] text-[#949099]"
							: `${current ? "max-w-[132px] text-[12px]" : "max-w-[96px] text-[10px]"} text-center font-extrabold leading-[1.15] text-[#173B6C]`
					}
				>
					{label}
				</span>

				{completed && (
					<div className="mt-1 whitespace-nowrap text-[13px] font-extrabold tracking-[0.06em] text-celebrate">
						{[0, 1, 2].map((i) => (
							<span key={i}>{i < stars ? "★" : "☆"}</span>
						))}
					</div>
				)}

				{current && (
					<div className="mt-1 whitespace-nowrap text-[15px] font-extrabold tracking-[0.07em] text-celebrate">
						{[0, 1, 2].map((i) => (
							<span key={i}>{i < stars ? "★" : "☆"}</span>
						))}
					</div>
				)}

				{locked && (
					<span
						aria-hidden="true"
						className="mt-1 flex size-5 items-center justify-center rounded-full bg-[#E7E3DE] text-[11px]"
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
			left: "16%",
			top: "58%",
		},
		{
			number: 2,
			label: "Rimas saltarinas",
			state: "locked",
			left: "27%",
			top: "47%",
		},
		{
			number: 3,
			label: "Detectives de sonidos",
			state: "locked",
			left: "39%",
			top: "56%",
		},
		{
			number: 4,
			label: "¿Lo oyes?",
			state: "locked",
			left: "50%",
			top: "46%",
		},
		{
			number: 5,
			label: "La vocal a",
			state: "locked",
			left: "61%",
			top: "52%",
		},
		{
			number: 6,
			label: "La vocal e",
			state: "locked",
			left: "72%",
			top: "43%",
		},
		{
			number: 7,
			label: "La vocal o",
			state: "locked",
			left: "83%",
			top: "51%",
		},
		{
			number: 8,
			label: "La vocal i",
			state: "locked",
			left: "86%",
			top: "67%",
		},
		{
			number: 9,
			label: "La vocal u",
			state: "locked",
			left: "73%",
			top: "72%",
		},
		{
			number: 10,
			label: "La m y sus sílabas",
			state: "locked",
			left: "58%",
			top: "67%",
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
					Dirección HQ: paisaje de cuento 2.5D, nodos ilustrados y jerarquía visual
					pensada para iPad landscape.
				</p>
			</div>

			<div className="overflow-x-auto pb-2">
				<div className="min-w-[980px]">
					<div
						data-world-composition
						className="relative isolate mx-auto aspect-[16/10] w-full max-w-[1180px] overflow-hidden rounded-[2.25rem] border-[12px] border-[#20242D] bg-[#BDEBFF] shadow-[0_26px_70px_rgba(43,42,51,0.22)]"
					>
						<HqImage
							src={`${HQ}/bg-world-01.webp`}
							fallback="/images/arte/bg-pradera.webp"
							className="absolute inset-0 -z-20 h-full w-full object-cover"
						/>
						<div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(169,226,255,0.03)_0%,rgba(255,255,255,0)_55%,rgba(25,97,112,0.05)_100%)]" />

						<HqImage
							src={`${HQ}/cloud-01.webp`}
							fallback={`${SHARED}/cloud-01.svg`}
							className="world-cloud-a pointer-events-none absolute left-[2%] top-[3%] z-[2] w-[18%] opacity-75"
						/>
						<HqImage
							src={`${HQ}/cloud-02.webp`}
							fallback={`${SHARED}/cloud-02.svg`}
							className="world-cloud-b pointer-events-none absolute right-[8%] top-[5%] z-[2] w-[17%] opacity-70"
						/>

						<div className="absolute left-[2.5%] top-[2.7%] z-40 flex items-center gap-2 rounded-[1rem] border border-white/70 bg-white/94 px-3 py-2 shadow-[0_8px_20px_rgba(35,74,145,0.16)] backdrop-blur-sm">
							<img
								src="/images/arte/companion-1.webp"
								alt=""
								aria-hidden="true"
								className="size-9 object-contain"
							/>
							<div className="leading-tight">
								<div className="text-[11px] font-extrabold text-[#173B6C]">Mateo</div>
								<div className="text-[11px] font-extrabold text-celebrate">★ 12</div>
							</div>
						</div>

						<h3 className="absolute left-1/2 top-[2.8%] z-40 -translate-x-1/2 text-[34px] font-extrabold tracking-[-0.025em] text-[#234A91] drop-shadow-[0_2px_0_rgba(255,255,255,0.65)]">
							Silabín
						</h3>

						<button
							type="button"
							aria-label="Configuración"
							className="absolute right-[2.5%] top-[3%] z-40 flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/95 text-xl shadow-md"
						>
							⚙️
						</button>

						<div className="absolute left-[27%] top-[9%] z-[35] flex items-center gap-2">
							<img
								src="/images/arte/companion-1.webp"
								alt=""
								aria-hidden="true"
								className="world-mascot w-[86px] object-contain drop-shadow-[0_10px_10px_rgba(23,59,108,0.20)]"
							/>
							<div className="relative rounded-[1.35rem] border border-white/70 bg-white/95 px-4 py-3 text-[13px] font-extrabold text-[#234A91] shadow-[0_8px_20px_rgba(35,74,145,0.16)]">
								¡Vamos a leer juntos!
								<span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 bg-white" />
							</div>
						</div>

						{levels.map((level) => (
							<LevelNode key={level.number} {...level} />
						))}

						<div className="absolute bottom-[3%] left-[3.5%] z-40 rounded-[0.85rem] border border-[#7D4928]/20 bg-[#98613A]/95 px-4 py-3 text-[13px] font-extrabold leading-tight text-white shadow-[0_8px_18px_rgba(85,53,34,0.26)]">
							Palabras
							<br />
							con palmas
						</div>

						<div className="absolute bottom-[2.8%] right-[2.8%] z-40 flex size-14 items-center justify-center rounded-[1.1rem] border border-white/80 bg-white/95 text-2xl shadow-md">
							🗺️
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
					to { transform: translateX(20px); }
				}
				@keyframes silabin-cloud-b {
					from { transform: translateX(0); }
					to { transform: translateX(-24px); }
				}
				@keyframes silabin-mascot {
					0%, 100% { transform: translateY(0) rotate(-2deg); }
					50% { transform: translateY(-7px) rotate(2deg); }
				}
				@keyframes silabin-current {
					0%, 100% { transform: translate(-50%, -50%) translateY(0); }
					50% { transform: translate(-50%, -50%) translateY(-5px); }
				}
			`}</style>
		</section>
	);
}
