import {
  Component, inject, signal, OnInit, ChangeDetectionStrategy,
} from "@angular/core";
import { DatePipe, NgClass } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSnackBar } from "@angular/material/snack-bar";
import { EventsService, AppEvent } from "../../core/events/events.service";
import { TelemetryService } from "../../core/telemetry/telemetry.service";

@Component({
  selector: "app-event-log",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, NgClass, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatFormFieldModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1><mat-icon>list_alt</mat-icon> Event Log</h1>
      <div class="header-actions">
        @if (unreadCount() > 0) {
          <span class="badge badge-crit">{{ unreadCount() }} unread</span>
        }
        <button mat-stroked-button (click)="markAllRead()" [disabled]="unreadCount() === 0">
          <mat-icon>done_all</mat-icon> Mark all read
        </button>
        <button mat-icon-button (click)="load()" matTooltip="Refresh">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
    </div>

    <!-- Live alerts from WS -->
    @if (liveAlerts().length > 0) {
      <mat-card class="live-alerts-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>notifications_active</mat-icon>
          <mat-card-title>Live Alerts</mat-card-title>
          <mat-card-subtitle>Real-time from telemetry stream</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="alert-list">
            @for (alert of liveAlerts(); track $index; let i = $index) {
              <div class="alert-item" [ngClass]="alert.type === 'CRITICAL' ? 'alert-crit' : 'alert-warn'">
                <mat-icon>{{ alert.type === "CRITICAL" ? "error" : "warning" }}</mat-icon>
                <div class="alert-body">
                  <div class="alert-msg">{{ alert.message }}</div>
                  <div class="text-xs text-muted text-mono">{{ alert.timestamp | date:"HH:mm:ss" }}</div>
                </div>
                <button mat-icon-button (click)="dismissAlert(i)" matTooltip="Dismiss">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }

    <!-- Filters -->
    <div class="filters">
      <mat-form-field class="type-filter">
        <mat-label>Event type</mat-label>
        <mat-select [(ngModel)]="typeFilter" (ngModelChange)="load()">
          <mat-option value="">All types</mat-option>
          <mat-option value="COMMAND">Commands</mat-option>
          <mat-option value="ALERT">Alerts</mat-option>
          <mat-option value="ERROR">Errors</mat-option>
          <mat-option value="INFO">Info</mat-option>
          <mat-option value="SYSTEM">System</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field class="limit-filter">
        <mat-label>Show</mat-label>
        <mat-select [(ngModel)]="limit" (ngModelChange)="load()">
          <mat-option [value]="50">Last 50</mat-option>
          <mat-option [value]="100">Last 100</mat-option>
          <mat-option [value]="250">Last 250</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <!-- Event list -->
    <mat-card>
      <mat-card-content>
        <div class="event-timeline">
          @for (event of events(); track event.id) {
            <div class="event-item" [class.unread]="!event.isRead" (click)="markRead(event)">
              <div class="event-icon" [ngClass]="severityClass(event.severity)">
                <mat-icon>{{ eventIcon(event.type) }}</mat-icon>
              </div>
              <div class="event-body">
                <div class="event-header">
                  <span class="event-title">{{ event.title }}</span>
                  <span class="badge" [ngClass]="typeBadge(event.type)">{{ event.type }}</span>
                  <span class="badge" [ngClass]="severityBadge(event.severity)">{{ event.severity }}</span>
                  @if (!event.isRead) { <span class="unread-dot"></span> }
                </div>
                <div class="event-message text-muted">{{ event.message }}</div>
                <div class="event-meta text-xs text-muted">
                  <span class="text-mono">{{ event.createdAt | date:"yyyy-MM-dd HH:mm:ss.SSS" }}</span>
                  · <span>{{ event.source }}</span>
                </div>
              </div>
            </div>
          } @empty {
            <div class="no-events text-muted">
              <mat-icon>inbox</mat-icon>
              <p>No events found</p>
            </div>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.4rem; }
      .header-actions { display: flex; align-items: center; gap: 8px; }
    }
    .live-alerts-card { margin-bottom: 16px; border-color: var(--status-crit) !important; }
    .alert-list { display: flex; flex-direction: column; gap: 8px; }
    .alert-item {
      display: flex; align-items: flex-start; gap: 10px; padding: 8px; border-radius: 6px;
      &.alert-crit { background: #3a1a1a; color: var(--status-crit); mat-icon { color: var(--status-crit); } }
      &.alert-warn { background: #3a2a0a; color: var(--status-warn); mat-icon { color: var(--status-warn); } }
    }
    .alert-body { flex: 1; .alert-msg { font-size: 0.85rem; } }
    .filters { display: flex; gap: 12px; margin-bottom: 12px; .type-filter { width: 160px; } .limit-filter { width: 120px; } }
    .event-timeline { display: flex; flex-direction: column; }
    .event-item {
      display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border);
      cursor: pointer; transition: background 0.15s;
      &:hover { background: var(--bg-hover); margin: 0 -16px; padding: 10px 16px; }
      &.unread { background: rgba(88,166,255,0.04); }
      &:last-child { border-bottom: none; }
    }
    .event-icon {
      width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 18px; }
      &.sev-critical { background: #3a1a1a; color: var(--status-crit); }
      &.sev-error    { background: #3a1a1a; color: var(--status-crit); }
      &.sev-warning  { background: #3a2a0a; color: var(--status-warn); }
      &.sev-info     { background: #0d2a4a; color: var(--accent-blue); }
      &.sev-debug    { background: #1e2228; color: var(--text-muted); }
    }
    .event-body { flex: 1; }
    .event-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
    .event-title { font-weight: 500; font-size: 0.9rem; }
    .event-message { font-size: 0.82rem; margin: 2px 0; }
    .event-meta { margin-top: 2px; }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-blue); flex-shrink: 0; }
    .no-events { display: flex; flex-direction: column; align-items: center; padding: 40px; mat-icon { font-size: 40px; opacity: 0.3; } }
  `],
})
export class EventLogComponent implements OnInit {
  private eventsService = inject(EventsService);
  private telemetry     = inject(TelemetryService);
  private snack         = inject(MatSnackBar);

  events      = signal<AppEvent[]>([]);
  unreadCount = signal(0);
  liveAlerts  = this.telemetry.alerts;
  typeFilter  = "";
  limit       = 100;

  ngOnInit() {
    this.load();
  }

  load() {
    this.eventsService.getAll(this.limit, this.typeFilter || undefined).subscribe(e => this.events.set(e));
    this.eventsService.getUnreadCount().subscribe(({ count }) => this.unreadCount.set(count));
  }

  markRead(event: AppEvent) {
    if (event.isRead) return;
    this.eventsService.markAsRead(event.id).subscribe(() => {
      this.events.update(evts => evts.map(e => e.id === event.id ? { ...e, isRead: true } : e));
      this.unreadCount.update(c => Math.max(0, c - 1));
    });
  }

  markAllRead() {
    this.eventsService.markAllAsRead().subscribe(() => {
      this.events.update(evts => evts.map(e => ({ ...e, isRead: true })));
      this.unreadCount.set(0);
      this.snack.open("All events marked as read", "✓", { panelClass: "snack-success" });
    });
  }

  dismissAlert(i: number) {
    this.telemetry.dismissAlert(i);
  }

  eventIcon(type: string): string {
    const icons: Record<string, string> = {
      COMMAND: "send", ALERT: "warning", ERROR: "error",
      INFO: "info", WARNING: "warning_amber", SYSTEM: "settings",
    };
    return icons[type] || "circle";
  }

  severityClass(sev: string): string { return `sev-${sev.toLowerCase()}`; }

  typeBadge(type: string): string {
    if (type === "COMMAND") return "badge-info";
    if (type === "ALERT" || type === "ERROR") return "badge-crit";
    if (type === "WARNING") return "badge-warn";
    return "badge-ok";
  }

  severityBadge(sev: string): string {
    if (sev === "CRITICAL" || sev === "ERROR") return "badge-crit";
    if (sev === "WARNING") return "badge-warn";
    return "badge-info";
  }
}
