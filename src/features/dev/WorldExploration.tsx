"use client";

type LevelState = "completed" | "current" | "locked";

type LevelNodeProps = {
	number: number;
	label: string;
	state: LevelState;
	stars?: number;
	className?: string;
};

const SHARED = "/images/worlds/shared";

function LevelNode({
	number,
	label,
	state,
	stars = 0,
	className = "",
}: LevelNodeProps) {
	const styles = {
		completed:
			"border-white/90 bg-white text-ink shadow-[0_8px_0_rgba(70,83,115,0.14),0_14px_28px_rgba(43,42,51,0.12)]",
		current:
			"border-[#FFD95C] bg-action text-action-ink shadow-[0_0_0_8px_rgba(249,190,35,0.22),0_10px_0_rgba(177,124,9,0.18),0_18px_32px_rgba(249,190,35,0.3)]",
		locked:
			"border-white/75 bg-[#F2EFEA]/95 text-[#8C8790] shadow-[0_7px_0_rgba(86,80,90,0.09),0_12px_22px_rgba(43,42,51,0.08)]",
	}[state];

	return (
		<div
			data-world-node={state}
			className={`absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 ${className}`}
		>
			<div
				className={`relative flex size-[72px] items-center justify-center rounded-full border-[5px] text-2xl font-extrabold ${styles}`}
			>
				{state === "locked" ? (
					<span aria-hidden="true" className="text-[23px]">
						🔒
					</span>
				) : (
					number
				)}
				{state === "current" && (
					<span
						aria-hidden="true"
						className="absolute -right-4 -top-5 flex size-10 items-center justify-center rounded-full bg-white shadow-md"
					>
						<img
							src="/images/arte/companion-1.webp"
							alt=""
							className="size-9 object-contain"
						/>
					</span>
				)}
			</div>
			{state !== "locked" && (
				<div
					aria-hidden="true"
					className="min-h-5 whitespace-nowrap text-sm font-bold tracking-[0.08em] text-celebrate"
				>
					{[0, 1, 2].map((i) => (
						<span key={i}>{i < stars ? "★" : "☆"}</span>
					))}
				</div>
			)}
			<span className="max-w-28 rounded-full bg-white/90 px-2.5 py-1 text-center text-[11px] font-bold leading-tight text-ink shadow-sm">
				{label}
			</span>
		</div>
	);
}

function Asset({
	name,
	className,
}: {
	name: string;
	className: string;
}) {
	return (
		// biome-ignore lint/performance/noImgElement: assets de exploración del mapa, ya optimizados en WebP
		<img
			src={`${SHARED}/${name}.svg`}
			alt=""
			aria-hidden="true"
			draggable={false}
			className={`pointer-events-none absolute select-none object-contain ${className}`}
		/>
	);
}

