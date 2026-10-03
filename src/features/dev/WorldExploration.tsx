"use client";

type LevelState = "completed" | "current" | "locked";

type LevelNodeProps = {
	number: number;
	label: string;
	state: LevelState;
	stars?: number;
	left: string;
	top: string;
};

const SHARED = "/images/worlds/shared";

function LevelNode({
	number,
	label,
	state,
	stars = 0,
	left,
	top,
}: LevelNodeProps) {
	const locked = state === "locked";
	const current = state === "current";

	return (
		<div
			data-world-node={state}
			className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
			style={{ left, top }}
		>
			<div
				className={
					current
						? "relative flex w-[150px] flex-col items-center rounded-[2rem] border-4 border-[#FFE27A] bg-[#FFF8E8] px-3 pb-3 pt-14 shadow-[0_0_0_9px_rgba(249,190,35,0.18),0_14px_0_rgba(201,138,0,0.16),0_24px_45px_rgba(89,67,18,0.20)]"
						: "relative flex w-[106px] flex-col items-center rounded-[2rem] border-4 border-white/85 bg-[#FFF8EC]/95 px-2 pb-3 pt-11 shadow-[0_8px_0_rgba(84,77,67,0.10),0_18px_30px_rgba(52,66,84,0.16)]"
				}
			>
				<div
					className={
						current
							? "absolute -top-[69px] left-1/2 w-[104px] -translate-x-1/2"
							: "absolute -top-[48px] left-1/2 w-[78px] -translate-x-1/2"
					}
				>
					<img
						src={`${SHARED}/house-01.svg`}
						alt=""
						aria-hidden="true"
						className={locked ? "w-full grayscale opacity-55" : "w-full"}
					/>
				</div>

				<span
					className={
						current
							? "mb-1 flex size-8 items-center justify-center rounded-full bg-action text-sm font-extrabold text-action-ink shadow-sm"
							: "mb-1 flex size-7 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#234A91] shadow-sm"
					}
				>
					{number}
				</span>

				<span
					className={
						locked
							? "max-w-[92px] text-center text-[10px] font-bold leading-tight text-[#97939B]"
							: "max-w-[126px] text-center text-[11px] font-extrabold leading-tight text-[#173B6C]"
					}
				>
					{label}
				</span>

				{state === "completed" && (
					<div className="mt-1 text-sm font-extrabold tracking-[0.08em] text-celebrate">
						{[0, 1, 2].map((i) => (
							<span key={i}>{i < stars ? "★" : "☆"}</span>
						))}
					</div>
				)}

				{locked && (
					<span
						aria-hidden="true"
						className="mt-1 flex size-6 items-center justify-center rounded-full bg-[#E7E3DE] text-[13px]"
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
			left: "18%",
			top: "40%",
		},
		{
			number: 2,
			label: "Rimas saltarinas",
			state: "locked",
			left: "34%",
			top: "31%",
		},
		{
			number: 3,
			label: "Detectives de sonidos",
			state: "locked",
			left: "50%",
			top: "38%",
		},
		{
			number: 4,
			label: "¿Lo oyes?",
			state: "locked",
			left: "66%",
			top: "31%",
		},
		{
			number: 5,
			label: "La vocal a",
			state: "locked",
			left: "82%",
			top: "36%",
		},
		{
			number: 6,
			label: "La vocal e",
			state: "locked",
			left: "84%",
			top: "61%",
		},
		{
			number: 7,
			label: "La vocal o",
			state: "locked",
			left: "67%",
			top: "69%",
		},
		{
			number: 8,
			label: "La vocal i",
			state: "locked",
			left: "50%",
			top: "62%",
		},
		{
			number: 9,
			label: "La vocal u",
			state: "locked",
			left: "34%",
			top: "70%",
		},
		{
			number: 10,
			label: "Las sílabas",
			state: "locked",
			left: "18%",
			top: "64%",
		},
	];

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
					Segunda dirección: un único paisaje ilustrado con camino serpenteante y
					nodos tipo casita. Esta composición se acerca al concepto de iPad aprobado
					y evita la sensación de islas planas.
				</p>
			</div>

			<div className="overflow-x-auto pb-2">
				<div className="min-w-[980px]">
					<div
						data-world-composition
						className="relative isolate mx-auto aspect-[16/10] w-full max-w-[1180px] overflow-hidden rounded-[2.25rem] border-[12px] border-[#20242D] bg-[#BDEBFF] shadow-[0_26px_70px_rgba(43,42,51,0.22)]"
					>
						<img
							src="/images/arte/bg-pradera.webp"
							alt=""
							aria-hidden="true"
							className="absolute inset-0 -z-20 h-full w-full object-cover"
						/>
						<div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(180,232,255,0.18)_0%,rgba(255,255,255,0.03)_44%,rgba(116,197,109,0.08)_100%)]" />

						<img
							src={`${SHARED}/cloud-01.svg`}
							alt=""
							aria-hidden="true"
							className="world-cloud-a absolute left-[5%] top-[4%] z-[1] w-[15%] opacity-80"
						/>
						<img
							src={`${SHARED}/cloud-02.svg`}
							alt=""
							aria-hidden="true"
							className="world-cloud-b absolute right-[7%] top-[7%] z-[1] w-[17%] opacity-80"
						/>

						<img
							src={`${SHARED}/castle-01.svg`}
							alt=""
							aria-hidden="true"
							className="absolute right-[6%] top-[7%] z-[3] w-[13%] opacity-90 drop-shadow-md"
						/>

						<div className="absolute left-[2.4%] top-[2.7%] z-40 flex items-center gap-2 rounded-[1.1rem] bg-white/95 px-3 py-2 shadow-md">
							<img
								src="/images/arte/companion-1.webp"
								alt=""
								aria-hidden="true"
								className="size-9 object-contain"
							/>
							<div className="leading-tight">
								<div className="text-[11px] font-extrabold text-[#173B6C]">Mateo</div>
								<div className="text-[11px] font-bold text-celebrate">★ 12</div>
							</div>
						</div>

						<h3 className="absolute left-1/2 top-[3%] z-40 -translate-x-1/2 text-[34px] font-extrabold tracking-tight text-[#234A91] drop-shadow-[0_2px_0_rgba(255,255,255,0.55)]">
							Silabín
						</h3>

						<button
							type="button"
							aria-label="Configuración"
							className="absolute right-[2.5%] top-[3%] z-40 flex size-11 items-center justify-center rounded-full bg-white/95 text-xl shadow-md"
						>
							⚙️
						</button>

						<div className="absolute left-[26%] top-[9%] z-35 flex items-center gap-2">
							<img
								src="/images/arte/companion-1.webp"
								alt=""
								aria-hidden="true"
								className="world-mascot w-[84px] object-contain drop-shadow-lg"
							/>
							<div className="relative rounded-[1.4rem] bg-white px-4 py-3 text-sm font-extrabold text-[#234A91] shadow-md">
								¡Vamos a leer juntos!
								<span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 bg-white" />
							</div>
						</div>

						<svg
							aria-hidden="true"
							viewBox="0 0 1180 738"
							className="pointer-events-none absolute inset-0 z-10 h-full w-full"
							preserveAspectRatio="none"
						>
							<path
								d="M 195 294 C 285 225, 340 210, 420 255 S 545 338, 615 277 S 760 202, 866 246 S 1010 337, 1002 450 S 890 559, 790 531 S 650 424, 563 468 S 449 590, 357 567 S 225 519, 194 475"
								fill="none"
								stroke="rgba(231,198,145,.98)"
								strokeWidth="34"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M 195 294 C 285 225, 340 210, 420 255 S 545 338, 615 277 S 760 202, 866 246 S 1010 337, 1002 450 S 890 559, 790 531 S 650 424, 563 468 S 449 590, 357 567 S 225 519, 194 475"
								fill="none"
								stroke="rgba(255,237,196,.95)"
								strokeWidth="22"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeDasharray="2 20"
							/>
							<path
								d="M 447 549 C 493 510, 528 507, 570 523 S 640 550, 692 527"
								fill="none"
								stroke="rgba(93,198,232,.80)"
								strokeWidth="84"
								strokeLinecap="round"
							/>
						</svg>

						<img
							src={`${SHARED}/bridge-01.svg`}
							alt=""
							aria-hidden="true"
							className="absolute left-[44%] top-[66%] z-20 w-[13%] rotate-[2deg] drop-shadow-md"
						/>

						<img
							src={`${SHARED}/flowers-01.svg`}
							alt=""
							aria-hidden="true"
							className="absolute bottom-[4%] left-[5%] z-20 w-[12%]"
						/>
						<img
							src={`${SHARED}/tree-01.svg`}
							alt=""
							aria-hidden="true"
							className="absolute left-[4%] top-[34%] z-20 w-[11%]"
						/>
						<img
							src={`${SHARED}/tree-01.svg`}
							alt=""
							aria-hidden="true"
							className="absolute right-[4%] top-[38%] z-20 w-[10%]"
						/>
						<img
							src={`${SHARED}/bush-01.svg`}
							alt=""
							aria-hidden="true"
							className="absolute bottom-[5%] right-[7%] z-20 w-[12%]"
						/>

						{levels.map((level) => (
							<LevelNode key={level.number} {...level} />
						))}

						<div className="absolute bottom-[2.5%] right-[2.5%] z-40 flex size-14 items-center justify-center rounded-[1.1rem] bg-white/95 text-2xl shadow-md">
							🗺️
						</div>

						<div className="absolute bottom-[5%] left-[4%] z-40 rounded-[0.8rem] bg-[#966035]/95 px-4 py-3 text-sm font-extrabold leading-tight text-white shadow-md">
							Palabras
							<br />
							con palmas
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				<StateSample
					state="completed"
					title="Completado"
					detail="Casita clara + estrellas. No compite con el actual."
				/>
				<StateSample
					state="current"
					title="Actual"
					detail="Tarjeta grande, amarillo Silabín y glow."
				/>
				<StateSample
					state="locked"
					title="Bloqueado"
					detail="Casita desaturada, candado y menor contraste."
				/>
			</div>

			<style>{`
				@media (prefers-reduced-motion: no-preference) {
					.world-cloud-a { animation: silabin-cloud-a 15s ease-in-out infinite alternate; }
					.world-cloud-b { animation: silabin-cloud-b 19s ease-in-out infinite alternate; }
					.world-mascot { animation: silabin-mascot 3.2s ease-in-out infinite; }
					[data-world-node="current"] { animation: silabin-current 2.8s ease-in-out infinite; }
				}
				@keyframes silabin-cloud-a {
					from { transform: translateX(0); }
					to { transform: translateX(24px); }
				}
				@keyframes silabin-cloud-b {
					from { transform: translateX(0); }
					to { transform: translateX(-28px); }
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
