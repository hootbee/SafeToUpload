import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { existsSync } from 'node:fs';

const distDir = join(import.meta.dirname, '..', 'dist');

if (!existsSync(distDir)) {
  console.warn('[fix-dist-imports] dist/ not found, skipping');
  process.exit(0);
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!name.endsWith('.js')) continue;
    const source = readFileSync(path, 'utf8');
    const fixed = source.replace(/require\((['"])([^'"]+)\.ts\1\)/g, 'require($1$2.js$1)');
    if (fixed !== source) writeFileSync(path, fixed);
  }
}

walk(distDir);
console.log('[fix-dist-imports] patched .ts -> .js requires in dist/');
