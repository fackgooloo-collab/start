import { useRef, useState } from 'react';
import type { Project } from '../types';
import { site } from '../site';
import { HeroArtwork } from '../components/public/HeroArtwork';
import { ProjectCover } from '../components/public/ProjectCover';
import { ProjectDialog, isDemoProject } from '../components/public/ProjectDialog';
import '../styles/public.css';

type Props = { projects: Project[]; loading: boolean; error: string | null; onRetry: () => void };
const filters = ['전체', '웹사이트', '브랜딩', '커머스'] as const;

function Bolt({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 32" fill="currentColor" aria-hidden="true"><path d="M13 0L0 18H10L7 32L24 11H14L18 0Z" /></svg>;
}

export default function Portfolio({ projects, loading, error, onRetry }: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('전체');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const contactHref = site.email ? `mailto:${site.email}` : '#contact';
  const visibleProjects = projects.filter((project) => project.published && (filter === '전체' || project.category === filter));
  const allProjects = projects.filter((project) => project.published);
  const closeMenu = () => setMenuOpen(false);
  return <div className="portfolio">
    <a className="skip-link" href="#main-content">본문으로 바로가기</a>
    <header className="site-header" onKeyDown={(event) => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuToggle.current?.focus(); } }}><div className="header-inner">
      <a className="wordmark" href="#" aria-label={`${site.name} 홈`} onClick={closeMenu}><Bolt /><span>{site.name}</span><span className="wordmark-dot" aria-hidden="true">✳</span></a>
      <div className="availability"><span />{site.availability}</div>
      <button className="menu-toggle" ref={menuToggle} aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
      <nav id="main-navigation" className={menuOpen ? 'main-navigation is-open' : 'main-navigation'} aria-label="주 메뉴"><a href="#work" onClick={closeMenu}>Work</a><a href="#about" onClick={closeMenu}>About</a><a href="#services" onClick={closeMenu}>Services</a><a className="nav-contact" href="#contact" onClick={closeMenu}>같이 만들어요 <span aria-hidden="true">↗</span></a></nav>
    </div></header>
    <main id="main-content">
      <section className="hero section-shell" aria-labelledby="hero-title">
        <div className="hero-copy"><div className="eyebrow"><span className="small-cross" aria-hidden="true">✳</span> SMALL STUDIO. BIG ENERGY.</div>
          <h1 id="hero-title">당신의 브랜드에,<br /><span className="hero-highlight">찌릿한</span> 한 끗<span className="hero-period">.</span></h1>
          <p className="hero-description">좋은 생각이 좋은 경험이 되도록.<br />브랜딩부터 웹사이트까지, 함께 연결합니다.</p>
          <div className="hero-actions"><a className="button button-dark" href="#work">작업 구경하기 <span aria-hidden="true">↘</span></a><a className="text-link" href={contactHref}>프로젝트 이야기하기 <span aria-hidden="true">↗</span></a></div>
          <div className="hero-bottom"><span className="hero-mini-bolt"><Bolt /></span><span>한 번 보고, 두 번 기억나는 디자인.</span></div>
        </div><HeroArtwork englishName={site.englishName} />
      </section>
      <div className="studio-ribbon"><div className="section-shell"><span>BRAND STRATEGY</span><span aria-hidden="true">✳</span><span>WEB DESIGN & DEVELOPMENT</span><span aria-hidden="true">✳</span><span>DIGITAL EXPERIENCES</span><span aria-hidden="true">✳</span><span>MADE WITH A SPARK</span></div></div>
      <section id="work" className="work-section section-shell" aria-labelledby="work-title">
        <div className="section-heading"><div><div className="eyebrow section-eyebrow"><span className="section-number">01 /</span> SELECTED WORK</div><h2 id="work-title">작업에 담긴 <span>찌릿함.</span></h2></div><p>각자의 이야기, 서로 다른 답.<br />브랜드에 꼭 맞는 경험을 만듭니다.</p></div>
        <div className="work-toolbar"><div className="work-filters" aria-label="프로젝트 카테고리">{filters.map((option) => <button key={option} className={filter === option ? 'filter-button active' : 'filter-button'} aria-pressed={filter === option} onClick={() => setFilter(option)}>{option}{option === '전체' && <span>{allProjects.length.toString().padStart(2, '0')}</span>}</button>)}</div><span className="work-count">{visibleProjects.length.toString().padStart(2, '0')} PROJECTS <span aria-hidden="true">↙</span></span></div>
        {error && <div className="work-error" role="alert"><div><strong>작업을 불러오지 못했어요.</strong><p>{error}</p></div><button className="button button-dark" onClick={onRetry}>다시 불러오기 <span aria-hidden="true">↻</span></button></div>}
        {loading && projects.length === 0 ? <div className="project-grid" aria-label="프로젝트 불러오는 중" aria-busy="true">{[0, 1, 2, 3].map((i) => <div className="project-skeleton" key={i}><div /><span /><span /></div>)}</div> : <div className="project-grid">{visibleProjects.map((project) => <button className="project-card" key={project.id} onClick={() => setSelectedProject(project)} aria-label={`${project.title} 상세 보기`}><div className="project-card-visual"><ProjectCover project={project} />{isDemoProject(project) && <span className="demo-badge card-demo-badge">구성 예시</span>}<span className="project-open" aria-hidden="true">↗</span></div><div className="project-card-info"><div><h3>{project.title}</h3><p>{project.subtitle}</p></div><span className="project-category">{project.category}</span></div></button>)}</div>}
        {!loading && !error && visibleProjects.length === 0 && <div className="work-empty"><span aria-hidden="true">✳</span><h3>새로운 작업을 준비하고 있어요.</h3><p>{filter === '전체' ? '첫 번째 이야기가 곧 이곳에 담깁니다.' : '다른 카테고리의 작업도 둘러보세요.'}</p>{filter !== '전체' && <button className="text-link" onClick={() => setFilter('전체')}>전체 작업 보기 <span aria-hidden="true">↗</span></button>}</div>}
        <div className="work-footnote"><span>좋은 작업은, 좋은 대화에서 시작됩니다.</span><a className="text-link" href="#contact">다음 프로젝트는 당신과 <span aria-hidden="true">↗</span></a></div>
      </section>
      <section id="about" className="about-section"><div className="section-shell about-layout"><div className="about-visual" aria-hidden="true"><div className="about-visual-caption">A SPARK<br />BECOMES<br /><span>A STORY.</span></div><Bolt className="about-bolt" /><div className="about-visual-bottom"><span>{site.englishName} STUDIO</span><span>DESIGN + DEVELOPMENT ↗</span></div></div><div className="about-copy"><div className="eyebrow section-eyebrow"><span className="section-number">02 /</span> ABOUT THE STUDIO</div><h2>작은 스튜디오.<br />선명한 <span className="underlined-word">존재감.</span></h2><p>{site.name}은 브랜드의 가능성을 눈에 보이는 경험으로 만드는 디자인·개발 스튜디오입니다.</p><p>{site.description}</p><p>무엇을 만들지보다, 왜 필요한지부터 이야기해요.<br className="desktop-break" /> 기획, 디자인, 개발이 자연스럽게 이어지도록<br className="desktop-break" /> 처음의 생각부터 마지막 디테일까지 함께합니다.</p><div className="about-values"><span><i aria-hidden="true">↗</i> 생각은 깊게</span><span><i aria-hidden="true">✳</i> 표현은 선명하게</span><span><i aria-hidden="true">↔</i> 소통은 가까이</span></div></div></div></section>
      <section id="services" className="services-section section-shell" aria-labelledby="services-title"><div className="section-heading"><div><div className="eyebrow section-eyebrow"><span className="section-number">03 /</span> WHAT WE DO</div><h2 id="services-title">필요한 만큼,<br className="mobile-break" /> <span>딱 맞게.</span></h2></div><p>처음 시작하는 브랜드부터 다음을 준비하는 팀까지.<br />지금 필요한 것에 집중합니다.</p></div><div className="service-grid">{site.services.map((service, index) => <article className="service-card" key={service.number}><div className="service-card-top"><span>{service.number}</span><span className={`service-symbol symbol-${index}`} aria-hidden="true">{['✳', '↗', '⌘'][index % 3]}</span></div><h3>{service.title}</h3><p>{service.description}</p><div className="service-tags">{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div><div className="process-row"><div className="process-intro"><span className="eyebrow">HOW WE WORK</span><h3>함께 만드는 과정</h3></div>{site.process.map((step) => <div className="process-step" key={step.number}><span>{step.number}</span><h4>{step.title}</h4><p>{step.description}</p></div>)}</div></section>
      <section id="contact" className="contact-section section-shell" aria-labelledby="contact-title"><div className="contact-card"><div className="eyebrow"><span aria-hidden="true">✳</span> LET'S MAKE SOMETHING CLICK.</div><h2 id="contact-title">마음속 그 아이디어,<br />같이 <span>찌릿하게.</span></h2><p>작은 질문도, 아직 정리되지 않은 생각도 좋아요.<br />당신의 이야기를 기다립니다.</p>{site.email ? <><a className="button button-dark" href={contactHref}>프로젝트 문의하기 <span aria-hidden="true">↗</span></a><a className="contact-email" href={contactHref}>{site.email}</a></> : <><span className="button contact-pending">연락처 준비 중 <span aria-hidden="true">✳</span></span><p className="contact-pending-note">문의 채널을 곧 안내해 드릴게요.</p></>}<div className="contact-decoration" aria-hidden="true"><Bolt /></div><span className="contact-note">GOOD CONNECTIONS<br />MAKE GREAT THINGS.</span></div></section>
    </main>
    <footer className="site-footer section-shell"><div className="footer-top"><a className="wordmark" href="#"><Bolt /><span>{site.name}</span><span className="wordmark-dot" aria-hidden="true">✳</span></a><span className="footer-statement">한 끗이 만드는, 새로운 가능성.</span><a className="back-to-top" href="#" aria-label="페이지 맨 위로">BACK TO TOP <span aria-hidden="true">↑</span></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {site.englishName}. ALL RIGHTS RESERVED.</span><div>{site.instagram && <a href={site.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}{site.email && <a href={contactHref}>Email ↗</a>}<a className="admin-footer-link" href="/admin">관리자</a></div></div></footer>
    <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
  </div>;
}
