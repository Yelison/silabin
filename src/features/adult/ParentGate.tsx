"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import {
	type AdultChallenge,
	adultChallenge,
} from "@/features/adult/challenge";
import type { Download } from "@/features/adult/download";
import { ParentPanel } from "@/features/adult/ParentPanel";
import { useApp } from "@/features/app-context";
import { pinSupported } from "@/store";

const SIN_HTTPS = "El panel necesita una conexión segura (https)";
const NO_COINCIDEN = "No coinciden";
const PIN_INCORRECTO = "PIN incorrecto";
const RESPUESTA_MALA = "Otra vez";

type Step =
	| { kind: "unsupported" }
	| { kind: "create"; pending: string | null; mismatch: boolean }
	| { kind: "enter"; wrong: boolean }
	| { kind: "forgot"; challenge: AdultChallenge; wrong: boolean };

function pasoInicial(pinHash: string | null): Step {
	if (!pinSupported()) return { kind: "unsupported" };
	if (pinHash === null)
		return { kind: "create", pending: null, mismatch: false };
	return { kind: "enter", wrong: false };
}

const soloDigitos = (texto: string) => texto.replace(/\D/g, "").slice(0, 4);

/**
 * La puerta de PIN del panel de padres. Decide qué pantalla toca (sin soporte, crear PIN,
 * pedir PIN, o la pregunta de "olvidé el PIN") y, al pasar, monta el panel de verdad
 * (`ParentPanel`). Todo el flujo se completa con teclado: es un adulto quien lo usa, no el
 * niño, así que no hace falta un gesto especial.
 */
export function ParentGate(props: {
	onClose: () => void;
	download: Download;
	now?: () => Date;
	random?: () => number;
}) {
	const {
		onClose,
		download,
		now = () => new Date(),
		random = Math.random,
	} = props;
	const pinHashInicial = useApp((s) => s.doc.settings.pinHash);
	const setPin = useApp((s) => s.setPin);
	const checkPin = useApp((s) => s.checkPin);
	const [authenticated, setAuthenticated] = useState(false);
	const [step, setStep] = useState<Step>(() => pasoInicial(pinHashInicial));
	const [value, setValue] = useState("");
	const [answer, setAnswer] = useState("");
	const pinId = useId();
	const answerId = useId();

	// Escape vuelve al mapa desde cualquier paso de la puerta, no solo desde el que tiene foco.
	useEffect(() => {
		if (authenticated) return;
		const alTeclado = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", alTeclado);
		return () => window.removeEventListener("keydown", alTeclado);
	}, [authenticated, onClose]);

	if (authenticated) {
		return (
			<ParentPanel
				download={download}
				now={now}
				onClose={onClose}
				onChangePin={() => {
					// Sin salir del modo autenticado no se pintaría el paso de crear el PIN.
					setAuthenticated(false);
					setStep({ kind: "create", pending: null, mismatch: false });
					setValue("");
				}}
			/>
		);
	}

	const irAOlvido = () => {
		setStep({
			kind: "forgot",
			challenge: adultChallenge(random),
			wrong: false,
		});
		setAnswer("");
	};

	const alCambiarCrear = (texto: string) => {
		if (step.kind !== "create") return;
		const digitos = soloDigitos(texto);
		setValue(digitos);
		if (digitos.length < 4) return;
		if (step.pending === null) {
			// Primera pasada: se guarda y se pide que lo repita, con el campo vacío otra vez.
			setStep({ kind: "create", pending: digitos, mismatch: false });
			setValue("");
			return;
		}
		if (digitos === step.pending) {
			void setPin(digitos).then(() => setAuthenticated(true));
			return;
		}
		// No coinciden: vuelta a empezar desde el primer PIN.
		setStep({ kind: "create", pending: null, mismatch: true });
		setValue("");
	};

	const alCambiarEntrar = (texto: string) => {
		const digitos = soloDigitos(texto);
		setValue(digitos);
		if (digitos.length < 4) return;
		void checkPin(digitos).then((ok) => {
			if (ok) {
				setAuthenticated(true);
				return;
			}
			setStep({ kind: "enter", wrong: true });
			setValue("");
		});
	};

	const alEnviarOlvido = (e: FormEvent) => {
		e.preventDefault();
		if (step.kind !== "forgot") return;
		if (Number(answer) === step.challenge.answer) {
			// D26: vuelve al paso de crear un PIN nuevo, sin tocar el progreso.
			setStep({ kind: "create", pending: null, mismatch: false });
			setValue("");
			setAnswer("");
			return;
		}
		setStep({
			kind: "forgot",
			challenge: adultChallenge(random),
			wrong: true,
		});
		setAnswer("");
	};

	return (
		<div
			role="dialog"
			aria-label="Entrada al panel de padres"
			className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4"
		>
			<div className="w-full max-w-md space-y-4 rounded-card bg-card p-6 text-ink shadow-lg">
				{step.kind === "unsupported" && <p>{SIN_HTTPS}</p>}

				{step.kind === "create" && (
					<>
						<p>Crea un PIN de 4 números</p>
						<label htmlFor={pinId} className="block">
							{step.pending === null ? "Escribe el PIN" : "Repite el PIN"}
						</label>
						<input
							id={pinId}
							type="password"
							inputMode="numeric"
							maxLength={4}
							value={value}
							onChange={(e) => alCambiarCrear(e.target.value)}
							className="w-full rounded-lg border border-calm-border p-2 text-xl tracking-widest"
						/>
						{step.mismatch && (
							<p role="alert" className="text-ink-soft">
								{NO_COINCIDEN}
							</p>
						)}
					</>
				)}

				{step.kind === "enter" && (
					<>
						<label htmlFor={pinId} className="block">
							PIN
						</label>
						<input
							id={pinId}
							type="password"
							inputMode="numeric"
							maxLength={4}
							value={value}
							onChange={(e) => alCambiarEntrar(e.target.value)}
							className="w-full rounded-lg border border-calm-border p-2 text-xl tracking-widest"
						/>
						{step.wrong && (
							<p role="alert" className="text-ink-soft">
								{PIN_INCORRECTO}
							</p>
						)}
						<button
							type="button"
							className="block rounded-lg bg-calm px-4 py-2 text-ink"
							onClick={irAOlvido}
						>
							¿Olvidaste el PIN?
						</button>
					</>
				)}

				{step.kind === "forgot" && (
					<form onSubmit={alEnviarOlvido} className="space-y-3">
						<p>{step.challenge.question}</p>
						<label htmlFor={answerId} className="block">
							Respuesta
						</label>
						<input
							id={answerId}
							type="text"
							inputMode="numeric"
							value={answer}
							onChange={(e) => setAnswer(e.target.value)}
							className="w-full rounded-lg border border-calm-border p-2 text-xl"
						/>
						{step.wrong && (
							<p role="alert" className="text-ink-soft">
								{RESPUESTA_MALA}
							</p>
						)}
						<button
							type="submit"
							className="rounded-lg bg-action px-4 py-2 text-action-ink"
						>
							Comprobar
						</button>
					</form>
				)}

				<button
					type="button"
					className="rounded-lg bg-calm px-4 py-2 text-ink"
					onClick={onClose}
				>
					Volver
				</button>
			</div>
		</div>
	);
}
