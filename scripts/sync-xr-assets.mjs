#!/usr/bin/env node
/**
 * Copies the self-hosted @8thwall/engine-binary dist artifacts into
 * public/external/xr/ so Next.js / Vercel serves them from the same origin.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourceDir = path.join(repoRoot, 'node_modules/@8thwall/engine-binary/dist');
const targetDir = path.join(repoRoot, 'public/external/xr');

if (!fs.existsSync(sourceDir)) {
  console.warn('[sync-xr-assets] @8thwall/engine-binary/dist not found; skipping copy.');
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

// Copy core runtime, SLAM chunk, license, and resources (skip face chunk unless needed)
const filesToCopy = ['xr.js', 'xr-slam.js', 'LICENSE'];
for (const file of filesToCopy) {
  const src = path.join(sourceDir, file);
  const dst = path.join(targetDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
}

const resourcesSrc = path.join(sourceDir, 'resources');
const resourcesDst = path.join(targetDir, 'resources');
if (fs.existsSync(resourcesSrc)) {
  fs.mkdirSync(resourcesDst, { recursive: true });
  for (const entry of fs.readdirSync(resourcesSrc)) {
    // Skip face-specific tflite models to keep Vercel static bundle lean
    if (entry.startsWith('face-')) continue;
    const src = path.join(resourcesSrc, entry);
    const dst = path.join(resourcesDst, entry);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

console.log('[sync-xr-assets] Synced @8thwall/engine-binary SLAM runtime to public/external/xr');
