import type { ApiUser } from './api';

export interface StoredUser {
  token: string;
  uid: string;
  email: string;
  username: string;
  bio: string;
  image: string;
  roles: string[];
  topicIds: string[];
  topicNames: string[];
}

const STORAGE_KEY = 'ewrozka_user';

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    // Force logout legacy entries (pre-uid migration) that don't have `uid`.
    // These were persisted with numeric `id` only and will crash current code.
    if (!parsed || typeof parsed.uid !== 'string') {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as StoredUser;
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
    token: apiUser.token ?? '',
    uid: apiUser.uid,
    email: apiUser.email,
    username: apiUser.username,
    bio: apiUser.bio,
    image: apiUser.image,
    roles: apiUser.roles,
    topicIds: apiUser.topicIds ?? [],
    topicNames: apiUser.topicNames ?? [],
  };
}
