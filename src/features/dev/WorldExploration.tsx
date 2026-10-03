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
	style,
}: {
	src: string;
	fallback: string;
	alt?: string;
	className?: string;
	style?: React.CSSProperties;
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

	const nodeSize = current ? 172 : 118;

	return (
		<div
			data-world-node={state}
			className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
			style={{ left, top }}
		>
			<div
				className="relative"
				style={{ width: nodeSize, height: current ? 190 : 136 }}
			>
				{current && (
					<div
						aria-hidden="true"
						className="absolute left-1/2 top-[42%] -z-10 h-[72%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFE178]/35 blur-xl"
					/>
				)}

				<HqImage
					src={houseSrc}
					fallback={`${SHARED}/house-01.svg`}
					className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 object-contain drop-shadow-[0_10px_12px_rgba(52,61,72,0.18)]"
					style={{
						width: nodeSize,
						height: nodeSize,
						filter: locked ? "saturate(.72) brightness(1.03)" : undefined,
					}}
				/>

				<span
					className={
						current
							? "absolute left-1/2 top-[67%] flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-action text-[12px] font-extrabold text-action-ink shadow-[0_3px_8px_rgba(124,86,0,0.20)]"
							: "absolute left-1/2 top-[66%] flex size-6 -translate-x-1/2 items-center justify-center rounded-full bg-white/96 text-[10px] font-extrabold text-[#234A91] shadow-[0_3px_7px_rgba(45,57,78,0.18)]"
					}
				>
					{number}
				</span>

				<div
					className={
						current
							? "absolute left-1/2 top-[77%] w-[148px] -translate-x-1/2 rounded-[0.9rem] bg-[#FFF8E9]/96 px-2.5 py-1.5 text-center shadow-[0_4px_10px_rgba(90,67,29,0.12)]"
							: "absolute left-1/2 top-[78%] w-[104px] -translate-x-1/2 rounded-[0.75rem] bg-[#FFF9EF]/94 px-1.5 py-1 text-center shadow-[0_3px_8px_rgba(63,67,75,0.10)]"
					}
				>
					<span
						className={
							locked
								? "block text-[9px] font-bold leading-[1.1] text-[#85818B]"
								: `block font-extrabold leading-[1.1] text-[#173B6C] ${current ? "text-[11px]" : "text-[9px]"}`
						}
					>
						{label}
					</span>
				</div>

				{(completed || current) && (
					<div
						className={
							current
								? "absolute left-1/2 top-[91%] -translate-x-1/2 whitespace-nowrap text-[15px] font-extrabold tracking-[0.06em] text-celebrate drop-shadow-[0_1px_0_white]"
								: "absolute left-1/2 top-[91%] -translate-x-1/2 whitespace-nowrap text-[11px] font-extrabold tracking-[0.05em] text-celebrate"
						}
					>
						{[0, 1, 2].map((i) => (
							<span key={i}>{i < stars ? "★" : "☆"}</span>
						))}
					</div>
				)}

				{locked && (
					<span
						aria-hidden="true"
						className="absolute left-1/2 top-[91%] flex size-[18px] -translate-x-1/2 items-center justify-center rounded-full bg-[#E6E2DC]/95 text-[9px] shadow-sm"
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

function ProgressPath() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 1180 738"
			preserveAspectRatio="none"
			className="pointer-events-none absolute inset-0 z-[18] h-full w-full"
		>
			<path
				d="M 188 423 C 255 342, 320 322, 382 347 S 474 414, 576 348 S 705 289, 814 323 S 977 366, 1012 443 C 1042 509, 980 553, 900 563 S 770 548, 680 510 S 585 483, 492 522 S 373 558, 282 521"
				fill="none"
				stroke="rgba(173,126,66,0.16)"
				strokeWidth="28"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M 188 423 C 255 342, 320 322, 382 347 S 474 414, 576 348 S 705 289, 814 323 S 977 366, 1012 443 C 1042 509, 980 553, 900 563 S 770 548, 680 510 S 585 483, 492 522 S 373 558, 282 521"
				fill="none"
				stroke="rgba(255,241,202,0.84)"
				strokeWidth="18"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray="2 19"
			/>
		</svg>
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
			top: "55%",
		},
		{
			number: 2,
			label: "Rimas saltarinas",
			state: "locked",
			left: "31%",
			top: "43%",
		},
		{
			number: 3,
			label: "Detectives de sonidos",
			state: "locked",
			left: "45%",
			top: "49%",
		},
		{
			number: 4,
			label: "¿Lo oyes?",
			state: "locked",
			left: "58%",
			top: "40%",
		},
		{
			number: 5,
			label: "La vocal a",
			state: "locked",
			left: "71%",
			top: "44%",
		},
		{
			number: 6,
			label: "La vocal e",
			state: "locked",
			left: "84%",
			top: "50%",
		},
		{
			number: 7,
			label: "La vocal o",
			state: "locked",
			left: "80%",
			top: "68%",
		},
		{
			number: 8,
			label: "La vocal i",
			state: "locked",
			left: "66%",
			top: "72%",
		},
		{
			number: 9,
			label: "La vocal u",
			state: "locked",
			left: "51%",
			top: "68%",
		},
		{
			number: 10,
			label: "La m y sus sílabas",
			state: "locked",
			left: "34%",
			top: "70%",
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
							style={{ filter: "saturate(.84) brightness(1.04) contrast(.95)" }}
						/>
						<div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,250,239,0.10)_0%,rgba(255,255,255,0.08)_42%,rgba(255,249,235,0.05)_100%)]" />

						<HqImage
							src={`${HQ}/cloud-01.webp`}
							fallback={`${SHARED}/cloud-01.svg`}
							className="world-cloud-a pointer-events-none absolute left-[3%] top-[3%] z-[2] w-[14%] opacity-48"
						/>
						<HqImage
							src={`${HQ}/cloud-02.webp`}
							fallback={`${SHARED}/cloud-02.svg`}
							className="world-cloud-b pointer-events-none absolute right-[10%] top-[6%] z-[2] w-[13%] opacity-42"
						/>

						<ProgressPath />

						<div className="absolute left-[2.4%] top-[2.5%] z-40 flex items-center gap-2 rounded-[1rem] border border-white/80 bg-white/95 px-3 py-2 shadow-[0_7px_18px_rgba(35,74,145,0.14)]">
							<div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#FFF2C8]">
								<img
									src="/images/arte/companion-1.webp"
									alt=""
									aria-hidden="true"
									className="size-8 object-contain"
								/>
							</div>
							<div className="leading-tight">
								<div className="text-[11px] font-extrabold text-[#173B6C]">Mateo</div>
								<div className="text-[11px] font-extrabold text-celebrate">★ 12</div>
							</div>
						</div>

						<h3 className="absolute left-1/2 top-[2.4%] z-40 -translate-x-1/2 text-[36px] font-extrabold tracking-[-0.035em] text-[#234A91] drop-shadow-[0_2px_0_rgba(255,255,255,0.75)]">
							Silabín
						</h3>

						<button
							type="button"
							aria-label="Configuración"
							className="absolute right-[2.5%] top-[2.7%] z-40 flex size-10 items-center justify-center rounded-full border border-white/90 bg-white/96 text-[18px] shadow-[0_6px_16px_rgba(35,74,145,0.14)]"
						>
							⚙️
						</button>

						<div className="absolute left-[24%] top-[8%] z-[35] flex items-center gap-2">
							<img
								src="/images/arte/companion-1.webp"
								alt=""
								aria-hidden="true"
								className="world-mascot w-[78px] object-contain drop-shadow-[0_9px_9px_rgba(23,59,108,0.18)]"
							/>
							<div className="relative rounded-[1.25rem] border border-white/80 bg-white/96 px-3.5 py-2.5 text-[12px] font-extrabold text-[#234A91] shadow-[0_7px_18px_rgba(35,74,145,0.14)]">
								¡Vamos a
								<br />
								leer juntos!
								<span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 bg-white" />
							</div>
						</div>

						{levels.map((level) => (
							<LevelNode key={level.number} {...level} />
						))}

						<div className="absolute bottom-[3.4%] left-[3.4%] z-40 rounded-[0.8rem] border border-[#7D4928]/20 bg-[#98613A]/95 px-4 py-2.5 text-[12px] font-extrabold leading-tight text-white shadow-[0_7px_16px_rgba(85,53,34,0.24)]">
							Palabras
							<br />
							con palmas
						</div>

						<div className="absolute bottom-[3%] right-[2.8%] z-40 flex size-13 items-center justify-center rounded-[1rem] border border-white/90 bg-white/96 text-[22px] shadow-[0_6px_16px_rgba(35,74,145,0.14)]">
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
