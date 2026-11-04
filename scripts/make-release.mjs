// Assembles an upload-ready folder:  npm run release   ->  release/archiv/
//   index.html + assets/   (the built frontend)
//   api/                   (the PHP API without tests, secrets and local data)
// Copy the content of release/archiv/ to any PHP web space (Synology Web Station, QNAP, Apache, nginx + PHP-FPM ...).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'release', 'archiv');

// Build with the relative default (api/ next to index.html) regardless of local .env files.
const build = spawnSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'release'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

rmSync(resolve(root, 'release'), { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(resolve(root, 'dist'), out, { recursive: true });

const skip = (src) => {
  const rel = src.slice(resolve(root, 'api').length).replace(/\\/g, '/');
  if (rel.startsWith('/tests')) return false;
  if (rel === '/.env') return false;
  if (rel.startsWith('/data/') && !rel.endsWith('.htaccess') && !rel.endsWith('.gitkeep')) return false;
  return true;
};
cpSync(resolve(root, 'api'), resolve(out, 'api'), { recursive: true, filter: skip });

cpSync(resolve(root, 'scripts', 'serve.php'), resolve(out, 'serve.php'));
if (!existsSync(resolve(out, 'api', '.env.example'))) throw new Error('api/.env.example fehlt im Release');
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
writeFileSync(resolve(out, 'VERSION'), `${version}\n`);
console.log(`\nRelease ${version} liegt in ${out}`);
