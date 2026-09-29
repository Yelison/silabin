import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/content/**', 'src/engine/**', 'src/store/**', 'src/speech/**'],
    },
    // Los .test.tsx (interfaz) corren en jsdom y los .test.ts en node, sin comentario por fichero.
    // El comentario `// @vitest-environment` sigue mandando sobre el proyecto.
    projects: [
      { extends: true, test: { name: 'node', environment: 'node', include: ['src/**/*.test.ts'] } },
      { extends: true, test: { name: 'jsdom', environment: 'jsdom', include: ['src/**/*.test.tsx'] } },
    ],
  },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
});
