"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Monitor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./DashboardCard";
import type { AdminStats } from "./types";

export function ConnectionMonitor() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <DashboardCard
      title="Live Connections"
      icon={Monitor}
      action={
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={fetchStats}
          disabled={isLoading}
        >
          <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
        </Button>
      }
    >
      {stats ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Active SSE clients
            </span>
            <span className="text-lg font-bold text-foreground">
              {stats.sse.connectionCount}
            </span>
          </div>
          {stats.sse.connections.length > 0 ? (
            <div className="space-y-1">
              {stats.sse.connections.map((conn) => (
                <div
                  key={conn.userId}
                  className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium font-mono">
                      {conn.userId}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(conn.connectedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No active connections
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </DashboardCard>
  );
}
