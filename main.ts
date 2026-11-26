// Sky Courier — Island Run: the hand-in program.
// Hands the entry in: copies game/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json with the vendored
// make.fun library. Node 22 standard library only, no network, no
// secrets. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB; more than 993 files in game/
// or 48 MiB of game files, in all, or a path under game/ over 1000 bytes.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(repoDir, outDir) {
  mkdirSync(outDir, { recursive: true });
  // Clear any previous run's output first, so stale files can never ride
  // along into a fresh hand-in.
  for (const sub of ['game', 'screenshots', 'dossier.json']) {
    rmSync(join(outDir, sub), { recursive: true, force: true });
  }
  cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoDir, 'screenshots'))) {
    cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_LIMITS));
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
handIn(here, out);
