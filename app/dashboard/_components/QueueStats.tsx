"use client";

import { ConnectionStatus } from "@/components/notifications";
import {
  useNotificationContext,
  useNotificationList,
} from "@/contexts/NotificationContext";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard, StatRow } from "./DashboardCard";

export function QueueStats() {
  const { connectionStatus } = useNotificationContext();
  const { notifications, unreadCount, pagination } = useNotificationList();

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
