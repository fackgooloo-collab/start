export type ProjectCategory = '웹사이트' | '브랜딩' | '커머스';
export interface Project {
  id: string;
  title: string;
  subtitle: string;
  category: ProjectCategory;
  year: string;
  description: string;
  cover: string;
  tags: string[];
  client: string;
  link: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export interface AuthStatus {
  authenticated: boolean;
  setupRequired: boolean;
  setupAllowed: boolean;
}
