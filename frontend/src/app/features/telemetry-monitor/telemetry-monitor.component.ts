import {
  Component, inject, signal, computed,
  OnInit, ChangeDetectionStrategy, ViewChild,
} from "@angular/core";
import { DecimalPipe, DatePipe, NgClass } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatSortModule, MatSort } from "@angular/material/sort";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatSelectModule } from "@angular/material/select";
import { TelemetryService } from "../../core/telemetry/telemetry.service";
import { TelemetryData, StatusLevel, getStatusLevel } from "../../core/telemetry/telemetry.models";

interface TmRow {
  parameter: string; label: string; value: string;
  unit: string; status: StatusLevel; rawValue: number;
  timestamp: string;
}

const PARAMS = [
  { key: "temperature",   label: "Temperature",    unit: "°C",   warnHigh: 50, critHigh: 70 },
  { key: "voltage",       label: "Bus Voltage",     unit: "V",    warnLow: 27.5, critLow: 27.0 },
  { key: "current",       label: "Current",         unit: "mA",   warnHigh: 1700, critHigh: 1900 },
  { key: "power",         label: "Power",           unit: "W",    warnHigh: 45, critHigh: 55 },
  { key: "batteryLevel",  label: "Battery Level",   unit: "%",    warnLow: 20, critLow: 10 },
  { key: "signalStrength",label: "Signal Strength", unit: "dBm" },
  { key: "dataRate",      label: "Data Rate",       unit: "kbps" },
  { key: "sensorPointing",label: "Sensor Pointing", unit: "°" },
];

@Component({
  selector: "app-telemetry-monitor",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe, DatePipe, NgClass, FormsModule,
    MatCardModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatSelectModule,
  ],
  template: `
    <div class="page-header">
      <h1><mat-icon>monitor_heart</mat-icon> Telemetry Monitor</h1>
      <div class="text-muted text-sm">{{ totalPoints() }} readings in buffer</div>
    </div>

    <mat-card>
      <mat-card-content>
        <!-- Toolbar -->
        <div class="toolbar">
          <mat-form-field class="search-field">
            <mat-label>Search parameter</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilter()"
              placeholder="e.g. temperature, voltage...">
            <mat-icon matPrefix>search</mat-icon>
            @if (searchTerm) {
              <button mat-icon-button matSuffix (click)="searchTerm = ''; applyFilter()">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>

          <mat-form-field class="status-filter">
            <mat-label>Status filter</mat-label>
            <mat-select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
              <mat-option value="">All</mat-option>
              <mat-option value="nominal">Nominal</mat-option>
              <mat-option value="warning">Warning</mat-option>
              <mat-option value="critical">Critical</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Table -->
        <table mat-table [dataSource]="dataSource" matSort class="tm-table full-width">

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-dot" [ngClass]="'dot-' + row.status"></span>
            </td>
          </ng-container>

          <ng-container matColumnDef="label">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Parameter</th>
            <td mat-cell *matCellDef="let row">
              <span class="param-label">{{ row.label }}</span>
              <span class="param-key text-muted text-xs text-mono"> {{ row.parameter }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="value">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Value</th>
            <td mat-cell *matCellDef="let row">
              <span class="value-cell text-mono" [ngClass]="'status-' + row.status">
                {{ row.value }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="unit">
            <th mat-header-cell *matHeaderCellDef>Unit</th>
            <td mat-cell *matCellDef="let row" class="text-muted text-sm">{{ row.unit }}</td>
          </ng-container>

          <ng-container matColumnDef="statusBadge">
            <th mat-header-cell *matHeaderCellDef>Level</th>
            <td mat-cell *matCellDef="let row">
              <span class="badge" [ngClass]="'badge-' + badgeClass(row.status)">
                {{ row.status | uppercase }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="timestamp">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Updated</th>
            <td mat-cell *matCellDef="let row" class="text-muted text-sm text-mono">
              {{ row.timestamp | date:'HH:mm:ss.SSS' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" colspan="6">No parameters match the filter</td>
          </tr>
        </table>

        <mat-paginator [pageSizeOptions]="[8, 16, 32]" pageSize="16" showFirstLastButtons />
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.4rem; }
    }
    .toolbar { display: flex; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 200px; }
    .status-filter { width: 160px; }
    .tm-table { width: 100%; }
    .param-label { font-weight: 500; }
    .param-key { margin-left: 4px; }
    .value-cell { font-size: 1rem; font-weight: 600; }
    .status-dot {
      display: inline-block; width: 10px; height: 10px; border-radius: 50%;
      &.dot-nominal  { background: var(--status-ok); box-shadow: 0 0 6px var(--status-ok); }
      &.dot-warning  { background: var(--status-warn); box-shadow: 0 0 6px var(--status-warn); }
      &.dot-critical { background: var(--status-crit); box-shadow: 0 0 6px var(--status-crit); animation: pulse 1s infinite; }
      &.dot-off      { background: var(--status-off); }
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .no-data { text-align: center; padding: 32px; color: var(--text-muted); }
  `],
})
export class TelemetryMonitorComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private telemetry = inject(TelemetryService);

  displayedColumns = ["status", "label", "value", "unit", "statusBadge", "timestamp"];
  dataSource = new MatTableDataSource<TmRow>([]);
  searchTerm = "";
  statusFilter = "";

  readonly totalPoints = computed(() => this.telemetry.history().length);

  ngOnInit() {
    // Refresh table whenever latest telemetry changes
    setInterval(() => this.refreshTable(), 2000);
    this.refreshTable();
  }

  private refreshTable() {
    const data = this.telemetry.latest();
    if (!data) return;
    const rows: TmRow[] = PARAMS.map(p => {
      const rawValue = (data as any)[p.key] as number;
      const status = getStatusLevel(rawValue, p as any);
      return {
        parameter: p.key, label: p.label, unit: p.unit,
        value: typeof rawValue === "number" ? rawValue.toFixed(p.unit === "mA" || p.unit === "kbps" ? 0 : 2) : String(rawValue),
        status, rawValue: rawValue ?? 0,
        timestamp: data.timestamp,
      };
    });
    this.dataSource.data = rows;
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.applyFilter();
  }

  applyFilter() {
    this.dataSource.filterPredicate = (row) => {
      const matchSearch = !this.searchTerm ||
        row.label.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        row.parameter.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.statusFilter || row.status === this.statusFilter;
      return matchSearch && matchStatus;
    };
    this.dataSource.filter = `${this.searchTerm}${this.statusFilter}`;
  }

  badgeClass(status: StatusLevel): string {
    if (status === "nominal") return "ok";
    if (status === "warning") return "warn";
    if (status === "critical") return "crit";
    return "off";
  }
}
