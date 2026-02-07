"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard, MiniStat } from "./DashboardCard";
import type { AdminStats } from "./types";

export function CacheViewer() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [cacheValue, setCacheValue] = useState<unknown>(null);
  const [isLoadingValue, setIsLoadingValue] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchKeyValue = useCallback(async (key: string) => {
    setSelectedKey(key);
    setIsLoadingValue(true);
    try {
      const res = await fetch(
        `/api/admin/cache?key=${encodeURIComponent(key)}`,
      );
      if (res.ok) setCacheValue(await res.json());
    } catch {
      setCacheValue(null);
    } finally {
      setIsLoadingValue(false);
    }
  }, []);

  return (
    <DashboardCard
      title="Redis Cache"
      icon={Database}
      action={
        <Button variant="ghost" size="icon-xs" onClick={fetchStats}>
          <RefreshCw className="size-3" />
        </Button>
      }
    >
      {stats ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Status" value={stats.redis.status} />
            <MiniStat label="Memory" value={stats.redis.usedMemory ?? "-"} />
            <MiniStat label="Keys" value={String(stats.redis.keyCount)} />
          </div>

          {stats.redis.cachedPreferencesKeys.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Cached Keys
              </p>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {stats.redis.cachedPreferencesKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => fetchKeyValue(key)}
                    className={cn(
                      "w-full text-left rounded-md px-2 py-1 text-xs font-mono transition-colors",
                      selectedKey === key
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedKey && (
            <div className="rounded-md border border-border bg-muted/50 p-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                {selectedKey}
              </p>
              {isLoadingValue ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <pre className="text-[11px] text-foreground overflow-auto max-h-40 whitespace-pre-wrap break-all">
                  {JSON.stringify(cacheValue, null, 2)}
                </pre>
              )}
            </div>
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
