import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

export interface SendCommandPayload {
  commandType: string;
  targetInstrument: string;
  targetMode?: string;
  pointingAngle?: number;
  operatorNote?: string;
}

export interface CommandCatalogItem {
  type: string;
  label: string;
  description: string;
  requiresConfirmation: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  applicableInstruments: string[];
  availableModes?: string[];
}

@Injectable({ providedIn: "root" })
export class CommandsService {
  private http = inject(HttpClient);

  getCatalog() {
    return this.http.get<CommandCatalogItem[]>(`${environment.apiUrl}/commands/catalog`);
  }

  send(payload: SendCommandPayload) {
    return this.http.post<{ commandId: string; status: string; message: string }>(
      `${environment.apiUrl}/commands/send`, payload
    );
  }

  getHistory(limit = 50) {
    return this.http.get<any[]>(`${environment.apiUrl}/commands/history`, { params: { limit } });
  }
}
