import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const RUNTIME_ASSET_DIRS = ['images', 'sounds'];
const RUNTIME_ASSET_FILES = ['js/matter.min.js'];

function copyRuntimeAssets() {
  return {
    name: 'copy-runtime-assets',
    apply: 'build',
    async closeBundle() {
      await mkdir(resolve(ROOT, 'dist', 'js'), { recursive: true });
      await Promise.all([
        ...RUNTIME_ASSET_DIRS.map((dir) =>
          cp(resolve(ROOT, dir), resolve(ROOT, 'dist', dir), { recursive: true })
        ),
        ...RUNTIME_ASSET_FILES.map((file) =>
          cp(resolve(ROOT, file), resolve(ROOT, 'dist', file))
        )
      ]);
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
