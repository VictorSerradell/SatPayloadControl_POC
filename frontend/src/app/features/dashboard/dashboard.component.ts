import {
  Component, inject, OnInit, ChangeDetectionStrategy, signal,
} from "@angular/core";
import { DecimalPipe, UpperCasePipe, NgClass, DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { NgChartsModule } from "ng2-charts";
import { Chart, registerables } from "chart.js";
import { TelemetryService } from "../../core/telemetry/telemetry.service";
import { TelemetryData, StatusLevel } from "../../core/telemetry/telemetry.models";

Chart.register(...registerables);

@Component({
  selector: "app-dashboard",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe, UpperCasePipe, NgClass, RouterLink, DatePipe,
    MatCardModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatDividerModule, NgChartsModule,
  ],
  template: `
    <div class="page-header">
      <h1><mat-icon>dashboard</mat-icon> Payload Dashboard</h1>
      <div class="header-actions">
        <div class="timestamp text-mono text-muted text-sm">
          Last update: {{ telemetry.latest()?.timestamp | date:'HH:mm:ss' }}
        </div>
        <a mat-stroked-button routerLink="/commands" color="accent">
          <mat-icon>send</mat-icon> Send Command
        </a>
      </div>
    </div>

    @if (telemetry.latest(); as data) {

      <!-- ── Status row ───────────────────────────────────────────────── -->
      <div class="kpi-grid">
        <app-kpi-card
          label="Temperature"
          [value]="data.temperature | number:'1.1-1'"
          unit="°C"
          icon="thermostat"
          [status]="telemetry.tempStatus()" />
        <app-kpi-card
          label="Bus Voltage"
          [value]="data.voltage | number:'1.2-2'"
          unit="V"
          icon="bolt"
          [status]="telemetry.voltageStatus()" />
        <app-kpi-card
          label="Power"
          [value]="data.power | number:'1.1-1'"
          unit="W"
          icon="power"
          [status]="telemetry.powerStatus()" />
        <app-kpi-card
          label="Battery"
          [value]="data.batteryLevel | number:'1.0-0'"
          unit="%"
          icon="battery_charging_full"
          [status]="telemetry.batteryStatus()" />
        <app-kpi-card
          label="Signal"
          [value]="data.signalStrength | number:'1.0-0'"
          unit="dBm"
          icon="signal_cellular_alt"
          [status]="'nominal'" />
        <app-kpi-card
          label="Data Rate"
          [value]="data.dataRate | number:'1.0-0'"
          unit="kbps"
          icon="speed"
          [status]="'nominal'" />
      </div>

      <!-- ── Instrument status + charts ──────────────────────────────── -->
      <div class="charts-grid">
        <!-- Instrument mode panel -->
        <mat-card class="mode-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>memory</mat-icon>
            <mat-card-title>Instrument Mode</mat-card-title>
            <mat-card-subtitle>Payload Controller</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="mode-display" [ngClass]="modeClass(data.instrumentMode)">
              <mat-icon class="mode-icon">{{ modeIcon(data.instrumentMode) }}</mat-icon>
              <span class="mode-text">{{ data.instrumentMode }}</span>
            </div>
            <div class="sensor-row">
              <mat-icon>explore</mat-icon>
              <span>Sensor Pointing: </span>
              <strong class="text-mono">{{ data.sensorPointing | number:'1.1-1' }}°</strong>
            </div>
            <div class="sensor-row">
              <mat-icon>network_check</mat-icon>
              <span>Current: </span>
              <strong class="text-mono">{{ data.current | number:'1.0-0' }} mA</strong>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Temperature chart -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>thermostat</mat-icon>
            <mat-card-title>Temperature History</mat-card-title>
            <mat-card-subtitle>Last 60 readings (~2 min)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-wrap">
              <canvas baseChart
                [data]="tempChartData()"
                [options]="lineOptions('°C', 50, 70)"
                type="line">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Power chart -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>power</mat-icon>
            <mat-card-title>Power Consumption</mat-card-title>
            <mat-card-subtitle>Last 60 readings</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-wrap">
              <canvas baseChart
                [data]="powerChartData()"
                [options]="lineOptions('W', 45, 55)"
                type="line">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Battery chart -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>battery_charging_full</mat-icon>
            <mat-card-title>Battery Level</mat-card-title>
            <mat-card-subtitle>Last 60 readings</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-wrap">
              <canvas baseChart
                [data]="batteryChartData()"
                [options]="lineOptions('%', 20, 10)"
                type="line">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    } @else {
      <div class="no-data">
        <mat-icon>satellite_alt</mat-icon>
        <h2>Connecting to telemetry stream...</h2>
        <p class="text-muted">Waiting for payload data from simulator</p>
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.4rem; font-weight: 600; }
      .header-actions { display: flex; align-items: center; gap: 12px; }
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px; margin-bottom: 20px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: 280px 1fr 1fr;
      grid-template-rows: auto auto;
      gap: 16px;
    }

    .mode-card {
      grid-row: span 2;
      .mode-display {
        display: flex; flex-direction: column; align-items: center;
        padding: 24px 0; gap: 8px;
        border-radius: 8px; margin: 8px 0;
        .mode-icon { font-size: 48px; }
        .mode-text { font-size: 1.4rem; font-weight: 700; letter-spacing: 2px; }
        &.mode-on   { background: #0d2a0d; color: var(--status-ok); }
        &.mode-off  { background: #1e2228; color: var(--status-off); }
        &.mode-warn { background: #2a1f00; color: var(--status-warn); }
        &.mode-crit { background: #2a0a0a; color: var(--status-crit); }
      }
      .sensor-row {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 0; border-top: 1px solid var(--border); font-size: 0.85rem;
        mat-icon { font-size: 18px; color: var(--text-muted); }
      }
    }

    .chart-card { display: flex; flex-direction: column; }
    .chart-wrap { height: 160px; position: relative; }

    .no-data {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 400px; gap: 12px; color: var(--text-muted);
      mat-icon { font-size: 64px; opacity: 0.3; }
      h2 { margin: 0; }
    }
  `],
})
export class DashboardComponent {
  telemetry = inject(TelemetryService);

