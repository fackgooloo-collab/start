import express from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase, projectFromRow, insertProject, updateProject } from './db.js';
import { hashPassword, verifyPassword, passwordIsValid, saveAdminPassword, tokenHash } from './auth.js';

const COOKIE_NAME = 'jjirit_session';
const SESSION_AGE = 12 * 60 * 60 * 1000;
const fields = new Set(['title', 'subtitle', 'category', 'year', 'description', 'cover', 'tags', 'client', 'link', 'featured', 'published']);
const categories = new Set(['웹사이트', '브랜딩', '커머스']);
const covers = new Set(['coffee', 'beauty', 'architecture', 'finance']);
const loopback = (value) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(value);

function safeUrl(value, protocols) {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

export function validateProject(body, current) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('프로젝트 정보를 객체로 보내 주세요.');
  if (Object.keys(body).some((key) => !fields.has(key))) throw new Error('수정할 수 없는 필드가 포함되어 있습니다.');
  const project = current ? { ...current, ...body } : {
    title: '', subtitle: '', category: '웹사이트', year: String(new Date().getFullYear()),
    description: '', cover: 'coffee', tags: [], client: '', link: '', featured: false, published: true, ...body,
  };
  for (const [field, limit] of [['title', 100], ['subtitle', 160], ['description', 3000], ['client', 100], ['year', 4], ['cover', 2000], ['link', 2000]]) {
    if (typeof project[field] !== 'string' || project[field].length > limit) throw new Error(`${field} 항목의 형식 또는 길이를 확인해 주세요.`);
    project[field] = project[field].trim();
  }
  if (!project.title) throw new Error('프로젝트 제목을 입력해 주세요.');
  if (!categories.has(project.category)) throw new Error('프로젝트 분류를 확인해 주세요.');
  if (!/^\d{4}$/.test(project.year)) throw new Error('연도는 네 자리 숫자로 입력해 주세요.');
  if (!covers.has(project.cover) && !safeUrl(project.cover, ['https:'])) throw new Error('표지는 기본 이미지 또는 HTTPS 이미지 주소를 사용해 주세요.');
  if (project.link && !safeUrl(project.link, ['http:', 'https:'])) throw new Error('프로젝트 링크는 HTTP 또는 HTTPS 주소를 사용해 주세요.');
  if (!Array.isArray(project.tags) || project.tags.length > 8 || project.tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.length > 32)) throw new Error('태그는 32자 이하로 최대 8개까지 입력해 주세요.');
  project.tags = [...new Set(project.tags.map((tag) => tag.trim()))];
  if (typeof project.featured !== 'boolean' || typeof project.published !== 'boolean') throw new Error('공개 및 추천 설정을 확인해 주세요.');
  return project;
}

