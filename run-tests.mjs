import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = path.join(ROOT, 'tests');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

const testFiles = (await walk(TESTS_DIR)).sort();

if (testFiles.length === 0) {
  throw new Error('No *.test.js files found under tests/.');
}

for (const file of testFiles) {
  await import(pathToFileURL(file));
}
