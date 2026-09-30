import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const TEST_PASSWORD = 'testing-only-passphrase-2026';

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'jjirit-api-test-'));
  const dbPath = join(directory, 'test.sqlite');
  let app;
  let server;
  let base;
  async function stop() {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    server = null;
    app?.locals.close();
    app = null;
  }
  async function start() {
    app = await createApp({ dbPath, production: false, adminPassword: '', publicOrigin: '', ...options });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  }
  await start();
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  async function request(path, { method = 'GET', body, rawBody, cookie, origin = base, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const req = httpRequest(`${base}${path}`, {
        method,
        headers: { ...(origin ? { Origin: origin } : {}), ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => {
          try {
            const response = { status: res.statusCode, headers: new Headers(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])) };
            const data = response.status === 204 ? null : JSON.parse(Buffer.concat(chunks).toString());
            resolve({ response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] });
          } catch (error) { reject(error); }
        });
      });
      req.on('error', reject);
      req.end(rawBody ?? (body === undefined ? undefined : JSON.stringify(body)));
    });
  }
  return { request, get app() { return app; }, dbPath, restart: async () => { await stop(); await start(); } };
}

async function setup(f) {
  const result = await f.request('/api/auth/setup', { method: 'POST', body: { password: TEST_PASSWORD } });
  assert.equal(result.response.status, 201);
  assert.match(result.response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(result.response.headers.get('set-cookie'), /SameSite=Strict/);
  return result.cookie;
}

test('public samples are explicit examples and health/status work without authentication', async (t) => {
  const f = await fixture(t);
  assert.deepEqual((await f.request('/api/health')).data, { status: 'ok' });
  const { projects } = (await f.request('/api/projects')).data;
  assert.equal(projects.length, 4);
  assert.ok(projects.every((project) => project.id.startsWith('demo-') && project.description.includes('실제 의뢰 또는 납품 실적이 아닙니다.')));
  assert.ok(projects.every((project) => project.published && Array.isArray(project.tags)));
  assert.deepEqual((await f.request('/api/auth/status')).data, { authenticated: false, setupRequired: true, setupAllowed: true });
  assert.equal((await f.request('/api/admin/projects')).response.status, 401);
  assert.equal((await f.request('/api/missing')).response.status, 404);
});

test('first-admin setup needs same-origin local requests and stores hashes rather than passwords or tokens', async (t) => {
  const f = await fixture(t);
  for (const origin of ['', 'https://evil.example']) {
    assert.equal((await f.request('/api/auth/setup', { method: 'POST', origin, body: { password: TEST_PASSWORD } })).response.status, 403);
  }
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', headers: { Host: 'public.example.test' }, origin: 'http://public.example.test', body: { password: TEST_PASSWORD } })).response.status, 403);
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', body: { password: 'short' } })).response.status, 400);
  const cookie = await setup(f);
  const stored = f.app.locals.db.prepare('SELECT password_hash FROM admin').get().password_hash;
  assert.ok(stored.startsWith('scrypt:'));
  assert.ok(!stored.includes(TEST_PASSWORD));
  const sessionHash = f.app.locals.db.prepare('SELECT token_hash FROM sessions').get().token_hash;
  assert.notEqual(sessionHash, cookie.split('=')[1]);
  assert.deepEqual((await f.request('/api/auth/status', { cookie })).data, { authenticated: true, setupRequired: false, setupAllowed: false });
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', body: { password: TEST_PASSWORD } })).response.status, 403);
});

test('authenticated CRUD persists and drafts stay private until published', async (t) => {
  const f = await fixture(t);
  const body = { title: '테스트 프로젝트', subtitle: '테스트 설명', category: '브랜딩', year: '2026', description: '관리자가 작성하는 소개입니다.', cover: 'beauty', tags: ['브랜딩', '개발'], client: '테스트 클라이언트', link: 'https://example.com/work', featured: false, published: false };
  assert.equal((await f.request('/api/projects', { method: 'POST', body })).response.status, 401);
  const cookie = await setup(f);
  const created = await f.request('/api/projects', { method: 'POST', cookie, body });
  assert.equal(created.response.status, 201);
  const id = created.data.project.id;
  assert.ok(id && created.data.project.createdAt);
  assert.equal((await f.request(`/api/projects/${id}`)).response.status, 404);
  assert.equal((await f.request(`/api/projects/${id}`, { cookie })).response.status, 200);
  assert.equal((await f.request('/api/projects')).data.projects.length, 4);
  assert.equal((await f.request('/api/admin/projects', { cookie })).data.projects.length, 5);
  assert.equal((await f.request(`/api/projects/${id}`, { method: 'PATCH', cookie, origin: 'https://evil.example', body: { published: true } })).response.status, 403);
  const updated = await f.request(`/api/projects/${id}`, { method: 'PATCH', cookie, body: { title: '수정된 제목', published: true, cover: 'https://example.com/image.jpg' } });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.project.title, '수정된 제목');
  assert.equal(updated.data.project.description, body.description);
  await f.restart();
  assert.equal((await f.request(`/api/projects/${id}`)).data.project.title, '수정된 제목');
  assert.equal((await f.request('/api/auth/status', { cookie })).data.authenticated, true);
  assert.equal((await f.request(`/api/projects/${id}`, { method: 'DELETE', cookie })).response.status, 204);
  assert.equal((await f.request(`/api/projects/${id}`)).response.status, 404);
  const logout = await f.request('/api/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.response.status, 200);
  assert.equal((await f.request('/api/admin/projects', { cookie })).response.status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { password: 'wrong-password' } })).response.status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { password: TEST_PASSWORD } })).response.status, 200);
});

