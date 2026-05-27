import { cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(serverRoot, '../shared');
const dest = join(serverRoot, 'src/_shared');

if (!existsSync(src)) {
  console.error('[sync-shared] shared folder not found:', src);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log('[sync-shared] copied shared -> server/src/_shared');
