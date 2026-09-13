import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'www');

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const skip = new Set([
  'node_modules', '.git', '.github', 'android', 'www',
  'package.json', 'package-lock.json', 'capacitor.config.json',
  'scripts'
]);

for (const name of readdirSync(root)) {
  if (skip.has(name)) continue;
  const src = join(root, name);
  const dest = join(out, name);
  cpSync(src, dest, { recursive: true });
}

console.log(`Prepared web assets in ${out}`);
