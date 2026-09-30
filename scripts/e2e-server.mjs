import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const directory = mkdtempSync(join(tmpdir(), 'zzirit-e2e-'));
const testEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: '3002',
  API_PORT: '3002',
  HOST: '127.0.0.1',
  DATABASE_PATH: join(directory, 'portfolio.sqlite'),
  ADMIN_PASSWORD: '',
  PUBLIC_ORIGIN: 'http://127.0.0.1:5174',
};
const children = [
  spawn(process.execPath, ['server/index.js'], { stdio: 'inherit', env: testEnv }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5174'], { stdio: 'inherit', env: testEnv }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => { rmSync(directory, { recursive: true, force: true }); process.exit(code); }, 500);
}
for (const child of children) {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
