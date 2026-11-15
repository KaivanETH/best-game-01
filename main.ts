// Hands Tidelamp in: copies game/ and screenshots/ into the output directory
// (/output, or $MAKEFUN_OUTPUT_DIR outside the grader) and writes dossier.json with buildDossier.
// Node 22 standard library only; walks files in code-unit order so every run writes the same bytes.

import { copyFileSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function copyTree(from: string, to: string): number {
  mkdirSync(to, { recursive: true });
  let copied = 0;
  for (const name of readdirSync(from).sort(byCodeUnit)) {
    const src = join(from, name);
    const dst = join(to, name);
    const info = lstatSync(src);
    if (info.isSymbolicLink()) throw new Error(`refusing symlink ${src}: game/ must be plain files`);
    if (info.isDirectory()) copied += copyTree(src, dst);
    else if (info.isFile()) {
      copyFileSync(src, dst);
      copied += 1;
    }
  }
  return copied;
}

function handIn(): void {
  mkdirSync(outputDir, { recursive: true });
  for (const part of ['game', 'screenshots']) {
    const target = join(outputDir, part);
    rmSync(target, { recursive: true, force: true });
    const count = copyTree(join(repoRoot, part), target);
    console.log(`copied ${part}/: ${count} files`);
  }
  const dossier = buildDossier(repoRoot, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`wrote dossier.json: ${dossier.length} bytes`);
}

handIn();