export async function createApp(options = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD;
  if (adminPassword && !passwordIsValid(adminPassword)) throw new Error('ADMIN_PASSWORD는 12자 이상, 128자 이하로 설정해 주세요.');
  const configuredOrigin = options.publicOrigin ?? process.env.PUBLIC_ORIGIN;
  let publicOrigin;
  if (configuredOrigin) {
    const parsed = new URL(configuredOrigin);
    if (!safeUrl(configuredOrigin, ['http:', 'https:']) || parsed.origin !== configuredOrigin) throw new Error('PUBLIC_ORIGIN에는 경로 없이 사이트의 정확한 Origin을 설정해 주세요.');
    publicOrigin = parsed;
  }
  const db = openDatabase(options.dbPath);
  let environmentPasswordHash;
  try { environmentPasswordHash = adminPassword ? await hashPassword(adminPassword) : undefined; }
  catch (error) { db.close(); throw error; }
  const app = express();
  app.disable('x-powered-by');
  app.locals.db = db;
  app.locals.close = () => db.close();
  const passwordHash = () => environmentPasswordHash || db.prepare('SELECT password_hash FROM admin WHERE id = 1').get()?.password_hash;
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/', maxAge: SESSION_AGE };
  const attempts = new Map();

  function sameOrigin(req) {
    const origin = req.get('origin');
    const host = req.get('host');
    if (!origin || !host) return false;
    try {
      const parsed = new URL(origin);
      if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) return false;
      if (publicOrigin) return origin === publicOrigin.origin && host === publicOrigin.host;
      return origin === `${req.protocol}://${host}`;
    } catch { return false; }
  }

  function setupAllowed(req) {
    if (production || passwordHash() || !loopback(req.socket.remoteAddress)) return false;
    try {
      const url = new URL(`http://${req.get('host')}`);
      return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    } catch { return false; }
  }

  function session(req) {
    const cookie = req.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
    const token = cookie?.slice(COOKIE_NAME.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash(token), Date.now());
    const currentHash = passwordHash();
    return row && currentHash && row.credential_version === tokenHash(currentHash) ? row : null;
  }

  function requireAdmin(req, res, next) {
    if (!session(req)) return res.status(401).json({ error: '관리자 로그인이 필요합니다.' });
    next();
  }

  function authRateLimit(req, res, next) {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.expiresAt <= now) attempts.delete(key);
    const key = req.socket.remoteAddress;
    const entry = attempts.get(key) || { count: 0, expiresAt: now + 15 * 60 * 1000 };
    entry.count++;
    attempts.set(key, entry);
    if (entry.count > 10) {
      res.set('Retry-After', String(Math.ceil((entry.expiresAt - now) / 1000)));
      return res.status(429).json({ error: '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.' });
    }
    next();
  }

  function startSession(res, hash) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR credential_version != ?').run(Date.now(), tokenHash(hash));
    db.prepare('INSERT INTO sessions (token_hash, expires_at, credential_version) VALUES (?,?,?)').run(tokenHash(token), Date.now() + SESSION_AGE, tokenHash(hash));
    res.cookie(COOKIE_NAME, token, cookieOptions);
  }

  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !sameOrigin(req)) return res.status(403).json({ error: '같은 사이트에서 요청해 주세요.' });
    next();
  });
  app.use(express.json({ limit: '32kb', strict: true }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/auth/status', (req, res) => res.json({ authenticated: Boolean(session(req)), setupRequired: !passwordHash(), setupAllowed: setupAllowed(req) }));
  app.post('/api/auth/setup', authRateLimit, async (req, res) => {
    if (!setupAllowed(req)) return res.status(403).json({ error: '초기 비밀번호는 로컬 개발 환경 또는 관리자 설정 명령에서 설정해 주세요.' });
    if (!passwordIsValid(req.body?.password)) return res.status(400).json({ error: '비밀번호는 12자 이상, 128자 이하로 입력해 주세요.' });
    const hash = await hashPassword(req.body.password);
    // Another setup request can finish while scrypt is running. Only the first one may create an admin.
    if (passwordHash()) return res.status(409).json({ error: '관리자 비밀번호가 이미 설정되어 있습니다.' });
    saveAdminPassword(db, hash);
    startSession(res, hash);
    return res.status(201).json({ authenticated: true });
  });
  app.post('/api/auth/login', authRateLimit, async (req, res) => {
    const hash = passwordHash();
    if (!hash) return res.status(409).json({ error: '먼저 관리자 비밀번호를 설정해 주세요.' });
    if (!await verifyPassword(req.body?.password, hash)) return res.status(401).json({ error: '비밀번호를 확인해 주세요.' });
    startSession(res, hash);
    return res.json({ authenticated: true });
  });
  app.post('/api/auth/logout', (req, res) => {
    const current = session(req);
    if (current) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(current.token_hash);
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: production, sameSite: 'strict', path: '/' });
    return res.json({ authenticated: false });
  });
  app.get('/api/projects', (req, res) => {
    const projects = db.prepare('SELECT * FROM projects WHERE published = 1 ORDER BY featured DESC, created_at DESC, id ASC').all().map(projectFromRow);
    res.json({ projects });
  });
  app.get('/api/admin/projects', requireAdmin, (req, res) => {
    res.json({ projects: db.prepare('SELECT * FROM projects ORDER BY created_at DESC, id ASC').all().map(projectFromRow) });
  });
  app.get('/api/projects/:id', (req, res) => {
    const project = projectFromRow(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
    if (!project || (!project.published && !session(req))) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    return res.json({ project });
  });
  app.post('/api/projects', requireAdmin, (req, res) => {
    let project;
    try { project = validateProject(req.body); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const now = new Date().toISOString();
    project = { ...project, id: randomUUID(), createdAt: now, updatedAt: now };
    insertProject(db, project);
    return res.status(201).json({ project });
  });
  app.patch('/api/projects/:id', requireAdmin, (req, res) => {
    const current = projectFromRow(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
    if (!current) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    let project;
    try { project = validateProject(req.body, current); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    project.updatedAt = new Date().toISOString();
    updateProject(db, project);
    return res.json({ project });
  });
  app.delete('/api/projects/:id', requireAdmin, (req, res) => {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    return res.status(204).end();
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'API 경로를 찾을 수 없습니다.' }));

  if (production) {
    const distDir = resolve(options.distDir || 'dist');
    if (existsSync(resolve(distDir, 'index.html'))) {
      app.use(express.static(distDir));
      app.get('/{*path}', (req, res) => res.sendFile(resolve(distDir, 'index.html')));
    }
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.too.large') return res.status(413).json({ error: '요청 데이터가 너무 큽니다.' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: '올바른 JSON 형식으로 보내 주세요.' });
    console.error('요청 처리 중 오류:', error.message);
    return res.status(500).json({ error: '요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.' });
  });
  return app;
}
