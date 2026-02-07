"use client";

import {
  NotificationToastContainer,
  NotificationSetup,
} from "@/components/notifications";
import { useNotificationStore } from "@/stores/notification";
import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

import { DashboardHeader } from "./_components/DashboardHeader";
import { AdminSendPanel } from "./_components/AdminSendPanel";
import { ConnectionMonitor } from "./_components/ConnectionMonitor";
import { QueueStats } from "./_components/QueueStats";
import { CacheViewer } from "./_components/CacheViewer";
import { PreferencesPanel } from "./_components/PreferencesPanel";

const DEMO_USER_ID = "demo-user-001";

export default function DashboardClient() {
  const connectionStatus = useNotificationStore((s) => s.connectionStatus);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NotificationSetup userId={DEMO_USER_ID} />
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
