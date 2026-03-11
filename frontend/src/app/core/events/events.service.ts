import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

export interface AppEvent {
  id: string;
  type: "COMMAND" | "ALERT" | "INFO" | "ERROR" | "WARNING" | "SYSTEM";
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO" | "DEBUG";
  title: string;
  message: string;
  source: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

@Injectable({ providedIn: "root" })
export class EventsService {
  private http = inject(HttpClient);

  getAll(limit = 100, type?: string, unreadOnly = false) {
    const params: any = { limit };
    if (type) params["type"] = type;
    if (unreadOnly) params["unread"] = true;
    return this.http.get<AppEvent[]>(`${environment.apiUrl}/events`, { params });
  }

  getUnreadCount() {
    return this.http.get<{ count: number }>(`${environment.apiUrl}/events/unread-count`);
  }

  markAsRead(id: string) {
    return this.http.patch(`${environment.apiUrl}/events/${id}/read`, {});
  }

  markAllAsRead() {
    return this.http.patch(`${environment.apiUrl}/events/read-all`, {});
  }
}
