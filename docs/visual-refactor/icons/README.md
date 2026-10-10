# Silabín: iconos base y estados con CSS

30 SVG base: 9 tipos de ejercicio y 21 unidades (8 futuras). No hay copias de cada icono por estado ni PNG. El SVG contiene únicamente el símbolo y usa `currentColor`.

## React

Copia `ChallengeNode.tsx` y `challenge-node.css` juntos. Solo requiere React; las formas de Lucide ya están incluidas, con licencia ISC. No necesita instalar Lucide.

```tsx
import { ChallengeNode } from './ChallengeNode';

<ChallengeNode
  icon="count-syllables"
  state="available"
  label="Palabras con palmas, disponible"
  onClick={() => startSession()}
/>

<ChallengeNode
  icon="read-word"
  state="locked"
  label="Leer palabras, bloqueado"
/>
```

Estados: `neutral`, `available`, `completed`, `locked`. El estado bloqueado deshabilita el botón. Las insignias y el aro pertenecen al componente. El motor de la aplicación debe proporcionar el estado: el componente no calcula progreso ni desbloqueos.

`ActivityIcon` permite usar solo el símbolo. El SVG debe renderizarse inline para que herede `currentColor`; un `<img src="icono.svg">` no hereda el color del documento.

Personaliza `--node-size`, colores y sombras en CSS. En Next.js App Router, usa el componente en una pantalla de cliente cuando pases callbacks como `onClick`; importa el CSS desde la ubicación admitida por tu proyecto. Las letras usan contornos de Andika Bold, centrados según sus límites visibles; no necesitan cargar una fuente. Licencia incluida en `OFL-Andika.txt`.

Abre `demo.html` para revisar todos los iconos y cambiar sus estados. `manifest.json` relaciona cada identificador del currículo con su archivo. Las unidades de letras agrupan varias actividades; por eso usan la letra en lugar del icono de una plantilla.

Esta entrega no modifica el repositorio original.
