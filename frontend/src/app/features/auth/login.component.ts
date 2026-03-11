import {
  Component, inject, signal, ChangeDetectionStrategy,
} from "@angular/core";
import { Router } from "@angular/router";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-bg">
      <div class="login-container">
        <!-- Header -->
        <div class="login-header">
          <mat-icon class="sat-icon">satellite_alt</mat-icon>
          <h1>SatPayloadControl</h1>
          <p>Ground Segment Operations</p>
        </div>

        <!-- Card -->
        <mat-card class="login-card">
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <mat-form-field>
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email"
                  placeholder="admin@sat.dev" autocomplete="email">
                <mat-icon matPrefix>email</mat-icon>
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>

              <mat-form-field>
                <mat-label>Password</mat-label>
                <input matInput [type]="showPass() ? 'text' : 'password'"
                  formControlName="password" autocomplete="current-password">
                <mat-icon matPrefix>lock</mat-icon>
                <button mat-icon-button matSuffix type="button"
                  (click)="showPass.set(!showPass())">
                  <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              @if (errorMsg()) {
                <div class="error-banner">
                  <mat-icon>error_outline</mat-icon> {{ errorMsg() }}
                </div>
              }

              <button mat-raised-button color="primary" type="submit"
                class="login-btn" [disabled]="loading() || form.invalid">
                @if (loading()) {
                  <mat-spinner diameter="20" />
                } @else {
                  <mat-icon>login</mat-icon> Login
                }
              </button>
            </form>

            <div class="demo-users">
              <p class="demo-label">Demo credentials:</p>
              @for (u of demoUsers; track u.email) {
                <button mat-stroked-button (click)="fillDemo(u.email, u.pass)"
                  class="demo-btn">
                  <span class="badge badge-{{ u.cls }}">{{ u.role }}</span>
                  {{ u.email }}
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: radial-gradient(ellipse at 50% 0%, #1a2a4a 0%, var(--bg-primary) 60%);
    }
    .login-container { width: 100%; max-width: 420px; padding: 24px; }
    .login-header {
      text-align: center; margin-bottom: 24px;
      .sat-icon { font-size: 48px; color: var(--accent-blue); }
      h1 { margin: 8px 0 4px; font-size: 1.6rem; font-weight: 700; }
      p  { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
    }
    .login-card { padding: 8px; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background: #3a1a1a; border: 1px solid var(--status-crit);
      color: var(--status-crit); padding: 8px 12px; border-radius: 6px; font-size: 0.85rem;
      mat-icon { font-size: 18px; }
    }
    .login-btn { height: 44px; font-size: 1rem; margin-top: 8px; display: flex; align-items: center; gap: 8px; }
    .demo-users {
      margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);
      .demo-label { font-size: 0.75rem; color: var(--text-muted); margin: 0 0 8px; }
    }
    .demo-btn {
      width: 100%; justify-content: flex-start; font-size: 0.78rem;
      margin-bottom: 4px; gap: 8px;
    }
  `],
})
export class LoginComponent {
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private fb      = inject(FormBuilder);
  private snack   = inject(MatSnackBar);

  loading  = signal(false);
  showPass = signal(false);
  errorMsg = signal("");

  form = this.fb.group({
    email:    ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });

  demoUsers = [
    { email: "admin@sat.dev",    pass: "Admin1234!",    role: "ADMIN",    cls: "crit" },
    { email: "operator@sat.dev", pass: "Operator1234!", role: "OPERATOR", cls: "warn" },
    { email: "viewer@sat.dev",   pass: "Viewer1234!",   role: "VIEWER",   cls: "info" },
  ];

  fillDemo(email: string, pass: string) {
    this.form.patchValue({ email, password: pass });
    this.errorMsg.set("");
  }

  onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set("");

    this.auth.login(this.form.value as any).subscribe({
      next: () => {
        this.snack.open("Login successful", "✓", { panelClass: "snack-success" });
        this.router.navigate(["/dashboard"]);
      },
      error: () => {
        this.errorMsg.set("Invalid email or password");
        this.loading.set(false);
      },
    });
  }
}
