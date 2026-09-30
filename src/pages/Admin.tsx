import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { site } from '../site';
import type { Project, ProjectInput } from '../types';
import { ProjectCover } from '../components/public/ProjectCover';
import '../styles/admin.css';

const categories: Project['category'][] = ['웹사이트', '브랜딩', '커머스'];
const coverNames = { coffee: '커피 · 따뜻한 브라운', beauty: '뷰티 · 산뜻한 라임', architecture: '공간 · 차분한 블루', finance: '핀테크 · 또렷한 퍼플' };
type AuthInfo = { authenticated: boolean; setupRequired: boolean; setupAllowed: boolean };
type FormErrors = Partial<Record<keyof ProjectInput | 'tagsText', string>>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function Bolt({ className = '' }: { className?: string }) {
  return <svg className={className} width="28" height="36" viewBox="0 0 28 36" fill="none" aria-hidden="true"><path d="M16.5 1 2 21h10L10.5 35 26 14H16L16.5 1Z" fill="currentColor" /></svg>;
}

function Arrow({ direction = 'right' }: { direction?: 'right' | 'left' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: direction === 'left' ? 'rotate(180deg)' : undefined }}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Admin() {
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [authError, setAuthError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [visibility, setVisibility] = useState('전체');
  const [editor, setEditor] = useState<Project | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const checkAuth = useCallback(async () => {
    setAuthError('');
    try { setAuth(await api.authStatus()); }
    catch (error) { setAuthError(errorMessage(error)); }
  }, []);

  useEffect(() => { void checkAuth(); }, [checkAuth]);

  const checkSession = useCallback(async () => {
    try {
      const status = await api.authStatus();
      if (!status.authenticated) {
        setAuth(status);
        setProjects([]);
        setEditor(null);
        setDeleteTarget(null);
        setAuthError('로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
      }
    } catch { /* Keep the original request error when the network is unavailable. */ }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setListError('');
    try { setProjects(await api.adminProjects()); }
    catch (error) { setListError(errorMessage(error)); void checkSession(); }
    finally { setLoadingProjects(false); }
  }, [checkSession]);

  useEffect(() => {
    if (auth?.authenticated) void loadProjects();
  }, [auth?.authenticated, loadProjects]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function saveProject(values: ProjectInput) {
    try {
      const saved = editor === 'new' ? await api.createProject(values) : await api.updateProject((editor as Project).id, values);
      setProjects(current => editor === 'new' ? [saved, ...current] : current.map(project => project.id === saved.id ? saved : project));
      setEditor(null);
      setToast(editor === 'new' ? '새 프로젝트를 저장했습니다.' : '프로젝트를 수정했습니다.');
    } catch (error) { void checkSession(); throw error; }
  }

  async function deleteProject() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteProject(deleteTarget.id);
      setProjects(current => current.filter(project => project.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast('프로젝트를 삭제했습니다.');
    } catch (error) { setDeleteError(errorMessage(error)); void checkSession(); }
    finally { setDeleting(false); }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await api.logout();
      setAuth(previous => previous ? { ...previous, authenticated: false } : null);
      setProjects([]);
      setToast('');
    } catch (error) { setToast(errorMessage(error)); }
    finally { setLoggingOut(false); }
  }

  if (!auth) return <div className="admin-shell admin-auth-page"><div className="admin-connection" role={authError ? 'alert' : 'status'}><Bolt /><p>{authError || '관리자 공간을 준비하고 있어요.'}</p>{authError && <button className="admin-button admin-button-dark" onClick={() => void checkAuth()}>다시 시도</button>}<a href="/">포트폴리오로 돌아가기</a></div></div>;

  if (!auth.authenticated) return <AuthGate auth={auth} initialError={authError} onAuthenticated={async () => { setAuthError(''); setAuth(await api.authStatus()); }} />;

  const published = projects.filter(project => project.published).length;
  const normalizedQuery = query.toLocaleLowerCase('ko-KR').trim();
  const filtered = projects.filter(project => (category === '전체' || project.category === category) && (visibility === '전체' || (visibility === '공개' ? project.published : !project.published)) && (!normalizedQuery || [project.title, project.subtitle, project.client, ...project.tags].join(' ').toLocaleLowerCase('ko-KR').includes(normalizedQuery)));

  return <div className="admin-shell admin-dashboard">
    <aside className="admin-sidebar">
      <a className="admin-brand" href="/" aria-label={`${site.name} 포트폴리오 홈`}><Bolt /><span>{site.name}<span>{site.englishName}</span></span></a>
      <div className="admin-space-label">STUDIO WORKSPACE</div>
      <nav aria-label="관리자 메뉴"><a href="/admin" className="admin-nav-active"><span className="admin-grid-icon" aria-hidden="true">▦</span>프로젝트<span className="admin-nav-count">{projects.length}</span></a><a href="/" target="_blank" rel="noreferrer">포트폴리오 보기<Arrow /></a></nav>
      <div className="admin-sidebar-note"><span className="admin-small-bolt"><Bolt /></span><p>좋은 작업은,<br />다음 작업의 시작.</p><span>작업을 쌓고 가능성을 넓혀요.</span></div>
      <div className="admin-sidebar-footer"><span className="admin-avatar">Z</span><div>스튜디오 관리자<span>포트폴리오 관리</span></div><button className="admin-text-button" onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? '종료 중' : '로그아웃'}</button></div>
    </aside>

    <main className="admin-main">
      <div className="admin-topbar"><span>WORKSPACE <span>/</span> PROJECTS</span><a href="/" target="_blank" rel="noreferrer">라이브 사이트 <Arrow /></a></div>
      <header className="admin-page-header"><div><p className="admin-eyebrow">KEEP THE SPARK GOING</p><h1>작업을 모으는 공간<span>.</span></h1><p className="admin-page-description">{site.name}의 다음 가능성이 될 프로젝트를 관리하세요.</p></div><button className="admin-button admin-button-dark admin-new-button" onClick={() => setEditor('new')}><span aria-hidden="true">＋</span> 새 프로젝트</button></header>

      <section className="admin-stats" aria-label="프로젝트 현황">
        {[{ label: '전체 프로젝트', count: projects.length, filter: '전체', note: 'ALL PROJECTS' }, { label: '공개 중', count: published, filter: '공개', note: 'LIVE ON YOUR SITE' }, { label: '초안', count: projects.length - published, filter: '초안', note: 'WORK IN PROGRESS' }].map((stat, index) => <button key={stat.label} className={`admin-stat ${visibility === stat.filter ? 'is-active' : ''}`} onClick={() => setVisibility(stat.filter)} aria-pressed={visibility === stat.filter}><span>{stat.label}<span className={`admin-stat-dot admin-stat-dot-${index}`} /></span><strong>{String(stat.count).padStart(2, '0')}<Arrow /></strong><small>{stat.note}</small></button>)}
      </section>

      <section className="admin-project-section" aria-labelledby="admin-project-heading">
        <div className="admin-section-heading"><div><h2 id="admin-project-heading">프로젝트<span>{filtered.length}</span></h2><p>공개 프로젝트는 포트폴리오에 바로 반영됩니다.</p></div><label className="admin-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.5" /></svg><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="프로젝트 검색" aria-label="프로젝트 제목, 고객사, 태그 검색" /></label></div>
        <div className="admin-list-controls"><div className="admin-category-tabs" aria-label="프로젝트 분야">{['전체', ...categories].map(item => <button key={item} onClick={() => setCategory(item)} className={category === item ? 'is-selected' : ''} aria-pressed={category === item}>{item}</button>)}</div><label className="admin-visibility-filter"><span className="admin-sr-only">공개 상태 필터</span><select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="전체">모든 상태</option><option value="공개">공개 중</option><option value="초안">초안</option></select></label></div>

        {listError && <div className="admin-inline-error" role="alert"><span>{listError}</span><button onClick={() => void loadProjects()} disabled={loadingProjects}>다시 불러오기</button></div>}
        {loadingProjects ? <div className="admin-empty" role="status"><div className="admin-loading-dot" /><h3>프로젝트를 불러오는 중이에요.</h3><p>잠시만 기다려 주세요.</p></div> : !listError && projects.length === 0 ? <div className="admin-empty"><span className="admin-empty-bolt"><Bolt /></span><h3>첫 번째 작업을 기록해 볼까요?</h3><p>작은 시작도 훌륭한 포트폴리오가 됩니다.<br />프로젝트를 추가하고 {site.name}의 이야기를 채워 보세요.</p><button className="admin-button admin-button-dark" onClick={() => setEditor('new')}>첫 프로젝트 만들기 <Arrow /></button></div> : filtered.length === 0 && !listError ? <div className="admin-empty"><h3>조건에 맞는 프로젝트가 없어요.</h3><p>검색어 또는 필터를 바꿔 보세요.</p><button className="admin-text-button" onClick={() => { setQuery(''); setCategory('전체'); setVisibility('전체'); }}>모든 프로젝트 보기</button></div> : filtered.length > 0 ? <div className="admin-project-list"><div className="admin-table-head" aria-hidden="true"><span>PROJECT</span><span>CATEGORY</span><span>STATUS</span><span>MANAGE</span></div>{filtered.map(project => <article className="admin-project-row" key={project.id}><div className="admin-project-summary"><button className="admin-project-thumb" onClick={() => setEditor(project)} aria-label={`${project.title} 수정`}><ProjectCover project={project} /></button><div><div className="admin-project-title"><button onClick={() => setEditor(project)}>{project.title}</button>{project.featured && <span className="admin-featured-tag" title="추천 프로젝트">★<span className="admin-sr-only"> 추천 프로젝트</span></span>}</div><p>{project.client || `${site.name} 프로젝트`}<span>·</span>{project.year}</p></div></div><span className="admin-project-category">{project.category}</span><span className={`admin-status-tag ${project.published ? 'is-published' : ''}`}><span />{project.published ? '공개 중' : '초안'}</span><div className="admin-row-actions"><button className="admin-edit-button" onClick={() => setEditor(project)}>수정<Arrow /></button><button className="admin-delete-button" onClick={() => { setDeleteError(''); setDeleteTarget(project); }} aria-label={`${project.title} 삭제`}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div></article>)}</div> : null}
      </section>
      <footer className="admin-main-footer"><span>© {new Date().getFullYear()} {site.englishName} STUDIO</span><span>MAKE GOOD THINGS HAPPEN. <Bolt /></span></footer>
    </main>
    <div className={`admin-toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">{toast && <><span aria-hidden="true">✓</span>{toast}<button onClick={() => setToast('')} aria-label="알림 닫기">×</button></>}</div>
    {editor && <ProjectEditor project={editor === 'new' ? null : editor} onSave={saveProject} onClose={() => setEditor(null)} />}
    {deleteTarget && <DeleteDialog project={deleteTarget} pending={deleting} error={deleteError} onConfirm={() => void deleteProject()} onClose={() => { if (!deleting) setDeleteTarget(null); }} />}
  </div>;
}

function AuthGate({ auth, initialError, onAuthenticated }: { auth: AuthInfo; initialError: string; onAuthenticated: () => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setup = auth.setupRequired && auth.setupAllowed;
  const blockedSetup = auth.setupRequired && !auth.setupAllowed;

  useEffect(() => { setError(initialError); }, [initialError]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!password) { setError('관리자 비밀번호를 입력해 주세요.'); return; }
    if (setup && (password.length < 12 || password.length > 128)) { setError('비밀번호는 12~128자로 설정해 주세요.'); return; }
    if (setup && password !== repeat) { setError('두 비밀번호가 일치하지 않습니다.'); return; }
    setError('');
    setPending(true);
    try {
      if (setup) await api.setup(password); else await api.login(password);
      await onAuthenticated();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  return <main className="admin-shell admin-auth-page"><a href="/" className="admin-auth-back"><Arrow direction="left" /> 포트폴리오로 돌아가기</a><div className="admin-auth-card"><div className="admin-auth-art"><a href="/" className="admin-brand"><Bolt /><span>{site.name}<span>{site.englishName}</span></span></a><div className="admin-auth-art-copy"><p>THE NEXT SPARK<br />STARTS HERE.</p><span>좋은 작업을 기록하고,<br />새로운 가능성을 만들어 가요.</span></div><div className="admin-auth-art-bolt"><Bolt /></div><span className="admin-auth-edition">STUDIO WORKSPACE — 01</span></div><section className="admin-auth-content"><p className="admin-eyebrow">FOR THE MAKERS</p><h1>{blockedSetup ? '관리자 설정이 필요해요.' : setup ? <>첫 불꽃을 켜 볼까요<span>?</span></> : <>다시 만나 반가워요<span>.</span></>}</h1><p className="admin-auth-description">{blockedSetup ? '서버에서 관리자 비밀번호를 설정한 후 로그인할 수 있습니다.' : setup ? '관리자 비밀번호를 설정하고 프로젝트 관리를 시작하세요.' : '관리자 비밀번호를 입력하고 작업을 이어 가세요.'}</p>{blockedSetup ? <div className="admin-setup-instructions"><h2>서버 관리자 설정</h2><p>프로젝트 디렉터리에서 다음 명령을 실행하세요.</p><code>npm run admin:setup</code><p>또는 서버 환경 변수 <code>ADMIN_PASSWORD</code>를 설정한 뒤 서버를 재시작하세요. 비밀번호 값은 채팅이나 저장소에 기록하지 마세요.</p><a className="admin-button admin-button-dark" href="/admin">설정 상태 다시 확인 <Arrow /></a></div> : <form onSubmit={submit} className="admin-auth-form"><label htmlFor="admin-password">{setup ? '새 관리자 비밀번호' : '관리자 비밀번호'}</label><div className="admin-password-input"><input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={setup ? 'new-password' : 'current-password'} minLength={setup ? 12 : undefined} maxLength={128} required autoFocus aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-auth-error' : setup ? 'admin-password-help' : undefined} disabled={pending} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>{showPassword ? '숨기기' : '보기'}</button></div>{setup && <><small id="admin-password-help">다른 서비스와 겹치지 않는 12~128자의 비밀번호를 사용해 주세요.</small><label htmlFor="admin-password-repeat">비밀번호 확인</label><input id="admin-password-repeat" type={showPassword ? 'text' : 'password'} value={repeat} onChange={event => setRepeat(event.target.value)} autoComplete="new-password" required disabled={pending} aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-auth-error' : undefined} maxLength={128} /></>}{error && <p id="admin-auth-error" className="admin-field-error" role="alert">{error}</p>}<button className="admin-button admin-button-dark" type="submit" disabled={pending}>{pending ? '확인하고 있어요…' : setup ? '비밀번호 설정하고 시작하기' : '관리자 로그인'}<Arrow /></button></form>}<div className="admin-auth-footnote"><span aria-hidden="true">↳</span> 이 공간은 {site.name}의 작업을 관리하는 곳입니다.</div></section></div><p className="admin-auth-copyright">© {new Date().getFullYear()} {site.englishName} STUDIO</p></main>;
}

function ProjectEditor({ project, onSave, onClose }: { project: Project | null; onSave: (values: ProjectInput) => Promise<void>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(project?.title || '');
  const [subtitle, setSubtitle] = useState(project?.subtitle || '');
  const [category, setCategory] = useState<Project['category']>(project?.category || '웹사이트');
  const [year, setYear] = useState(project?.year || String(new Date().getFullYear()));
  const [description, setDescription] = useState(project?.description || '');
  const [client, setClient] = useState(project?.client || '');
  const [link, setLink] = useState(project?.link || '');
  const [tagsText, setTagsText] = useState(project?.tags.join(', ') || '');
  const initialCover = project?.cover || 'coffee';
  const [coverType, setCoverType] = useState(initialCover in coverNames ? initialCover : 'custom');
  const [coverUrl, setCoverUrl] = useState(initialCover in coverNames ? '' : initialCover);
  const [published, setPublished] = useState(project?.published ?? false);
  const [featured, setFeatured] = useState(project?.featured ?? false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  function validate(): ProjectInput | null {
    const values: ProjectInput = { title: title.trim(), subtitle: subtitle.trim(), category, year: year.trim(), description: description.trim(), client: client.trim(), link: link.trim(), tags: tagsText.split(',').map(tag => tag.trim()).filter(Boolean), cover: coverType === 'custom' ? coverUrl.trim() : coverType as Project['cover'], published, featured };
    const next: FormErrors = {};
    if (!values.title) next.title = '프로젝트 이름을 입력해 주세요.';
    else if (values.title.length > 100) next.title = '100자 이내로 입력해 주세요.';
    if (values.subtitle.length > 160) next.subtitle = '160자 이내로 입력해 주세요.';
    if (!categories.includes(values.category)) next.category = '프로젝트 분야를 선택해 주세요.';
    if (!/^\d{4}$/.test(values.year)) next.year = '연도를 숫자 4자리로 입력해 주세요.';
    if (!values.description) next.description = '프로젝트 소개를 입력해 주세요.';
    else if (values.description.length > 3000) next.description = '3,000자 이내로 입력해 주세요.';
    if (values.client.length > 100) next.client = '100자 이내로 입력해 주세요.';
    if (values.tags.length > 8 || values.tags.some(tag => tag.length > 32)) next.tagsText = '태그는 최대 8개, 각 32자 이내로 입력해 주세요.';
    if (values.link) { try { const url = new URL(values.link); if (!['https:', 'http:'].includes(url.protocol)) throw new Error(); } catch { next.link = 'http:// 또는 https://로 시작하는 올바른 주소를 입력해 주세요.'; } }
    if (coverType === 'custom') { try { const url = new URL(values.cover); if (url.protocol !== 'https:') throw new Error(); } catch { next.cover = 'https://로 시작하는 올바른 이미지 주소를 입력해 주세요.'; } }
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      window.requestAnimationFrame(() => document.getElementById(first === 'cover' && coverType === 'custom' ? 'project-cover-url' : `project-${first}`)?.focus());
      return null;
    }
    return values;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    const values = validate();
    if (!values) return;
    setPending(true);
    try { await onSave(values); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  const fieldProps = (key: keyof FormErrors) => ({ 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `project-${key}-error` : undefined });
  const fieldError = (key: keyof FormErrors) => errors[key] ? <p className="admin-field-error" id={`project-${key}-error`}>{errors[key]}</p> : null;
  const previewCover = coverType === 'custom' ? coverUrl.trim() : coverType;

  return <dialog ref={ref} className="admin-dialog admin-editor" aria-labelledby="project-editor-title" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !pending) onClose(); }}><form className="admin-editor-inner" onSubmit={submit} noValidate><header className="admin-dialog-header"><div><p className="admin-eyebrow">{project ? 'EDIT YOUR WORK' : 'ADD A NEW SPARK'}</p><h2 id="project-editor-title">{project ? '프로젝트 수정' : '새 프로젝트'}</h2></div><button className="admin-dialog-close" type="button" onClick={onClose} disabled={pending} aria-label="프로젝트 편집 닫기">×</button></header><div className="admin-editor-body"><div className="admin-editor-fields"><div className="admin-form-section-title"><span>01</span><h3>프로젝트 정보</h3></div><div className="admin-field"><label htmlFor="project-title">프로젝트 이름 <span>*</span></label><input id="project-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder="예: 일상에 여유를 더하는, 오브 커피" disabled={pending} autoFocus {...fieldProps('title')} />{fieldError('title')}</div><div className="admin-field"><label htmlFor="project-subtitle">한 줄 소개</label><input id="project-subtitle" value={subtitle} onChange={event => setSubtitle(event.target.value)} maxLength={160} placeholder="프로젝트를 설명하는 짧은 문장" disabled={pending} {...fieldProps('subtitle')} />{fieldError('subtitle')}</div><div className="admin-field-row"><div className="admin-field"><label htmlFor="project-category">분야 <span>*</span></label><select id="project-category" value={category} onChange={event => setCategory(event.target.value as Project['category'])} disabled={pending} {...fieldProps('category')}>{categories.map(item => <option key={item}>{item}</option>)}</select>{fieldError('category')}</div><div className="admin-field"><label htmlFor="project-year">작업 연도 <span>*</span></label><input id="project-year" value={year} onChange={event => setYear(event.target.value)} placeholder="2026" maxLength={4} inputMode="numeric" disabled={pending} {...fieldProps('year')} />{fieldError('year')}</div></div><div className="admin-field"><label htmlFor="project-description">프로젝트 소개 <span>*</span><small>{description.length.toLocaleString()} / 3,000</small></label><textarea id="project-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={3000} rows={5} placeholder="어떤 과제를 어떻게 풀었는지, 작업의 이야기를 들려주세요." disabled={pending} {...fieldProps('description')} />{fieldError('description')}</div><div className="admin-field"><label htmlFor="project-client">고객사</label><input id="project-client" value={client} onChange={event => setClient(event.target.value)} maxLength={100} placeholder="고객사 또는 브랜드 이름" disabled={pending} {...fieldProps('client')} />{fieldError('client')}</div><div className="admin-field"><label htmlFor="project-tagsText">태그</label><input id="project-tagsText" value={tagsText} onChange={event => setTagsText(event.target.value)} placeholder="웹 디자인, 개발, 브랜드 전략" disabled={pending} {...fieldProps('tagsText')} /><small className="admin-field-help">쉼표로 구분해 주세요. 최대 8개, 각 32자까지 입력할 수 있어요.</small>{fieldError('tagsText')}</div><div className="admin-field"><label htmlFor="project-link">프로젝트 링크</label><input id="project-link" type="url" value={link} onChange={event => setLink(event.target.value)} placeholder="https://example.com" disabled={pending} {...fieldProps('link')} />{fieldError('link')}</div></div><aside className="admin-editor-settings"><div className="admin-form-section-title"><span>02</span><h3>커버 & 공개 설정</h3></div><div className="admin-cover-preview">{coverType !== 'custom' || /^https:\/\//.test(coverUrl.trim()) ? <ProjectCover project={{ title: title || 'YOUR NEXT PROJECT', cover: previewCover as Project['cover'] }} /> : <div className="admin-cover-placeholder"><Bolt /><span>프로젝트 커버</span></div>}</div><div className="admin-field"><label htmlFor="project-cover">커버 이미지</label><select id="project-cover" value={coverType} onChange={event => setCoverType(event.target.value)} disabled={pending} {...fieldProps('cover')}>{Object.entries(coverNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}<option value="custom">외부 이미지 URL 사용</option></select>{coverType === 'custom' && <><label className="admin-cover-url-label" htmlFor="project-cover-url">이미지 URL</label><input id="project-cover-url" type="url" value={coverUrl} onChange={event => setCoverUrl(event.target.value)} placeholder="https://example.com/image.jpg" disabled={pending} {...fieldProps('cover')} /><small className="admin-field-help">직접 사용할 권한이 있는 HTTPS 이미지 주소를 입력하세요.</small></>}{fieldError('cover')}</div><div className="admin-publishing-settings"><label className="admin-switch-row"><span><strong>포트폴리오에 공개</strong><small>{published ? '저장하면 방문자에게 표시됩니다.' : '초안은 관리자에게만 표시됩니다.'}</small></span><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} disabled={pending} /><span className="admin-switch" aria-hidden="true" /></label><label className="admin-switch-row"><span><strong>추천 프로젝트</strong><small>주목할 프로젝트로 표시합니다.</small></span><input type="checkbox" checked={featured} onChange={event => setFeatured(event.target.checked)} disabled={pending} /><span className="admin-switch" aria-hidden="true" /></label></div><div className="admin-draft-note"><Bolt /><p>{published ? '좋은 작업을 세상과 공유하세요. 저장하는 순간 포트폴리오에 반영됩니다.' : '아직 준비 중이라면 초안으로 저장하세요. 언제든 수정하고 공개할 수 있어요.'}</p></div></aside></div><footer className="admin-dialog-footer">{error && <p className="admin-field-error admin-save-error" role="alert">{error}</p>}<span className="admin-required-note">* 필수 입력 항목</span><div><button className="admin-button admin-button-light" type="button" onClick={onClose} disabled={pending}>취소</button><button className="admin-button admin-button-dark" type="submit" disabled={pending}>{pending ? '저장하는 중…' : '프로젝트 저장'}<Arrow /></button></div></footer></form></dialog>;
}

function DeleteDialog({ project, pending, error, onConfirm, onClose }: { project: Project; pending: boolean; error: string; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="admin-dialog admin-delete-dialog" aria-labelledby="project-delete-title" aria-describedby="project-delete-description" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !pending) onClose(); }}><div className="admin-delete-inner"><div className="admin-delete-mark" aria-hidden="true">!</div><p className="admin-eyebrow">DELETE PROJECT</p><h2 id="project-delete-title">이 프로젝트를 삭제할까요?</h2><p id="project-delete-description"><strong>‘{project.title}’</strong> 프로젝트가 영구적으로 삭제됩니다. 공개 중인 프로젝트는 포트폴리오에서도 사라집니다.</p>{error && <p className="admin-field-error" role="alert">{error}</p>}<div className="admin-delete-actions"><button className="admin-button admin-button-light" onClick={onClose} disabled={pending} autoFocus>취소</button><button className="admin-button admin-button-danger" onClick={onConfirm} disabled={pending}>{pending ? '삭제하는 중…' : '프로젝트 삭제'}</button></div></div></dialog>;
}
