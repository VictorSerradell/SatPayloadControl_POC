import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy,
} from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatBadgeModule } from "@angular/material/badge";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatChipsModule } from "@angular/material/chips";
import { AsyncPipe, UpperCasePipe } from "@angular/common";
import { AuthService } from "./core/auth/auth.service";
import { TelemetryService } from "./core/telemetry/telemetry.service";
import { EventsService } from "./core/events/events.service";

interface NavItem {
  path: string; label: string; icon: string;
  roles?: string[]; badge?: boolean;
}

@Component({
  selector: "app-shell",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatBadgeModule,
    MatTooltipModule, MatDividerModule, MatChipsModule,
    AsyncPipe, UpperCasePipe,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <!-- ── Sidebar ──────────────────────────────────────────────────── -->
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="sidenav-header">
          <mat-icon class="sat-icon">satellite_alt</mat-icon>
          <div>
            <div class="app-name">SatPayload</div>
            <div class="app-sub">Control POC</div>
          </div>
        </div>

        <div class="ws-status" [class.connected]="telemetry.connected()">
          <span class="dot"></span>
          {{ telemetry.connected() ? 'Live TM' : 'Disconnected' }}
        </div>

        <mat-divider />

        <mat-nav-list class="nav-list">
          @for (item of navItems; track item.path) {
            @if (canSeeNav(item)) {
              <a mat-list-item
                [routerLink]="item.path"
                routerLinkActive="active-link"
                [matTooltip]="item.label"
                matTooltipPosition="right">
                <mat-icon matListItemIcon
                  [matBadge]="item.badge ? (unreadCount() || null) : null"
                  matBadgeColor="warn"
                  matBadgeSize="small">
                  {{ item.icon }}
                </mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
          }
        </mat-nav-list>

        <div class="sidenav-footer">
          <mat-divider />
          <div class="user-info">
            <mat-icon>person</mat-icon>
            <div>
              <div class="user-name">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</div>
              <div class="user-role badge" [class]="'badge-' + roleClass()">{{ auth.userRole() | uppercase }}</div>
            </div>
          </div>
          <button mat-icon-button (click)="auth.logout()" matTooltip="Logout">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </mat-sidenav>

      <!-- ── Main content ─────────────────────────────────────────────── -->
      <mat-sidenav-content class="main-content">
        <!-- Alert banner -->
        @if (telemetry.alerts().length > 0) {
          <div class="alert-bar" [class.crit]="hasCriticalAlert()">
            <mat-icon>{{ hasCriticalAlert() ? 'error' : 'warning' }}</mat-icon>
            <span>{{ telemetry.alerts()[0].message }}</span>
            @if (telemetry.alerts().length > 1) { <span class="alert-count">
              +{{ telemetry.alerts().length - 1 }} more
            </span> }
            <button mat-icon-button (click)="telemetry.clearAlerts()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
        <div class="content-area">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container { height: 100vh; }

    .sidenav {
      width: 220px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
    }

    .sidenav-header {
      display: flex; align-items: center; gap: 12px;
      padding: 20px 16px 12px;
      .sat-icon { font-size: 28px; color: var(--accent-blue); }
      .app-name { font-weight: 700; font-size: 1rem; letter-spacing: 0.5px; }
      .app-sub  { font-size: 0.7rem; color: var(--text-muted); }
    }

    .ws-status {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 16px 12px;
      font-size: 0.72rem; color: var(--status-crit);
      .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
      &.connected { color: var(--status-ok); }
    }

    .nav-list { padding: 8px 0; flex: 1; }

    mat-nav-list a { border-radius: 8px; margin: 2px 8px; }
    .active-link { background: rgba(88,166,255,0.12) !important; color: var(--accent-blue) !important; }
    .active-link mat-icon { color: var(--accent-blue); }

    .sidenav-footer {
      padding: 8px;
      .user-info { display: flex; align-items: center; gap: 8px; padding: 8px; }
      .user-name { font-size: 0.8rem; font-weight: 500; }
      .user-role { font-size: 0.65rem; margin-top: 2px; }
      mat-icon { color: var(--text-muted); font-size: 20px; }
    }

    .main-content { background: var(--bg-primary); display: flex; flex-direction: column; }

    .alert-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      background: #3a2a0a; border-bottom: 1px solid var(--status-warn);
      color: var(--status-warn); font-size: 0.85rem;
      mat-icon { font-size: 18px; }
      span { flex: 1; }
      .alert-count { font-size: 0.75rem; opacity: 0.8; }
      &.crit { background: #3a1a1a; border-color: var(--status-crit); color: var(--status-crit); }
    }

    .content-area { flex: 1; padding: 24px; overflow: auto; }
  `],
})
export class AppShellComponent implements OnInit {
  auth     = inject(AuthService);
  telemetry = inject(TelemetryService);
  private eventsService = inject(EventsService);

  unreadCount = signal<number>(0);

  readonly navItems: NavItem[] = [
    { path: "dashboard", label: "Dashboard",    icon: "dashboard" },
    { path: "monitor",   label: "TM Monitor",   icon: "monitor_heart" },
    { path: "commands",  label: "Commands",      icon: "send", roles: ["admin", "operator"] },
    { path: "events",    label: "Event Log",     icon: "list_alt", badge: true },
    { path: "history",   label: "History",       icon: "timeline" },
  ];

  readonly roleClass = computed(() => {
    const r = this.auth.userRole();
    if (r === "admin")    return "crit";
    if (r === "operator") return "warn";
    return "info";
  });

  readonly hasCriticalAlert = computed(() =>
    this.telemetry.alerts().some(a => a.type === "CRITICAL")
  );

  canSeeNav(item: NavItem): boolean {
    if (!item.roles) return true;
    return item.roles.some(r => this.auth.hasRole(r as any));
  }

  ngOnInit() {
    this.telemetry.connect();
    this.loadUnreadCount();
    // Poll unread count every 30s
    setInterval(() => this.loadUnreadCount(), 30000);
  }

  private loadUnreadCount() {
    this.eventsService.getUnreadCount().subscribe(({ count }) => this.unreadCount.set(count));
  }
}
