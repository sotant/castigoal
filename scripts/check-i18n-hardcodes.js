const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCE_DIRS = ['app', 'src'];
const IGNORE_DIRS = new Set([
  '.expo',
  '.git',
  'android',
  'dist',
  'node_modules',
  'src/i18n',
  'supabase',
]);
const IGNORE_FILES = new Set([
  'src/config/env.ts',
  'src/constants/punishments.ts',
  'src/hooks/use-auth.ts',
  'src/lib/app-error.ts',
  'src/lib/auth-deep-links.ts',
  'src/lib/database.types.ts',
  'src/i18n/index.ts',
  'src/repositories/app-repository.ts',
  'src/repositories/auth-repository.ts',
  'src/services/storage.ts',
  'src/types/zustand-middleware-js.d.ts',
]);
const IGNORE_MARKER = 'i18n-check ignore';
const STRING_LITERAL_REGEX = /(['"`])((?:\\.|(?!\1).)*)\1/g;

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function shouldSkipDir(relativePath) {
  return Array.from(IGNORE_DIRS).some((ignoredPath) => relativePath === ignoredPath || relativePath.startsWith(`${ignoredPath}/`));
}

function shouldSkipFile(relativePath) {
  return IGNORE_FILES.has(relativePath);
}

function walk(relativeDir, files) {
  const absoluteDir = path.join(ROOT, relativeDir);

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = toPosixPath(path.join(relativeDir, entry.name));

    if (entry.isDirectory()) {
      if (!shouldSkipDir(relativePath)) {
        walk(relativePath, files);
      }
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry.name) || shouldSkipFile(relativePath)) {
      continue;
    }

    files.push(relativePath);
  }
}

function isLikelyVisibleText(value) {
  if (!value || value.length < 4) {
    return false;
  }

  if (!/[A-Za-z]/.test(value)) {
    return false;
  }

  if (!/\s|[.!?]|[ÁÉÍÓÚÜÑáéíóúüñ]/.test(value)) {
    return false;
  }

  if (
    value.includes('@/') ||
    value.includes('./') ||
    value.includes('../') ||
    /^\d{4}-\d{2}-\d{2}T/.test(value) ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('#') ||
    value.startsWith('rgba(') ||
    value.startsWith('rgb(') ||
    value.includes('${')
  ) {
    return false;
  }

  return true;
}

function shouldIgnoreMatch(line, value) {
  if (line.includes(IGNORE_MARKER)) {
    return true;
  }

  const trimmed = line.trim();

  if (
    trimmed.startsWith('import ') ||
    trimmed.startsWith('export ') ||
    trimmed.includes(' from ') ||
    trimmed.includes('.includes(') ||
    trimmed.includes('.select(') ||
    trimmed.includes('.from(') ||
    trimmed.includes('APP_STORAGE_PREFIX') ||
    trimmed.includes('KEY = ') ||
    trimmed.includes('createAppError(') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('*')
  ) {
    return true;
  }

  if (/^\s*[a-zA-Z0-9_]+\s*:\s*['"`]/.test(line) && /^[a-z0-9_:-]+$/i.test(value)) {
    return true;
  }

  return false;
}

function collectMatches(filePath) {
  const absolutePath = path.join(ROOT, filePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const matches = [];

  lines.forEach((line, index) => {
    for (const match of line.matchAll(STRING_LITERAL_REGEX)) {
      const value = match[2];

      if (!isLikelyVisibleText(value) || shouldIgnoreMatch(line, value)) {
        continue;
      }

      matches.push({
        filePath,
        lineNumber: index + 1,
        value,
      });
    }
  });

  return matches;
}

const files = [];
SOURCE_DIRS.forEach((dir) => walk(dir, files));

const findings = files.flatMap(collectMatches);

if (findings.length === 0) {
  console.log('i18n hardcode check passed.');
  process.exit(0);
}

console.error('Potential visible hardcodes found outside src/i18n:');

for (const finding of findings) {
  console.error(`- ${finding.filePath}:${finding.lineNumber} -> ${finding.value}`);
}

process.exit(1);
