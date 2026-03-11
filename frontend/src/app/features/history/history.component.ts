import {
  Component, inject, signal, OnInit, ChangeDetectionStrategy,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePipe } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { NgChartsModule } from "ng2-charts";
import { Chart, registerables } from "chart.js";
import { TelemetryService } from "../../core/telemetry/telemetry.service";

Chart.register(...registerables);

const PARAMS = [
  { key: "temperature",    label: "Temperature (°C)",   color: "#58a6ff" },
  { key: "voltage",        label: "Bus Voltage (V)",     color: "#3fb950" },
  { key: "current",        label: "Current (mA)",        color: "#d29922" },
  { key: "power",          label: "Power (W)",           color: "#e05252" },
  { key: "batteryLevel",   label: "Battery Level (%)",   color: "#39d353" },
  { key: "signalStrength", label: "Signal Strength (dBm)",color: "#79c0ff" },
  { key: "dataRate",       label: "Data Rate (kbps)",    color: "#f0883e" },
  { key: "sensorPointing", label: "Sensor Pointing (°)", color: "#bc8cff" },
];

@Component({
  selector: "app-history",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    FormsModule, DatePipe, NgChartsModule,
    MatCardModule, MatFormFieldModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <div class="page-header">
      <h1><mat-icon>timeline</mat-icon> Telemetry History</h1>
    </div>

    <mat-card class="controls-card">
      <mat-card-content>
        <div class="controls">
          <mat-form-field>
            <mat-label>Parameter</mat-label>
            <mat-select [(ngModel)]="selectedParam">
              @for (p of params; track p.key) {
                <mat-option [value]="p.key">{{ p.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Time range</mat-label>
            <mat-select [(ngModel)]="selectedRange">
              <mat-option value="15m">Last 15 min</mat-option>
              <mat-option value="1h">Last 1 hour</mat-option>
              <mat-option value="6h">Last 6 hours</mat-option>
              <mat-option value="24h">Last 24 hours</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-raised-button color="primary" (click)="loadHistory()" [disabled]="loading()">
            @if (loading()) { <mat-spinner diameter="20" /> }
            @else { <mat-icon>search</mat-icon> }
            Load
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    @if (chartData()) {
      <mat-card class="chart-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>show_chart</mat-icon>
          <mat-card-title>{{ currentParamLabel() }}</mat-card-title>
          <mat-card-subtitle>{{ dataPoints() }} data points from database</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-container">
            <canvas baseChart [data]="chartData()!" [options]="chartOptions" type="line"></canvas>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-label">Min</div>
          <div class="stat-value text-mono">{{ stats().min | number:"1.2-2" }}</div>
        </mat-card>
        <mat-card class="stat-card">
          <div class="stat-label">Max</div>
          <div class="stat-value text-mono">{{ stats().max | number:"1.2-2" }}</div>
        </mat-card>
        <mat-card class="stat-card">
          <div class="stat-label">Average</div>
          <div class="stat-value text-mono">{{ stats().avg | number:"1.2-2" }}</div>
        </mat-card>
        <mat-card class="stat-card">
          <div class="stat-label">Std Dev</div>
          <div class="stat-value text-mono">{{ stats().std | number:"1.2-2" }}</div>
        </mat-card>
      </div>
    } @else if (!loading()) {
      <div class="empty-state text-muted">
        <mat-icon>area_chart</mat-icon>
        <p>Select a parameter and time range, then click Load</p>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; margin-bottom: 20px; h1 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.4rem; } }
    .controls-card { margin-bottom: 16px; }
    .controls { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; mat-form-field { width: 200px; } button { margin-top: 4px; height: 44px; } }
    .chart-card { margin-bottom: 16px; }
    .chart-container { height: 360px; position: relative; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat-card { padding: 16px !important; text-align: center; .stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; } .stat-value { font-size: 1.4rem; font-weight: 700; margin-top: 4px; } }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; mat-icon { font-size: 60px; opacity: 0.2; } }
  `],
})
export class HistoryComponent implements OnInit {
  private telemetryService = inject(TelemetryService);

  params = PARAMS;
  selectedParam = "temperature";
  selectedRange = "1h";
  loading = signal(false);
  chartData = signal<any>(null);
  dataPoints = signal(0);
  stats = signal({ min: 0, max: 0, avg: 0, std: 0 });

  chartOptions: any = {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { type: "time", time: { tooltipFormat: "HH:mm:ss" },
        grid: { color: "#30363d" }, ticks: { color: "#8b949e", maxTicksLimit: 12 } },
      y: { grid: { color: "#30363d" }, ticks: { color: "#8b949e" } },
    },
  };

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.loading.set(true);
    this.chartData.set(null);
    const { from, to } = this.getRange();
    this.telemetryService.loadHistory(from, to, 2000).subscribe({
      next: (data) => {
        const values = data.map((d: any) => (d as any)[this.selectedParam] as number).filter(v => v !== null);
        const labels = data.map((d: any) => new Date(d.timestamp));
        this.dataPoints.set(data.length);
        this.computeStats(values);
        const param = PARAMS.find(p => p.key === this.selectedParam);
        this.chartData.set({
          labels,
          datasets: [{
            data: values, borderColor: param?.color || "#58a6ff",
            backgroundColor: (param?.color || "#58a6ff") + "22",
            borderWidth: 1.5, pointRadius: 0, tension: 0.2, fill: true,
          }],
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  currentParamLabel() {
    return PARAMS.find(p => p.key === this.selectedParam)?.label || this.selectedParam;
  }

  private getRange(): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date(to);
    const map: Record<string, number> = { "15m": 15, "1h": 60, "6h": 360, "24h": 1440 };
    from.setMinutes(from.getMinutes() - (map[this.selectedRange] || 60));
    return { from, to };
  }

  private computeStats(values: number[]) {
    if (!values.length) { this.stats.set({ min: 0, max: 0, avg: 0, std: 0 }); return; }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(v => (v - avg) ** 2).reduce((a, b) => a + b, 0) / values.length);
    this.stats.set({ min, max, avg, std });
  }
}
