export interface LoginPayload { email: string; password: string; }

export interface AuthUser {
  id: string; email: string;
  firstName: string; lastName: string; role: UserRole;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}
