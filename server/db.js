import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const defaultDatabasePath = () => {
  const configuredPath = process.env.DATABASE_PATH || '.data/portfolio.sqlite';
  return configuredPath === ':memory:' ? configuredPath : resolve(configuredPath);
};

const samples = [
  { id: 'demo-coffee', title: '오브제 커피', subtitle: '취향이 머무는 브랜드의 공간', category: '웹사이트', year: '2026', description: '작은 커피 브랜드를 위한 가상의 웹사이트 구성 예시입니다. 원두의 이야기를 담은 제품 소개와 매장 안내를 자연스럽게 연결하고, 처음 방문한 사람도 브랜드의 온도를 느낄 수 있는 화면을 설계했습니다. 실제 의뢰 또는 납품 실적이 아닙니다.', cover: 'coffee', tags: ['웹 디자인', '반응형 개발', '브랜드 스토리'], client: '가상 브랜드 · 구성 예시', link: '', featured: true, published: true },
  { id: 'demo-beauty', title: '모먼트 뷰티', subtitle: '매일의 작은 순간에 빛을 더하다', category: '브랜딩', year: '2026', description: '스킨케어 브랜드의 첫인상을 제안하는 가상의 브랜딩 구성 예시입니다. 차분한 색과 간결한 타이포그래피를 바탕으로 브랜드 소개, 제품 이야기, 패키지와 디지털 화면의 분위기를 하나로 연결했습니다. 실제 의뢰 또는 납품 실적이 아닙니다.', cover: 'beauty', tags: ['브랜드 디자인', '아트 디렉션', '패키지'], client: '가상 브랜드 · 구성 예시', link: '', featured: false, published: true },
  { id: 'demo-architecture', title: '한결 건축', subtitle: '공간이 전하는 조용한 이야기', category: '웹사이트', year: '2025', description: '건축 스튜디오를 위한 가상의 포트폴리오 구성 예시입니다. 프로젝트 사진과 작업의 맥락을 중심에 두고, 방문자가 공간의 특징을 천천히 살펴볼 수 있도록 여백과 정보의 흐름을 정리했습니다. 실제 의뢰 또는 납품 실적이 아닙니다.', cover: 'architecture', tags: ['포트폴리오', '웹 디자인', '반응형 개발'], client: '가상 스튜디오 · 구성 예시', link: '', featured: false, published: true },
  { id: 'demo-finance', title: '그로우', subtitle: '복잡한 경험을 가볍고 명확하게', category: '커머스', year: '2025', description: '디지털 서비스의 상품 소개와 구매 흐름을 제안하는 가상의 커머스 구성 예시입니다. 필요한 정보가 빠르게 전달되도록 구성하고, 비교와 선택 과정이 자연스럽게 이어지는 사용자 경험을 그렸습니다. 실제 의뢰 또는 납품 실적이 아닙니다.', cover: 'finance', tags: ['커머스', 'UI / UX', '서비스 기획'], client: '가상 서비스 · 구성 예시', link: '', featured: false, published: true },
];

export function openDatabase(path = defaultDatabasePath()) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ':memory:') chmodSync(path, 0o600);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT NOT NULL,
      category TEXT NOT NULL, year TEXT NOT NULL, description TEXT NOT NULL,
      cover TEXT NOT NULL, tags TEXT NOT NULL, client TEXT NOT NULL, link TEXT NOT NULL,
      featured INTEGER NOT NULL, published INTEGER NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK (id = 1), password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, credential_version TEXT NOT NULL
    );
  `);
  if (!db.prepare("SELECT value FROM metadata WHERE key = 'seeded'").get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const now = new Date().toISOString();
      for (const project of samples) insertProject(db, { ...project, createdAt: now, updatedAt: now });
      db.prepare("INSERT INTO metadata (key, value) VALUES ('seeded', '1')").run();
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }
  return db;
}

export function projectFromRow(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, subtitle: row.subtitle, category: row.category,
    year: row.year, description: row.description, cover: row.cover,
    tags: JSON.parse(row.tags), client: row.client, link: row.link,
    featured: Boolean(row.featured), published: Boolean(row.published),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function insertProject(db, project) {
  db.prepare(`INSERT INTO projects (id,title,subtitle,category,year,description,cover,tags,client,link,featured,published,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    project.id, project.title, project.subtitle, project.category, project.year, project.description,
    project.cover, JSON.stringify(project.tags), project.client, project.link,
    Number(project.featured), Number(project.published), project.createdAt, project.updatedAt,
  );
}

export function updateProject(db, project) {
  db.prepare(`UPDATE projects SET title=?,subtitle=?,category=?,year=?,description=?,cover=?,tags=?,client=?,link=?,featured=?,published=?,updated_at=? WHERE id=?`).run(
    project.title, project.subtitle, project.category, project.year, project.description,
    project.cover, JSON.stringify(project.tags), project.client, project.link,
    Number(project.featured), Number(project.published), project.updatedAt, project.id,
  );
}