  // ── Chart data from telemetry history signals ─────────────────────────────
  private getLabels(n = 60) {
    return this.telemetry.history().slice(-n).map(d =>
      new Date(d.timestamp).toLocaleTimeString("en", { hour12: false })
    );
  }

  tempChartData = () => this.buildChart(
    this.telemetry.history().slice(-60).map(d => d.temperature),
    this.getLabels(60), "#58a6ff", "Temperature"
  );

  powerChartData = () => this.buildChart(
    this.telemetry.history().slice(-60).map(d => d.power),
    this.getLabels(60), "#d29922", "Power"
  );

  batteryChartData = () => this.buildChart(
    this.telemetry.history().slice(-60).map(d => d.batteryLevel),
    this.getLabels(60), "#3fb950", "Battery"
  );

  private buildChart(data: number[], labels: string[], color: string, label: string) {
    return {
      labels,
      datasets: [{
        label, data, borderColor: color, backgroundColor: color + "22",
        borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true,
      }],
    };
  }

  lineOptions(unit: string, warnThreshold: number, critThreshold: number): any {
    return {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.parsed.y.toFixed(2)} ${unit}`,
          },
        },
        annotation: {
          annotations: {
            warn: { type: "line", yMin: warnThreshold, yMax: warnThreshold,
              borderColor: "#d29922", borderWidth: 1, borderDash: [4, 4] },
            crit: { type: "line", yMin: critThreshold, yMax: critThreshold,
              borderColor: "#f85149", borderWidth: 1, borderDash: [4, 4] },
          },
        },
      },
      scales: {
        x: { display: false },
        y: { grid: { color: "#30363d" }, ticks: { color: "#8b949e", font: { size: 10 } } },
      },
    };
  }

  modeClass(mode: string): string {
    if (mode === "ON") return "mode-on";
    if (mode === "OFF") return "mode-off";
    if (mode === "ERROR" || mode === "CALIBRATING") return "mode-crit";
    return "mode-warn";
  }

  modeIcon(mode: string): string {
    if (mode === "ON") return "check_circle";
    if (mode === "OFF") return "power_off";
    if (mode === "ERROR") return "error";
    if (mode === "CALIBRATING") return "tune";
    return "pause_circle";
  }
}

// ── Inline KPI Card subcomponent ─────────────────────────────────────────────
import { Component as Comp, Input } from "@angular/core";
import { MatCardModule as MCM } from "@angular/material/card";
import { MatIconModule as MIM } from "@angular/material/icon";

@Comp({
  selector: "app-kpi-card",
  standalone: true,
  imports: [MCM, MIM, NgClass],
  template: `
    <mat-card class="kpi-card" [ngClass]="statusClass">
      <div class="kpi-icon"><mat-icon>{{ icon }}</mat-icon></div>
      <div class="kpi-body">
        <div class="kpi-label">{{ label }}</div>
        <div class="kpi-value text-mono">{{ value }} <span class="kpi-unit">{{ unit }}</span></div>
      </div>
    </mat-card>
  `,
  styles: [`
    .kpi-card {
      padding: 12px !important; display: flex; align-items: center; gap: 10px;
      transition: border-color 0.3s;
    }
    .kpi-icon mat-icon { font-size: 24px; color: var(--text-muted); }
    .kpi-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 1.3rem; font-weight: 700; line-height: 1.2; }
    .kpi-unit  { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; }

    .status-warning { border-color: var(--status-warn) !important; }
    .status-warning .kpi-icon mat-icon { color: var(--status-warn); }
    .status-warning .kpi-value { color: var(--status-warn); }

    .status-critical { border-color: var(--status-crit) !important; }
    .status-critical .kpi-icon mat-icon { color: var(--status-crit); }
    .status-critical .kpi-value { color: var(--status-crit); }

    .status-nominal { border-color: var(--status-ok) !important; }
    .status-nominal .kpi-icon mat-icon { color: var(--status-ok); }
  `],
})
export class KpiCardComponent {
  @Input() label = "";
  @Input() value: string | number = "";
  @Input() unit = "";
  @Input() icon = "info";
  @Input() status: StatusLevel = "nominal";
  get statusClass() { return `status-${this.status}`; }
}
