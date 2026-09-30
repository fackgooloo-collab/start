import type { AuthStatus, Project, ProjectInput } from './types';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('서버에 연결하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.', 0);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.message ?? data?.error ?? '요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.', response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const api = {
  projects: async () => (await request<{ projects: Project[] }>('/projects')).projects,
  adminProjects: async () => (await request<{ projects: Project[] }>('/admin/projects')).projects,
  authStatus: () => request<AuthStatus>('/auth/status'),
  login: async (password: string) => { await request('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }); },
  setup: async (password: string) => { await request('/auth/setup', { method: 'POST', body: JSON.stringify({ password }) }); },
  logout: async () => { await request('/auth/logout', { method: 'POST' }); },
  createProject: async (project: ProjectInput) => (await request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(project) })).project,
  updateProject: async (id: string, project: ProjectInput) => (await request<{ project: Project }>(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(project) })).project,
  deleteProject: async (id: string) => { await request(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
};
