"use client";

import { ConnectionStatus } from "@/components/notifications";
import { useNotificationStore } from "@/stores/notification";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard, StatRow } from "./DashboardCard";

export function QueueStats() {
  const connectionStatus = useNotificationStore((s) => s.connectionStatus);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const pagination = useNotificationStore((s) => s.pagination);

  return (
    <DashboardCard title="Queue Statistics" icon={BarChart3}>
      <div className="space-y-2">
        <StatRow
          label="SSE Status"
          value={<ConnectionStatus status={connectionStatus} />}
        />
        <StatRow
          label="Notifications loaded"
          value={
            <span className="text-sm font-semibold">
              {notifications.length}
            </span>
          }
        />
        <StatRow
          label="Total in history"
          value={
            <span className="text-sm font-semibold">{pagination.total}</span>
          }
        />
        <StatRow
          label="Unread"
          value={
            <span
              className={cn(
                "text-sm font-semibold",
                unreadCount > 0 && "text-destructive",
              )}
            >
              {unreadCount}
            </span>
          }
        />
      </div>
    </DashboardCard>
  );
}
