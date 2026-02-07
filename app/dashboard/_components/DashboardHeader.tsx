"use client";

import { useState } from "react";
import {
  NotificationBell,
  NotificationPanel,
  ConnectionStatus,
} from "@/components/notifications";
import { useNotificationStore } from "@/stores/notification";
import { Bell } from "lucide-react";

const DEMO_USER_ID = "demo-user-001";

export function DashboardHeader() {
  const connectionStatus = useNotificationStore((s) => s.connectionStatus);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const pagination = useNotificationStore((s) => s.pagination);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const loadMore = useNotificationStore((s) => s.loadMore);

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Bell className="size-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">
            Notification Service
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionStatus status={connectionStatus} />
          <div className="relative">
            <NotificationBell
              count={unreadCount}
              onClick={() => setIsPanelOpen(!isPanelOpen)}
            />
            <NotificationPanel
              notifications={notifications}
              unreadCount={unreadCount}
              isLoading={isLoading}
              hasMore={pagination.hasMore}
              connectionStatus={connectionStatus}
              isOpen={isPanelOpen}
              onClose={() => setIsPanelOpen(false)}
              onMarkAsRead={(id) => markAsRead(DEMO_USER_ID, id)}
              onDelete={(id) => deleteNotification(DEMO_USER_ID, id)}
              onLoadMore={() => loadMore(DEMO_USER_ID)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
