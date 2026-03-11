import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Oznacza endpoint jako dostępny tylko dla użytkowników z podanymi rolami. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
