import type { ApiUser } from './api';

export interface StoredUser {
  token: string;
  email: string;
  username: string;
  bio: string;
  image: string;
  roles: string[];
  id: number;
  topicIds: number[];
  topicNames: string[];
}

const STORAGE_KEY = 'ewrozka_user';

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function userFromApi(apiUser: ApiUser): StoredUser {
  return {
    token: apiUser.token,
    email: apiUser.email,
    username: apiUser.username,
    bio: apiUser.bio,
    image: apiUser.image,
    roles: apiUser.roles,
    id: apiUser.id,
    topicIds: apiUser.topicIds ?? [],
    topicNames: apiUser.topicNames ?? [],
  };
}
