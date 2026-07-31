import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const RUNTIME_ASSET_DIRS = ['images', 'sounds'];

function copyRuntimeAssets() {
  return {
    name: 'copy-runtime-assets',
    apply: 'build',
    async closeBundle() {
      await Promise.all(
        RUNTIME_ASSET_DIRS.map((dir) =>
          cp(resolve(ROOT, dir), resolve(ROOT, 'dist', dir), { recursive: true })
        )
      );
    }
  };
}

export default defineConfig({
  base: '/homebrew/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  },
  plugins: [copyRuntimeAssets()]
});
