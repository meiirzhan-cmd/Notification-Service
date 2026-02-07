"use client";

import { cn } from "@/lib/utils";
import { Mail, Bell, MonitorSmartphone, Shield, Megaphone, RefreshCw, Users, Clock, X } from "lucide-react";
import type { Notification } from "@/lib/notifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const categoryIcons: Record<string, React.ElementType> = {
  security: Shield,
  marketing: Megaphone,
  updates: RefreshCw,
  social: Users,
  reminders: Clock,
};

const typeIcons: Record<string, React.ElementType> = {
  email: Mail,
  push: Bell,
  "in-app": MonitorSmartphone,
};

const categoryColors: Record<string, string> = {
  security: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  marketing: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  updates: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  social: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  reminders: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const isUnread = !notification.readAt;
  const CategoryIcon = categoryIcons[notification.category] ?? Bell;
  const TypeIcon = typeIcons[notification.type] ?? Bell;

  return (
    <div
      className={cn(
        "group relative flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent/50",
        isUnread && "bg-accent/30",
        compact && "px-3 py-2"
      )}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
      )}

      {/* Category icon */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          categoryColors[notification.category] ?? "bg-muted text-muted-foreground",
          compact && "size-7"
        )}
      >
        <CategoryIcon className={cn("size-4", compact && "size-3.5")} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-tight truncate",
              isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(notification.createdAt)}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.body}
        </p>

        {/* Footer: type badge + actions */}
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                "bg-muted text-muted-foreground"
              )}
            >
              <TypeIcon className="size-2.5" />
              {notification.type}
            </span>
          </div>

          {/* Actions (visible on hover) */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isUnread && onMarkAsRead && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="rounded-md px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                Mark read
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(notification.id)}
                className="rounded-md p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
