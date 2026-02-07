"use client";

import { useEffect } from "react";
import {
  NotificationToastContainer,
  pushToast,
} from "@/components/notifications";
import {
  useNotificationContext,
  useNotificationList,
} from "@/contexts/NotificationContext";
import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/notifications";

import { DashboardHeader } from "./_components/DashboardHeader";
import { AdminSendPanel } from "./_components/AdminSendPanel";
import { ConnectionMonitor } from "./_components/ConnectionMonitor";
import { QueueStats } from "./_components/QueueStats";
import { CacheViewer } from "./_components/CacheViewer";
import { PreferencesPanel } from "./_components/PreferencesPanel";

export default function DashboardClient() {
  const { connectionStatus } = useNotificationContext();
  const notificationsHook = useNotificationList();

  // Show toast for real-time notifications
  useEffect(() => {
    if (notificationsHook.notifications.length > 0) {
      const latest = notificationsHook.notifications[0];
      if (latest && !latest.readAt) {
        const age = Date.now() - new Date(latest.createdAt).getTime();
        if (age < 5000) {
          pushToast(latest as Notification);
        }
      }
    }
  }, [notificationsHook.notifications]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Status bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Monitor and manage your notification service
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Wifi
              className={cn(
                "size-4",
                connectionStatus === "connected"
                  ? "text-green-500"
                  : "text-muted-foreground",
              )}
            />
            <span className="text-xs text-muted-foreground">
              {connectionStatus === "connected" ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AdminSendPanel />
          <ConnectionMonitor />
          <QueueStats />
          <CacheViewer />
          <div className="lg:col-span-2">
            <PreferencesPanel />
          </div>
        </div>
      </main>

      <NotificationToastContainer />
    </div>
  );
}