test('validation rejects unsafe URLs, excessive input, immutable fields and invalid JSON', async (t) => {
  const f = await fixture(t);
  const cookie = await setup(f);
  for (const extra of [
    { link: 'javascript:alert(1)' }, { cover: 'http://example.com/image.jpg' },
    { link: 'https://user:password@example.com' }, { tags: ['a'.repeat(33)] },
    { tags: Array(9).fill('tag') }, { published: 'true' }, { title: '' },
    { title: 'a'.repeat(101) }, { year: 2026 }, { category: 'other' }, { id: 'fixed' },
  ]) {
    const result = await f.request('/api/projects', { method: 'POST', cookie, body: { title: '검증', ...extra } });
    assert.equal(result.response.status, 400, JSON.stringify(extra));
  }
  assert.equal((await f.request('/api/projects', { method: 'POST', cookie, body: { title: '검증', description: 'a'.repeat(40000) } })).response.status, 413);
  assert.equal((await f.request('/api/projects', { method: 'POST', cookie, body: ['invalid'] })).response.status, 400);
  assert.equal((await f.request('/api/projects', { method: 'POST', cookie, rawBody: '{' })).response.status, 400);
});

test('deleting every project never recreates the initial examples', async (t) => {
  const f = await fixture(t);
  const cookie = await setup(f);
  const projects = (await f.request('/api/admin/projects', { cookie })).data.projects;
  for (const { id } of projects) assert.equal((await f.request(`/api/projects/${id}`, { method: 'DELETE', cookie })).response.status, 204);
  await f.restart();
  assert.deepEqual((await f.request('/api/projects')).data, { projects: [] });
});

test('production disables web setup and environment credentials issue secure cookies', async (t) => {
  const f = await fixture(t, { production: true, adminPassword: TEST_PASSWORD });
  assert.deepEqual((await f.request('/api/auth/status')).data, { authenticated: false, setupRequired: false, setupAllowed: false });
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', body: { password: TEST_PASSWORD } })).response.status, 403);
  const result = await f.request('/api/auth/login', { method: 'POST', body: { password: TEST_PASSWORD } });
  assert.equal(result.response.status, 200);
  assert.match(result.response.headers.get('set-cookie'), /Secure/);
  assert.equal((await f.request('/api/admin/projects', { cookie: result.cookie })).response.status, 200);
  await f.restart();
  assert.equal((await f.request('/api/admin/projects', { cookie: result.cookie })).response.status, 401);
});

