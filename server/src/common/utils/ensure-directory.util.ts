import { existsSync, mkdirSync } from 'node:fs';

export function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}
