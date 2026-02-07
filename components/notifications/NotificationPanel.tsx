"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        "w-[380px] max-h-[480px] flex flex-col",
        "rounded-lg border border-border bg-background shadow-lg",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ConnectionStatus status={connectionStatus} showLabel={false} />
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
              <Bell className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No notifications
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                compact
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="p-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="w-full text-xs"
                >
                  {isLoading ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-border px-4 py-2 flex items-center justify-center">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCheck className="size-3" />
            {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
          </span>
        </div>
      )}
    </div>
  );
}
