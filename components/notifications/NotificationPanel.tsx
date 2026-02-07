"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "./NotificationItem";
import { ConnectionStatus } from "./ConnectionStatus";
import type { Notification } from "@/lib/notifications";
import type { SSEStatus } from "@/hooks/useSSE";

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  connectionStatus: SSEStatus;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  hasMore,
  connectionStatus,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
  onLoadMore,
}: Readonly<NotificationPanelProps>) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute right-0 top-full mt-2 z-50",
        "w-105 max-h-130 flex flex-col",
        "rounded-xl border border-border bg-background shadow-xl",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5.5 h-5.5 rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus status={connectionStatus} showLabel={false} />
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted mb-4">
              <Bell className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No notifications yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="p-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="w-full text-sm"
                >
                  {isLoading ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="px-5 py-3 flex items-center justify-center">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCheck className="size-3.5" />
              {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
