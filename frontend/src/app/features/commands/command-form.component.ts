import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from "@angular/core";
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDialogModule, MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatDividerModule } from "@angular/material/divider";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { DatePipe, NgClass } from "@angular/common";
import { CommandsService, CommandCatalogItem } from "../../core/commands/commands.service";
import { CommandConfirmDialogComponent } from "./command-confirm-dialog.component";
import { BehaviorSubject } from "rxjs";
import { ActivatedRoute } from "@angular/router";
@Component({
  selector: "app-command-form",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    NgClass,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <h1><mat-icon>send</mat-icon> Telecommand Console</h1>
      <span class="badge badge-warn">OPERATOR ONLY</span>
    </div>

    <div class="cmd-layout">
      <!-- ── Command form ────────────────────────────────────────────── -->
      <mat-card class="cmd-form-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>rocket_launch</mat-icon>
          <mat-card-title>Send Telecommand</mat-card-title>
          <mat-card-subtitle
            >Select and configure a command, then confirm before
            sending</mat-card-subtitle
          >
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="cmd-form">
            <!-- Command type -->
            <mat-form-field>
              <mat-label>Command Type</mat-label>
              <mat-select
                formControlName="commandType"
                (selectionChange)="onCommandSelect($event.value)"
              >
                @for (cmd of catalog; track cmd.type) {
                  <mat-option [value]="cmd.type">
                    <div class="cmd-option">
                      <span>{{ cmd.label }}</span>
                      <span
                        class="badge"
                        [ngClass]="riskBadge(cmd.riskLevel)"
                        >{{ cmd.riskLevel }}</span
                      >
                    </div>
                  </mat-option>
                }
              </mat-select>
              <mat-icon matPrefix>list</mat-icon>
            </mat-form-field>

            <!-- Target instrument -->
            <mat-form-field>
              <mat-label>Target Instrument</mat-label>
              <mat-select formControlName="targetInstrument">
                @for (inst of availableInstruments(); track inst) {
                  <mat-option [value]="inst">
                    <mat-icon>memory</mat-icon> {{ inst }}
                  </mat-option>
                }
              </mat-select>
              <mat-icon matPrefix>memory</mat-icon>
            </mat-form-field>

            <!-- Target mode (conditional) -->
            @if (selectedCommand()?.availableModes?.length) {
              <mat-form-field>
                <mat-label>Target Mode</mat-label>
                <mat-select formControlName="targetMode">
                  @for (mode of selectedCommand()?.availableModes; track mode) {
                    <mat-option [value]="mode">{{ mode }}</mat-option>
                  }
                </mat-select>
                <mat-icon matPrefix>tune</mat-icon>
              </mat-form-field>
            }

            <!-- Pointing angle (conditional) -->
            @if (selectedCommand()?.type === "POINT_SENSOR") {
              <mat-form-field>
                <mat-label>Pointing Angle (0–360°)</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="pointingAngle"
                  min="0"
                  max="360"
                  placeholder="0.0"
                />
                <mat-icon matPrefix>explore</mat-icon>
                <mat-hint>Azimuth angle in degrees</mat-hint>
              </mat-form-field>
            }

            <!-- Operator note -->
            <mat-form-field>
              <mat-label>Operator Note (optional)</mat-label>
              <textarea
                matInput
                formControlName="operatorNote"
                rows="2"
                placeholder="Reason for command, shift number, etc."
                maxlength="256"
              ></textarea>
              <mat-icon matPrefix>notes</mat-icon>
              <mat-hint align="end"
                >{{
                  form.get("operatorNote")?.value?.length || 0
                }}/256</mat-hint
              >
            </mat-form-field>

            <!-- Risk warning -->
            @if (selectedCommand()?.riskLevel === "HIGH") {
              <div class="risk-banner crit">
                <mat-icon>warning</mat-icon>
                <div>
                  <strong>HIGH RISK command.</strong>
                  This command may significantly affect payload operations.
                  Double-check with the mission operations team before sending.
                </div>
              </div>
            }
            @if (selectedCommand()?.riskLevel === "MEDIUM") {
              <div class="risk-banner warn">
                <mat-icon>info</mat-icon>
                This command requires confirmation before execution.
              </div>
            }

            <button
              mat-raised-button
              color="primary"
              [disabled]="form.invalid || sending()"
              (click)="openConfirm()"
              class="send-btn"
            >
              @if (sending()) {
                <mat-spinner diameter="20" />
              } @else {
                <mat-icon>send</mat-icon>
              }
              {{
                selectedCommand()?.requiresConfirmation
                  ? "Review & Send"
                  : "Send Command"
              }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- ── Recent history ──────────────────────────────────────────── -->
      <mat-card class="cmd-history-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>history</mat-icon>
          <mat-card-title>Recent Commands</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (history().length > 0) {
            <div class="history-list">
              @for (cmd of history(); track cmd.id) {
                <div class="history-item">
                  <div class="history-main">
                    <span class="badge" [ngClass]="statusBadge(cmd.status)">{{
                      cmd.status
                    }}</span>
                    <span class="cmd-type">{{ cmd.commandType }}</span>
                    <span class="text-muted text-sm"
                      >→ {{ cmd.targetInstrument }}</span
                    >
                  </div>
                  <div class="history-meta text-muted text-xs text-mono">
                    {{ cmd.sentAt | date: "HH:mm:ss" }}
                    @if (cmd.sentBy?.email) {
                      · {{ cmd.sentBy.email }}
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="no-history text-muted">No commands sent yet</div>
          }
          <button mat-button (click)="loadHistory()" class="full-width">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        h1 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 1.4rem;
        }
      }
      .cmd-layout {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 16px;
        align-items: start;
      }
      .cmd-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cmd-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .risk-banner {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 6px;
        font-size: 0.85rem;
        &.crit {
          background: #3a1a1a;
          border: 1px solid var(--status-crit);
          color: var(--status-crit);
        }
        &.warn {
          background: #3a2a0a;
          border: 1px solid var(--status-warn);
          color: var(--status-warn);
        }
        mat-icon {
          margin-top: 2px;
          flex-shrink: 0;
        }
      }
      .send-btn {
        height: 44px;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
      }
      .history-list {
        max-height: 480px;
        overflow-y: auto;
      }
      .history-item {
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
        &:last-child {
          border-bottom: none;
        }
      }
      .history-main {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .cmd-type {
        font-weight: 500;
        font-size: 0.85rem;
      }
      .history-meta {
        margin-top: 4px;
      }
      .no-history {
        text-align: center;
        padding: 24px;
      }
    `,
  ],
})
export class CommandFormComponent implements OnInit {
  _ = console.log("🚀 CommandFormComponent INSTANTIATED");
  private cmdsService = inject(CommandsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  catalog: CommandCatalogItem[] = [];
  history = signal<any[]>([]);
  sending = signal(false);

  selectedCommand = signal<CommandCatalogItem | null>(null);
  availableInstruments = signal<string[]>([]);

  form: FormGroup = this.fb.group({
    commandType: ["", Validators.required],
    targetInstrument: ["", Validators.required],
    targetMode: [""],
    pointingAngle: [null, [Validators.min(0), Validators.max(360)]],
    operatorNote: ["", Validators.maxLength(256)],
  });

  ngOnInit() {
    const catalog = this.route.snapshot.data["catalog"] as CommandCatalogItem[];
    this.catalog = [...catalog];
    // Forzar que Angular re-evalúe el template DESPUÉS de que mat-select esté listo
    Promise.resolve().then(() => this.cdr.detectChanges());
    this.loadHistory();
  }

  loadHistory() {
    this.cmdsService.getHistory(20).subscribe((h) => this.history.set(h));
  }

  onCommandSelect(type: string) {
    const cmd = this.catalog.find((c) => c.type === type) ?? null;
    this.selectedCommand.set(cmd);
    this.availableInstruments.set(cmd?.applicableInstruments ?? []);
    this.form.patchValue({
      targetInstrument: "",
      targetMode: "",
      pointingAngle: null,
    });
    if (cmd?.type === "CHANGE_MODE") {
      this.form.get("targetMode")?.setValidators(Validators.required);
    } else {
      this.form.get("targetMode")?.clearValidators();
    }
    this.form.get("targetMode")?.updateValueAndValidity();
  }

  openConfirm() {
    if (this.form.invalid) return;
    const raw = this.form.value;
    const payload: any = Object.fromEntries(
      Object.entries(raw).filter(
        ([, v]) => v !== null && v !== "" && v !== undefined,
      ),
    );
    const cmd = this.selectedCommand();

    const ref = this.dialog.open(CommandConfirmDialogComponent, {
      data: { payload, cmd },
      width: "480px",
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.sending.set(true);
      this.cmdsService.send(payload).subscribe({
        next: (res) => {
          this.snack.open(`✓ ${res.message}`, "OK", {
            panelClass: "snack-success",
          });
          this.form.reset();
          this.selectedCommand.set(null);
          this.sending.set(false);
          setTimeout(() => this.loadHistory(), 1000);
        },
        error: (err) => {
          const msg = err.error?.message ?? "Command failed";
          this.snack.open(`✗ ${msg}`, "Close", { panelClass: "snack-error" });
          this.sending.set(false);
        },
      });
    });
  }
  trackByType(_: number, cmd: CommandCatalogItem): string {
    return cmd.type;
  }

  riskBadge(risk: string): string {
    if (risk === "HIGH") return "badge-crit";
    if (risk === "MEDIUM") return "badge-warn";
    return "badge-ok";
  }

  statusBadge(status: string): string {
    if (status === "EXECUTED") return "badge-ok";
    if (status === "FAILED" || status === "TIMEOUT") return "badge-crit";
    if (status === "SENT" || status === "PENDING") return "badge-info";
    return "badge-ok";
  }
}
console.log("🚀 command-form.component.ts LOADED");