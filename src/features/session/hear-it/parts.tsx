/** Los dos botones de «¿lo oyes?»: siempre «sí» a la izquierda y «no» a la derecha. */
export const HEAR_OPTIONS = [
	{
		id: "si",
		label: "sí",
		content: (
			<span aria-hidden="true" className="text-7xl">
				👍
			</span>
		),
	},
	{
		id: "no",
		label: "no",
		// «No» no es un error (spec §2): una mano abierta, nunca una cruz ni un pulgar abajo.
		content: (
			<span aria-hidden="true" className="text-7xl">
				✋
			</span>
		),
	},
];
