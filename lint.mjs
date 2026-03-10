import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TARGETS = ['js', 'tests', 'css', 'index.html'];
const ALLOWED_EXTENSIONS = new Set(['.js', '.css', '.html']);

async function walkFiles(targetPath) {
  const fullPath = path.resolve(ROOT, targetPath);
  const entries = await readdir(fullPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(path.relative(ROOT, entryPath))));
      continue;
    }
    if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function collectFiles() {
  const files = [];
  for (const target of TARGETS) {
    const fullPath = path.resolve(ROOT, target);
    if (path.extname(fullPath)) {
      files.push(fullPath);
      continue;
    }
    files.push(...(await walkFiles(target)));
  }
  return files.sort();
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function checkFile(filePath, content) {
  const issues = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const line = lines[i];

    if (line.includes('\t')) {
      issues.push(`${toRelative(filePath)}:${lineNumber} contains tab indentation`);
    }
    if (/[ \t]+$/.test(line)) {
      issues.push(`${toRelative(filePath)}:${lineNumber} has trailing whitespace`);
    }
  }

  return issues;
}

const files = await collectFiles();
const issues = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  issues.push(...checkFile(file, content));
}

if (issues.length > 0) {
  console.error('Lint checks failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Lint checks passed for ${files.length} files.`);
