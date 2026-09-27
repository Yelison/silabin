import { Icon } from "@/components/Icon";

/** Los dos botones de «¿lo oyes?»: siempre «sí» a la izquierda y «no» a la derecha. */
export const HEAR_OPTIONS = [
	{
		id: "si",
		label: "sí",
		content: <Icon name="yes" size={96} />,
	},
	{
		id: "no",
		label: "no",
		// «No» no es un error (spec §2): un icono suave, nunca una cruz ni un pulgar abajo.
		content: <Icon name="no" size={96} />,
	},
];
