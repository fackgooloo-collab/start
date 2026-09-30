import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Project } from './types';
import Portfolio from './pages/Portfolio';
import { site } from './site';

const Admin = lazy(() => import('./pages/Admin'));
function PublicPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setProjects(await api.projects()); }
    catch (e) { setError(e instanceof Error ? e.message : '프로젝트를 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <Portfolio projects={projects} loading={loading} error={error} onRetry={load} />;
}
export default function App() {
  const isAdmin = /^\/admin\/?$/.test(window.location.pathname);
  useEffect(() => {
    document.title = isAdmin ? `프로젝트 관리 — ${site.name}` : `${site.name} — ${site.tagline}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${site.name} — ${site.description}`);
  }, [isAdmin]);
  return isAdmin
    ? <Suspense fallback={<main className="route-loading" aria-busy="true">관리 화면을 준비하고 있어요…</main>}><Admin /></Suspense>
    : <PublicPage />;
}
