// Try everything without touching your own archive:   npm run demo
// Generates a small demo archive (first run), starts the PHP API on :8083 (login off, write mode on, throw-away data)
// and the frontend on :5200. Needs: PHP 8+, Python 3 with `pip install pymupdf pillow`.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const archive = resolve(root, 'demo', 'archive');
const data = resolve(root, 'demo', 'data');

if (!existsSync(archive)) {
  const py = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [resolve(root, 'scripts', 'make_demo_archive.py'), archive], { stdio: 'inherit' });
  if (py.status !== 0) {
    console.error('\nDemo-Archiv konnte nicht erzeugt werden. Installiere: pip install pymupdf pillow');
    process.exit(1);
  }
}
mkdirSync(data, { recursive: true });

const env = { ...process.env, DATA_ROOT: archive, INDEX_DIR: data, AUTH: '0', READ_ONLY: '0', CORS_ORIGIN: '*', PDF_TEXT: '0', OCR_ENABLED: '0', EXCLUDE: '' };
const api = spawn('php', ['-d', 'memory_limit=512M', '-S', '127.0.0.1:8083', 'index.php'], { cwd: resolve(root, 'api'), env, stdio: 'inherit' });
const web = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--mode', 'demo', '--port', '5200', '--strictPort'], { cwd: root, stdio: 'inherit' });

const stop = () => {
  api.kill();
  web.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => code && console.error(`API beendet (${code}). Ist PHP im PATH?`));
console.log('\nDemo läuft:  http://localhost:5200   (Strg+C beendet alles)\n');
