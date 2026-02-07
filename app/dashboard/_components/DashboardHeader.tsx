"use client";

import { useState } from "react";
import {
  NotificationBell,
  NotificationPanel,
  ConnectionStatus,
} from "@/components/notifications";
import {
  useNotificationContext,
  useNotificationList,
  useUnreadCount,
} from "@/contexts/NotificationContext";
import { Bell } from "lucide-react";

export function DashboardHeader() {
  const unreadCount = useUnreadCount();
  const { connectionStatus } = useNotificationContext();
  const notificationsHook = useNotificationList();
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
              notifications={notificationsHook.notifications}
              unreadCount={notificationsHook.unreadCount}
              isLoading={notificationsHook.isLoading}
              hasMore={notificationsHook.pagination.hasMore}
              connectionStatus={connectionStatus}
              isOpen={isPanelOpen}
              onClose={() => setIsPanelOpen(false)}
              onMarkAsRead={notificationsHook.markAsRead}
              onDelete={notificationsHook.deleteNotification}
              onLoadMore={notificationsHook.loadMore}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
