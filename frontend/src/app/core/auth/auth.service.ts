import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { tap } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { AuthState, AuthUser, LoginPayload, UserRole } from "./auth.models";

@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // ── State signals ────────────────────────────────────────────────────────
  private readonly _state = signal<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });

  readonly user = computed(() => this._state().user);
  readonly token = computed(() => this._state().token);
  readonly isAuthenticated = computed(() => this._state().isAuthenticated);
  readonly userRole = computed(() => this._state().user?.role ?? null);

  readonly isAdmin = computed(() => this.userRole() === "admin");
  readonly isOperator = computed(() =>
    ["admin", "operator"].includes(this.userRole() ?? ""),
  );

  constructor() {
    this.restoreSession();
  }

  login(payload: LoginPayload) {
    return this.http
      .post<{
        accessToken: string;
        user: AuthUser;
      }>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap(({ accessToken, user }) => {
          localStorage.setItem("sat_token", accessToken);
          localStorage.setItem("sat_user", JSON.stringify(user));
          this._state.set({ user, token: accessToken, isAuthenticated: true });
        }),
      );
  }

  logout() {
    localStorage.removeItem("sat_token");
    localStorage.removeItem("sat_user");
    this._state.set({ user: null, token: null, isAuthenticated: false });
    this.router.navigate(["/auth/login"]);
  }

  getToken(): string | null {
    // Fallback to localStorage in case signal hasn't been hydrated yet
    return this._state().token ?? localStorage.getItem("sat_token");
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.userRole();
    return role ? roles.includes(role) : false;
  }

  private restoreSession() {
    const token = localStorage.getItem("sat_token");
    const userStr = localStorage.getItem("sat_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        this._state.set({ user, token, isAuthenticated: true });
      } catch {
        this.logout();
      }
    }
  }
}
