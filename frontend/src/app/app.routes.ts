import { Routes } from "@angular/router";
import { authGuard, roleGuard } from "./core/auth/auth.guard";
import { UserRole } from "./core/auth/auth.models";
import { commandsCatalogResolver } from "./features/commands/commands.resolver";

export const routes: Routes = [
  { path: "", redirectTo: "dashboard", pathMatch: "full" },
  {
    path: "auth",
    loadChildren: () =>
      import("./features/auth/auth.routes").then((m) => m.AUTH_ROUTES),
  },
  {
    path: "",
    loadComponent: () =>
      import("./app-shell.component").then((m) => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/dashboard/dashboard.component").then(
            (m) => m.DashboardComponent,
          ),
        title: "Dashboard — SatPayloadControl",
      },
      {
        path: "monitor",
        loadComponent: () =>
          import("./features/telemetry-monitor/telemetry-monitor.component").then(
            (m) => m.TelemetryMonitorComponent,
          ),
        title: "TM Monitor — SatPayloadControl",
      },
      {
        path: "commands",
        loadComponent: () =>
          import("./features/commands/command-form.component").then(
            (m) => m.CommandFormComponent,
          ),
        canActivate: [roleGuard("admin", "operator")],
        resolve: { catalog: commandsCatalogResolver },
        title: "Commands — SatPayloadControl",
      },
      {
        path: "events",
        loadComponent: () =>
          import("./features/event-log/event-log.component").then(
            (m) => m.EventLogComponent,
          ),
        title: "Event Log — SatPayloadControl",
      },
      {
        path: "history",
        loadComponent: () =>
          import("./features/history/history.component").then(
            (m) => m.HistoryComponent,
          ),
        title: "History — SatPayloadControl",
      },
    ],
  },
  { path: "**", redirectTo: "dashboard" },
];
