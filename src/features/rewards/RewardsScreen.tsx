"use client";

import { BigButton } from "@/components/BigButton";
import {
	type Cosmetic,
	type CosmeticSlot,
	cosmeticsFor,
	REWARDS,
	type Reward,
	type RewardKind,
	resolveEquipped,
} from "@/engine";
import { useApp } from "@/features/app-context";
import {
	cosmeticLabel,
	cosmeticVisual,
	rewardIcon,
} from "@/features/rewards/visuals";

/** Las ranuras de cosmético son también las clases de logro que no van en el álbum. */
const COSMETIC_KINDS: ReadonlySet<RewardKind> = new Set([
	"background",
	"companion",
	"trail",
]);

const ALBUM_REWARDS: readonly Reward[] = REWARDS.filter(
	(r) => !COSMETIC_KINDS.has(r.kind),
);

const SLOTS: readonly { slot: CosmeticSlot; label: string }[] = [
	{ slot: "background", label: "Fondos" },
	{ slot: "companion", label: "Compañeros" },
	{ slot: "trail", label: "Rastros" },
];

/** Un logro del álbum: en color si está ganado, o una silueta gris «por descubrir» si no. */
function AlbumEntry(props: { reward: Reward; earned: boolean }) {
	const { reward, earned } = props;
	const icon = rewardIcon(reward.id);
	return (
		<span
			role="img"
			aria-label={earned ? reward.name : "Por descubrir"}
			data-reward={reward.id}
			data-earned={earned}
			className={`flex h-18 w-18 items-center justify-center rounded-card bg-card text-4xl ${
				earned ? "" : "opacity-40 grayscale"
			}`}
		>
			{icon}
		</span>
	);
}

/** Un cosmético bloqueado: silueta gris que no reacciona al toque, igual que el álbum. */
function LockedCosmetic(props: { cosmetic: Cosmetic }) {
	return (
		<span
			role="img"
			aria-label="Por descubrir"
			data-cosmetic={props.cosmetic.id}
			className="flex h-18 w-18 items-center justify-center rounded-card bg-card text-3xl opacity-40 grayscale"
		>
			🔒
		</span>
	);
}

/** Un cosmético desbloqueado: tocarlo lo equipa. El equipado lleva borde grueso y un ✓. */
function EquippableCosmetic(props: {
	cosmetic: Cosmetic;
	equipped: boolean;
	onEquip: (id: string) => void;
}) {
	const { cosmetic, equipped, onEquip } = props;
	const label = cosmeticLabel(cosmetic.id, cosmetic.rewardId);
	const visual = cosmeticVisual(cosmetic.id);
	const fondo =
		visual.slot === "background"
			? `bg-gradient-to-b ${visual.gradient}`
			: "bg-card";
	const contenido =
		visual.slot === "companion" || visual.slot === "trail"
			? visual.emoji
			: null;

	return (
		<button
			type="button"
			aria-label={label}
			data-cosmetic={cosmetic.id}
			data-equipped={equipped}
			onClick={() => onEquip(cosmetic.id)}
			className={`relative flex h-18 w-18 items-center justify-center rounded-card text-3xl ${fondo} ${
				equipped ? "border-4 border-action" : "border-2 border-calm-border"
			}`}
		>
			{contenido}
			{equipped && (
				<span
					aria-hidden="true"
					className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-action text-xs font-bold text-action-ink"
				>
					✓
				</span>
			)}
		</button>
	);
}

function CosmeticRow(props: {
	slot: CosmeticSlot;
	label: string;
	unlockedAt: Record<string, string>;
	equippedId: string;
	onEquip: (id: string) => void;
}) {
	const { slot, label, unlockedAt, equippedId, onEquip } = props;
	const cosmetics = cosmeticsFor(slot, unlockedAt);
	return (
		<section aria-label={label} className="flex flex-col gap-2">
			<h2 className="sr-only">{label}</h2>
			<div className="flex flex-row flex-wrap gap-4">
				{cosmetics.map((cosmetic) =>
					cosmetic.unlocked ? (
						<EquippableCosmetic
							key={cosmetic.id}
							cosmetic={cosmetic}
							equipped={cosmetic.id === equippedId}
							onEquip={onEquip}
						/>
					) : (
						<LockedCosmetic key={cosmetic.id} cosmetic={cosmetic} />
					),
				)}
			</div>
		</section>
	);
}

/**
 * La galería de premios (se abre desde el mapa con 🎁): el álbum de logros y las tres filas
 * equipables. No decide pedagogía, solo pinta lo que dice el motor (`cosmeticsFor`,
 * `resolveEquipped`) y llama a `equip` al tocar un cosmético desbloqueado.
 */
export function RewardsScreen(props: { onClose: () => void }) {
	const { onClose } = props;
	const rewards = useApp((s) => s.doc.rewards);
	const equip = useApp((s) => s.equip);
	const equipped = resolveEquipped(rewards);

	function alEquipar(id: string) {
		void equip(id);
	}

	return (
		<main
			aria-label="Mis premios"
			className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4"
		>
			<h1 className="sr-only">Mis premios</h1>
			<section aria-label="Álbum" className="flex flex-col gap-2">
				<h2 className="sr-only">Álbum</h2>
				<div className="flex flex-row flex-wrap gap-4">
					{ALBUM_REWARDS.map((reward) => (
						<AlbumEntry
							key={reward.id}
							reward={reward}
							earned={rewards.unlockedAt[reward.id] !== undefined}
						/>
					))}
				</div>
			</section>
			{SLOTS.map(({ slot, label }) => (
				<CosmeticRow
					key={slot}
					slot={slot}
					label={label}
					unlockedAt={rewards.unlockedAt}
					equippedId={equipped[slot]}
					onEquip={alEquipar}
				/>
			))}
			<BigButton aria-label="Volver al mapa" onClick={onClose}>
				↩️
			</BigButton>
		</main>
	);
}
