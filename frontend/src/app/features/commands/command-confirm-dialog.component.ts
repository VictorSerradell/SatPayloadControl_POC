import { Component, Inject, ChangeDetectionStrategy } from "@angular/core";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDividerModule } from "@angular/material/divider";
import { NgClass } from "@angular/common";

@Component({
  selector: "app-command-confirm-dialog",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, NgClass],
  template: `
    <div class="dialog-header" [ngClass]="riskClass">
      <mat-icon>{{ riskIcon }}</mat-icon>
      <h2 mat-dialog-title>Confirm Telecommand</h2>
    </div>
    <mat-dialog-content>
      <div class="cmd-summary">
        <div class="cmd-row">
          <span class="label">Command</span>
          <strong class="badge badge-info">{{ data.payload.commandType }}</strong>
        </div>
        <div class="cmd-row">
          <span class="label">Target</span>
          <strong>{{ data.payload.targetInstrument }}</strong>
        </div>
        @if (data.payload.targetMode) {
          <div class="cmd-row"><span class="label">Mode</span><strong>{{ data.payload.targetMode }}</strong></div>
        }
        @if (data.payload.pointingAngle !== null && data.payload.pointingAngle !== undefined) {
          <div class="cmd-row"><span class="label">Angle</span><strong>{{ data.payload.pointingAngle }}°</strong></div>
        }
        @if (data.payload.operatorNote) {
          <div class="cmd-row"><span class="label">Note</span><em class="text-muted">{{ data.payload.operatorNote }}</em></div>
        }
        <div class="cmd-row">
          <span class="label">Risk</span>
          <span class="badge" [ngClass]="riskClass">{{ data.cmd?.riskLevel || 'LOW' }}</span>
        </div>
      </div>

      @if (data.cmd?.riskLevel === 'HIGH') {
        <div class="warning-box">
          <mat-icon>warning</mat-icon>
          <span>This is a HIGH RISK command. Verify with Mission Operations before proceeding.</span>
        </div>
      }

      <p class="confirm-text">
        Are you sure you want to send this telecommand to the payload?
        This action will be logged and is not reversible.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">
        <mat-icon>cancel</mat-icon> Cancel
      </button>
      <button mat-raised-button [color]="data.cmd?.riskLevel === 'HIGH' ? 'warn' : 'primary'"
        (click)="dialogRef.close(true)">
        <mat-icon>send</mat-icon> Confirm & Send
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 24px 0;
      h2 { margin: 0; font-size: 1.1rem; }
      mat-icon { font-size: 24px; }
      &.badge-crit { color: var(--status-crit); }
      &.badge-warn { color: var(--status-warn); }
      &.badge-ok   { color: var(--status-ok); }
    }
    .cmd-summary { margin-bottom: 12px; }
    .cmd-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem;
      .label { color: var(--text-muted); }
      &:last-child { border-bottom: none; }
    }
    .warning-box {
      display: flex; gap: 8px; align-items: flex-start;
      background: #3a1a1a; border: 1px solid var(--status-crit);
      border-radius: 6px; padding: 10px; color: var(--status-crit); font-size: 0.85rem;
      mat-icon { flex-shrink: 0; }
    }
    .confirm-text { font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; }
  `],
})
export class CommandConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CommandConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { payload: any; cmd: any },
  ) {}

  get riskClass(): string {
    const r = this.data.cmd?.riskLevel;
    if (r === "HIGH") return "badge-crit";
    if (r === "MEDIUM") return "badge-warn";
    return "badge-ok";
  }

  get riskIcon(): string {
    return this.data.cmd?.riskLevel === "HIGH" ? "warning" : "info";
  }
}
