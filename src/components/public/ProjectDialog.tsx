import { useEffect, useRef } from 'react';
import type { Project } from '../../types';
import { ProjectCover } from './ProjectCover';

export function isDemoProject(project: Project) {
  return project.id.startsWith('demo-') || /구성 예시|가상|컨셉/.test(project.client);
}

export function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (project && element && !element.open) element.showModal();
    if (!project && element?.open) element.close();
  }, [project]);
  let externalLink: string | null = null;
  try { if (project?.link && ['https:', 'http:'].includes(new URL(project.link).protocol)) externalLink = project.link; } catch { /* Only valid web links are displayed. */ }
  return <dialog className="project-dialog" ref={dialog} onClose={onClose} aria-labelledby="project-dialog-title" onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first && last && ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last) || !focusable.includes(document.activeElement as HTMLElement))) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
  }}>
    {project && <>
      <button className="dialog-close" onClick={() => dialog.current?.close()} aria-label="프로젝트 상세 닫기">×</button>
      <ProjectCover project={project} />
      <div className="dialog-body">
        <div className="project-eyebrow"><span>{project.category}</span>{isDemoProject(project) && <span className="demo-badge">구성 예시</span>}</div>
        <h2 id="project-dialog-title">{project.title}</h2><p className="dialog-subtitle">{project.subtitle}</p>
        <dl className="project-facts"><div><dt>CLIENT</dt><dd>{project.client || '—'}</dd></div><div><dt>YEAR</dt><dd>{project.year}</dd></div><div><dt>SCOPE</dt><dd>{project.tags.join(' · ') || project.category}</dd></div></dl>
        <p className="project-description">{project.description}</p>
        {isDemoProject(project) && <p className="demo-notice">사이트 구성을 보여주기 위한 가상의 프로젝트입니다.</p>}
        {externalLink && <a className="button button-dark" href={externalLink} target="_blank" rel="noopener noreferrer">프로젝트 사이트 방문 <span aria-hidden="true">↗</span></a>}
      </div>
    </>}
  </dialog>;
}
