import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = path.join(ROOT, 'index.html');
const JS_ROOT = path.join(ROOT, 'js');
const DIST_ROOT = path.join(ROOT, 'dist');
const DIST_INDEX_HTML = path.join(DIST_ROOT, 'index.html');
const PAGES_BASE = '/homebrew/';

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

async function walkFiles(dir, predicate = () => true) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath, predicate)));
      continue;
    }
    if (entry.isFile() && predicate(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function stripResourceVersion(reference) {
  return reference.split(/[?#]/, 1)[0];
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
  const base = path.resolve(path.dirname(fromFile), stripResourceVersion(specifier));
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

function collectCssUrls(css) {
  const urls = [];
  const pattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

  let match = pattern.exec(css);
  while (match) {
    urls.push(match[1]);
    match = pattern.exec(css);
  }

  return urls;
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

function normalizeDistReference(reference) {
  const clean = stripResourceVersion(reference);
  if (clean.startsWith(PAGES_BASE)) {
    return clean.slice(PAGES_BASE.length);
  }
  if (clean.startsWith('/')) {
    return clean.slice(1);
  }
  return clean;
}

function isHashedBuildAsset(reference, extension) {
  const normalized = normalizeDistReference(reference);
  const escapedExtension = extension.replace('.', '\\.');
  return new RegExp(`^assets/.+-[A-Za-z0-9_-]{6,}${escapedExtension}$`).test(normalized);
}

function isInsideDir(parentDir, filePath) {
  const relative = path.relative(parentDir, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function verifyDistAsset(errors, reference, fromFile = DIST_INDEX_HTML) {
  if (!isLocalAsset(reference)) return;

  const normalized = normalizeDistReference(reference);
  const baseDir = path.dirname(fromFile);
  const assetPath =
    normalized.startsWith('assets/') ||
    normalized.startsWith('images/') ||
    normalized.startsWith('sounds/')
      ? path.resolve(DIST_ROOT, normalized)
      : path.resolve(baseDir, normalized);

  if (!isInsideDir(DIST_ROOT, assetPath)) {
    errors.push(`[dist] "${reference}" resolves outside dist`);
    return;
  }

  if (!(await fileExists(assetPath))) {
    errors.push(`[dist] missing built asset "${reference}"`);
  }
}

async function verifyDist(errors) {
  if (!(await fileExists(DIST_INDEX_HTML))) {
    errors.push('[dist] dist/index.html is missing; run "npm run build" before build:verify');
    return;
  }

  const html = await readFile(DIST_INDEX_HTML, 'utf8');
  const resources = collectHtmlResources(html);
  const cssRefs = resources.filter((ref) => normalizeDistReference(ref).endsWith('.css'));
  const jsRefs = resources.filter((ref) => normalizeDistReference(ref).endsWith('.js'));

  if (html.includes('?v=')) {
    errors.push('[dist] dist/index.html contains manual query-string cache busting');
  }
  if (html.includes('css/style.css') || html.includes('js/app.js')) {
    errors.push('[dist] dist/index.html still references source CSS or JS files');
  }
  if (cssRefs.length === 0) {
    errors.push('[dist] dist/index.html does not reference a built CSS asset');
  }
  if (jsRefs.length === 0) {
    errors.push('[dist] dist/index.html does not reference a built JS asset');
  }

  for (const ref of cssRefs) {
    if (!isHashedBuildAsset(ref, '.css')) {
      errors.push(`[dist] CSS asset is not content-hashed: "${ref}"`);
    }
  }
  for (const ref of jsRefs) {
    if (!isHashedBuildAsset(ref, '.js')) {
      errors.push(`[dist] JS asset is not content-hashed: "${ref}"`);
    }
  }
  for (const ref of resources) {
    await verifyDistAsset(errors, ref);
  }

  const cssFiles = await walkFiles(DIST_ROOT, (name) => name.endsWith('.css'));
  for (const file of cssFiles) {
    const css = await readFile(file, 'utf8');
    for (const ref of collectCssUrls(css)) {
      await verifyDistAsset(errors, ref, file);
    }
  }
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
  const assetPath = path.resolve(ROOT, stripResourceVersion(ref));
  if (!(await fileExists(assetPath))) {
    errors.push(`[asset] index.html references missing file "${ref}"`);
  }
}

await verifyDist(errors);

if (errors.length > 0) {
  console.error('Build verification failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Build verification passed for ${jsFiles.length} source JS files and Vite dist assets.`);