function TerritoryLabel({
	title,
	subtitle,
	className,
}: {
	title: string;
	subtitle: string;
	className: string;
}) {
	return (
		<div
			className={`absolute z-20 -translate-x-1/2 rounded-[1.25rem] border-2 border-white/75 bg-white/92 px-4 py-2 text-center shadow-[0_8px_20px_rgba(43,42,51,0.10)] backdrop-blur-sm ${className}`}
		>
			<div className="text-sm font-extrabold text-ink">{title}</div>
			<div className="text-[10px] font-semibold text-ink-soft">{subtitle}</div>
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
	const dotStyle = {
		completed: "border-white bg-white",
		current: "border-[#FFD95C] bg-action",
		locked: "border-white bg-[#E9E2D7]",
	}[state];

	return (
		<div className="flex items-center gap-3 rounded-card bg-card p-3 shadow-sm">
			<span
				className={`flex size-12 shrink-0 items-center justify-center rounded-full border-4 text-lg font-extrabold shadow-md ${dotStyle}`}
			>
				{state === "locked" ? "🔒" : state === "current" ? "3" : "2"}
			</span>
			<span>
				<span className="block text-sm font-bold">{title}</span>
				<span className="block text-xs text-ink-soft">{detail}</span>
			</span>
		</div>
	);
}

export function WorldExploration() {
	return (
		<section
			aria-labelledby="world-exploration-title"
			className="flex flex-col gap-5"
		>
			<div className="flex max-w-3xl flex-col gap-2">
				<h2 id="world-exploration-title" className="text-2xl font-bold">
					Silabín — World Exploration
				</h2>
				<p className="text-sm leading-relaxed text-ink-soft">
					Prueba visual del mapa tipo aventura para iPad landscape. Los colores
					identifican territorios; el amarillo sigue reservado para la unidad
					actual y las acciones principales.
				</p>
			</div>

			<div className="overflow-x-auto pb-2">
				<div className="min-w-[920px]">
					<div
						data-world-composition
						className="relative isolate mx-auto aspect-[4/3] w-full max-w-[1024px] overflow-hidden rounded-[2rem] border-[10px] border-[#252830] bg-[#BFE9FF] shadow-[0_24px_60px_rgba(43,42,51,0.18)]"
					>
						<div className="absolute inset-0 bg-[linear-gradient(180deg,#BDEBFF_0%,#EAF8FF_48%,#D9F5D1_100%)]" />
						<div className="absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(180deg,#88DBEF_0%,#52C4E5_100%)]" />

						<Asset
							name="mountains-01"
							className="left-[19%] top-[4%] z-[1] w-[58%] opacity-75"
						/>
						<Asset
							name="cloud-01"
							className="world-cloud-a left-[4%] top-[5%] z-[3] w-[16%] opacity-90"
						/>
						<Asset
							name="cloud-02"
							className="world-cloud-b right-[5%] top-[7%] z-[3] w-[18%] opacity-90"
						/>

						<div className="absolute left-[5%] top-[33%] z-[5] h-[46%] w-[28%] rotate-[-3deg] rounded-[48%_52%_45%_55%] border-[5px] border-white/35 bg-[linear-gradient(145deg,#E9DFFF,#CFC0F3)] shadow-[0_18px_0_rgba(123,91,175,0.12),0_28px_45px_rgba(43,42,51,0.12)]" />
						<div className="absolute left-[34%] top-[24%] z-[6] h-[50%] w-[32%] rotate-[1deg] rounded-[52%_48%_50%_50%] border-[5px] border-white/35 bg-[linear-gradient(145deg,#DDF4FF,#BCE5FA)] shadow-[0_18px_0_rgba(71,135,183,0.12),0_28px_45px_rgba(43,42,51,0.12)]" />
						<div className="absolute right-[6%] top-[35%] z-[5] h-[43%] w-[29%] rotate-[3deg] rounded-[52%_48%_46%_54%] border-[5px] border-white/35 bg-[linear-gradient(145deg,#FFE4D2,#F8C7AA)] shadow-[0_18px_0_rgba(190,115,73,0.12),0_28px_45px_rgba(43,42,51,0.12)]" />
						<div className="absolute bottom-[3%] right-[1.5%] z-[4] h-[18%] w-[19%] rounded-[50%] border-[4px] border-white/30 bg-[linear-gradient(145deg,#EEE8DF,#D8D0C5)] opacity-90" />

						<svg
							aria-hidden="true"
							viewBox="0 0 1024 768"
							className="pointer-events-none absolute inset-0 z-10 h-full w-full"
							preserveAspectRatio="none"
						>
							<path
								d="M 120 430 C 165 360, 245 360, 305 430 S 405 510, 455 410 S 555 310, 625 405 S 715 505, 780 425 S 875 385, 940 445"
								fill="none"
								stroke="rgba(255,255,255,.82)"
								strokeWidth="30"
								strokeLinecap="round"
								strokeDasharray="2 22"
							/>
							<path
								d="M 120 430 C 165 360, 245 360, 305 430 S 405 510, 455 410 S 555 310, 625 405 S 715 505, 780 425 S 875 385, 940 445"
								fill="none"
								stroke="rgba(192,157,103,.46)"
								strokeWidth="14"
								strokeLinecap="round"
								strokeDasharray="3 18"
							/>
						</svg>

						<TerritoryLabel
							title="Oído de explorador"
							subtitle="Fase 0 · 4 unidades"
							className="left-[19%] top-[27%]"
						/>
						<TerritoryLabel
							title="Las vocales"
							subtitle="Fase 1 · 5 unidades"
							className="left-[50%] top-[18%]"
						/>
						<TerritoryLabel
							title="Las sílabas"
							subtitle="Fase 2 · 4 unidades"
							className="left-[81%] top-[29%]"
						/>
						<TerritoryLabel
							title="Próximamente"
							subtitle="fases futuras"
							className="left-[90%] top-[79%]"
						/>

						<Asset
							name="tree-02"
							className="left-[1.5%] top-[30%] z-[16] w-[14%]"
						/>
						<Asset
							name="tree-01"
							className="left-[28%] top-[20%] z-[15] w-[12%]"
						/>
						<Asset
							name="tree-01"
							className="right-[17%] top-[27%] z-[15] w-[11%]"
						/>
						<Asset
							name="bush-01"
							className="left-[23%] top-[61%] z-[16] w-[12%]"
						/>
						<Asset
							name="flowers-01"
							className="left-[4%] top-[67%] z-[18] w-[11%]"
						/>
						<Asset
							name="rocks-01"
							className="right-[5%] top-[63%] z-[17] w-[10%]"
						/>
						<Asset
							name="bridge-01"
							className="left-[29%] top-[57%] z-[22] w-[16%] rotate-[4deg]"
						/>
						<Asset
							name="bridge-01"
							className="right-[28%] top-[58%] z-[22] w-[14%] -rotate-[5deg]"
						/>

						<div className="absolute left-[7%] top-[43%] z-30">
							<div className="relative">
								<Asset
									name="sign-01"
									className="!relative !left-auto !top-auto w-[130px]"
								/>
								<span className="absolute left-1/2 top-[26%] w-[92px] -translate-x-1/2 text-center text-[10px] font-extrabold leading-tight text-[#6F431C]">
									¡Empieza la aventura!
								</span>
							</div>
						</div>

						<LevelNode
							number={1}
							label="Palmas"
							state="completed"
							stars={3}
							className="left-[14%] top-[55%]"
						/>
						<LevelNode
							number={2}
							label="Rimas"
							state="completed"
							stars={2}
							className="left-[24%] top-[48%]"
						/>
						<LevelNode
							number={3}
							label="Sonidos"
							state="current"
							stars={1}
							className="left-[36%] top-[57%]"
						/>
						<LevelNode
							number={4}
							label="¿Lo oyes?"
							state="locked"
							className="left-[45%] top-[46%]"
						/>
						<LevelNode
							number={5}
							label="a"
							state="locked"
							className="left-[55%] top-[38%]"
						/>
						<LevelNode
							number={6}
							label="e"
							state="locked"
							className="left-[64%] top-[50%]"
						/>
						<LevelNode
							number={7}
							label="m"
							state="locked"
							className="left-[75%] top-[56%]"
						/>
						<LevelNode
							number={8}
							label="l"
							state="locked"
							className="left-[85%] top-[49%]"
						/>
						<LevelNode
							number={9}
							label="futuro"
							state="locked"
							className="left-[93%] top-[68%]"
						/>

						<div className="absolute left-[45%] top-[7%] z-40 rounded-full border-2 border-white/80 bg-white/90 px-5 py-2 text-2xl font-extrabold text-[#234A91] shadow-md">
							Silabín
						</div>
						<img
							src="/images/arte/companion-1.webp"
							alt=""
							aria-hidden="true"
							className="world-mascot absolute left-[34%] top-[6%] z-40 w-[72px] object-contain drop-shadow-md"
						/>
						<div className="absolute left-[40%] top-[13%] z-40 rounded-[1.25rem] bg-white px-3 py-2 text-center text-[11px] font-bold text-[#234A91] shadow-md">
							¡Vamos a leer juntos!
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				<StateSample
					state="completed"
					title="Completado"
					detail="Claro y positivo, sin competir con el nivel actual."
				/>
				<StateSample
					state="current"
					title="Actual"
					detail="Amarillo Silabín + glow suave."
				/>
				<StateSample
					state="locked"
					title="Bloqueado"
					detail="Neutral y desaturado; nunca rojo."
				/>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-card bg-[#D8CCFF] p-4">
					<div className="font-bold">Oído de explorador</div>
					<div className="text-xs text-ink-soft">#D8CCFF · lila suave</div>
				</div>
				<div className="rounded-card bg-[#CBEAFF] p-4">
					<div className="font-bold">Las vocales</div>
					<div className="text-xs text-ink-soft">#CBEAFF · azul cielo</div>
				</div>
				<div className="rounded-card bg-[#FFD8C2] p-4">
					<div className="font-bold">Las sílabas</div>
					<div className="text-xs text-ink-soft">#FFD8C2 · melocotón</div>
				</div>
				<div className="rounded-card bg-[#E9E2D7] p-4">
					<div className="font-bold">Futuro</div>
					<div className="text-xs text-ink-soft">#E9E2D7 · beige neutral</div>
				</div>
			</div>

			<style>{`
				@media (prefers-reduced-motion: no-preference) {
					.world-cloud-a { animation: silabin-cloud-a 14s ease-in-out infinite alternate; }
					.world-cloud-b { animation: silabin-cloud-b 18s ease-in-out infinite alternate; }
					.world-mascot { animation: silabin-mascot 3.4s ease-in-out infinite; }
					[data-world-node="current"] { animation: silabin-current 2.8s ease-in-out infinite; }
				}
				@keyframes silabin-cloud-a {
					from { transform: translateX(0); }
					to { transform: translateX(22px); }
				}
				@keyframes silabin-cloud-b {
					from { transform: translateX(0); }
					to { transform: translateX(-28px); }
				}
				@keyframes silabin-current {
					0%, 100% { transform: translate(-50%, -50%) translateY(0); }
					50% { transform: translate(-50%, -50%) translateY(-4px); }
				}
				@keyframes silabin-mascot {
					0%, 100% { transform: translateY(0) rotate(-2deg); }
					50% { transform: translateY(-6px) rotate(2deg); }
				}
			`}</style>
		</section>
	);
}