test('HTTPS proxy origins require the configured Origin and original Host, never forwarded headers', async (t) => {
  const f = await fixture(t, { production: true, adminPassword: TEST_PASSWORD, publicOrigin: 'https://portfolio.example.test' });
  const request = { method: 'POST', body: { password: TEST_PASSWORD }, origin: 'https://portfolio.example.test', headers: { Host: 'portfolio.example.test' } };
  assert.equal((await f.request('/api/auth/login', request)).response.status, 200);
  assert.equal((await f.request('/api/auth/login', { ...request, origin: 'http://portfolio.example.test' })).response.status, 403);
  assert.equal((await f.request('/api/auth/login', { ...request, headers: { 'X-Forwarded-Host': 'portfolio.example.test', 'X-Forwarded-Proto': 'https' } })).response.status, 403);
});

test('authentication attempts are limited, and expired sessions cannot authorize writes', async (t) => {
  const f = await fixture(t, { adminPassword: TEST_PASSWORD });
  const login = await f.request('/api/auth/login', { method: 'POST', body: { password: TEST_PASSWORD } });
  f.app.locals.db.prepare('UPDATE sessions SET expires_at = 0').run();
  assert.equal((await f.request('/api/projects', { method: 'POST', cookie: login.cookie, body: { title: 'expired' } })).response.status, 401);
  for (let attempt = 0; attempt < 9; attempt++) assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { password: 'incorrect' } })).response.status, 401);
  const limited = await f.request('/api/auth/login', { method: 'POST', body: { password: TEST_PASSWORD } });
  assert.equal(limited.response.status, 429);
  assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
});

test('stored credential resets invalidate every existing session', async (t) => {
  const f = await fixture(t);
  const cookie = await setup(f);
  const { hashPassword, saveAdminPassword } = await import('./auth.js');
  const anotherConnection = openDatabase(f.dbPath);
  saveAdminPassword(anotherConnection, await hashPassword('new-testing-passphrase-2026'));
  anotherConnection.close();
  assert.equal((await f.request('/api/admin/projects', { cookie })).response.status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { password: TEST_PASSWORD } })).response.status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { password: 'new-testing-passphrase-2026' } })).response.status, 200);
});

test('admin setup CLI accepts private stdin and resets credentials without printing the password', async (t) => {
  const f = await fixture(t);
  const cookie = await setup(f);
  const replacement = 'cli-testing-passphrase-2026';
  const result = spawnSync(process.execPath, ['server/setup-admin.js'], {
    cwd: process.cwd(), input: `${replacement}\n`, encoding: 'utf8',
    env: { ...process.env, DATABASE_PATH: f.dbPath, ADMIN_PASSWORD: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('기존 로그인 세션을 만료했습니다.'));
  assert.ok(!result.stdout.includes(replacement) && !result.stderr.includes(replacement));
  assert.equal((await f.request('/api/admin/projects', { cookie })).response.status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { password: replacement } })).response.status, 200);
});

test('DATABASE_PATH=:memory: creates independent in-memory databases and no files', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'jjirit-memory-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = `
    import assert from 'node:assert/strict';
    import { readdirSync } from 'node:fs';
    import { openDatabase, defaultDatabasePath } from ${JSON.stringify(new URL('./db.js', import.meta.url).href)};
    assert.equal(defaultDatabasePath(), ':memory:');
    const first = openDatabase();
    first.prepare('DELETE FROM projects').run();
    assert.equal(first.prepare('SELECT COUNT(*) AS count FROM projects').get().count, 0);
    first.close();
    const second = openDatabase();
    assert.equal(second.prepare('SELECT COUNT(*) AS count FROM projects').get().count, 4);
    second.close();
    assert.deepEqual(readdirSync(process.cwd()), []);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: directory, encoding: 'utf8', env: { ...process.env, DATABASE_PATH: ':memory:' },
  });
  assert.equal(result.status, 0, result.stderr);
});
