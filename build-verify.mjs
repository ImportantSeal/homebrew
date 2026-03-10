import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = path.join(ROOT, 'index.html');
const JS_ROOT = path.join(ROOT, 'js');

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }

  return files;
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function collectImports(sourceCode) {
  const imports = [];
  const patterns = [
    /(?:import|export)\s+[^'"]*\sfrom\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(sourceCode);
    while (match) {
      imports.push(match[1]);
      match = pattern.exec(sourceCode);
    }
  }

  return imports;
}

async function resolveImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, 'index.js'),
    path.join(base, 'index.mjs')
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  return null;
}

function collectHtmlResources(html) {
  const resources = [];
  const pattern = /<(?:script|img|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi;

  let match = pattern.exec(html);
  while (match) {
    resources.push(match[1]);
    match = pattern.exec(html);
  }

  return resources;
}

function isLocalAsset(reference) {
  return !(
    reference.startsWith('http://') ||
    reference.startsWith('https://') ||
    reference.startsWith('//') ||
    reference.startsWith('data:') ||
    reference.startsWith('mailto:') ||
    reference.startsWith('javascript:') ||
    reference.startsWith('#')
  );
}

const errors = [];
const jsFiles = (await walkJsFiles(JS_ROOT)).sort();

for (const file of jsFiles) {
  const source = await readFile(file, 'utf8');
  const imports = collectImports(source);

  for (const specifier of imports) {
    if (!specifier.startsWith('.')) continue;
    const resolved = await resolveImport(file, specifier);
    if (!resolved) {
      errors.push(`[import] ${toRelative(file)} -> "${specifier}" does not resolve`);
    }
  }
}

const html = await readFile(INDEX_HTML, 'utf8');
const resources = collectHtmlResources(html);

for (const ref of resources) {
  if (!isLocalAsset(ref)) continue;
  const assetPath = path.resolve(ROOT, ref);
  if (!(await fileExists(assetPath))) {
    errors.push(`[asset] index.html references missing file "${ref}"`);
  }
}

if (errors.length > 0) {
  console.error('Build verification failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Build verification passed for ${jsFiles.length} JS files and index assets.`);
