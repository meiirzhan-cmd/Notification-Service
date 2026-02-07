"use client";

import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import type { SSEStatus } from "@/hooks/useSSE";

interface ConnectionStatusProps {
  status: SSEStatus;
  reconnectAttempts?: number;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<
  SSEStatus,
  {
    color: string;
    dotColor: string;
    label: string;
    Icon: React.ElementType;
  }
> = {
  connected: {
    color: "text-green-600 dark:text-green-400",
    dotColor: "bg-green-500",
    label: "Connected",
    Icon: Wifi,
  },
  connecting: {
    color: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
    label: "Connecting",
    Icon: Loader2,
  },
  disconnected: {
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground/50",
    label: "Disconnected",
    Icon: WifiOff,
  },
  error: {
    color: "text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
    label: "Connection Error",
    Icon: WifiOff,
  },
};

export function ConnectionStatus({
  status,
  reconnectAttempts = 0,
  className,
  showLabel = true,
}: Readonly<ConnectionStatusProps>) {
  const config = statusConfig[status];
  const { Icon } = config;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "size-2 rounded-full",
            config.dotColor,
            status === "connected" && "animate-pulse",
          )}
        />
      </div>

      <Icon
        className={cn(
          "size-4",
          config.color,
          status === "connecting" && "animate-spin",
        )}
      />

      {showLabel && (
        <span className={cn("text-xs font-medium", config.color)}>
          {config.label}
          {status === "connecting" && reconnectAttempts > 0 && (
            <span className="text-muted-foreground ml-1">
              (attempt {reconnectAttempts})
            </span>
          )}
        </span>
      )}
    </div>
  );
}
