"use client";

import { cn } from "@/lib/utils";
import {
  Mail,
  Bell,
  MonitorSmartphone,
  Shield,
  Megaphone,
  RefreshCw,
  Users,
  Clock,
  Check,
  Trash2,
} from "lucide-react";
import type { Notification } from "@/lib/notifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
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
  security: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  marketing:
    "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  updates: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  social: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  reminders:
    "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
};
export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: Readonly<NotificationItemProps>) {
  const isUnread = !notification.readAt;
  const CategoryIcon = categoryIcons[notification.category] ?? Bell;
  const TypeIcon = typeIcons[notification.type] ?? Bell;

  return (
    <div
      className={cn(
        "group relative flex gap-4 px-5 py-4 transition-colors hover:bg-accent/50",
        isUnread && "bg-primary/5",
      )}
    >
      {/* Unread dot */}
      {isUnread && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 size-2 rounded-full bg-primary" />
      )}

      {/* Category icon */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          categoryColors[notification.category] ??
            "bg-muted text-muted-foreground",
        )}
      >
        <CategoryIcon className="size-5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "text-sm leading-snug",
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80",
            )}
          >
            {notification.title}
          </p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {notification.body}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              "bg-muted text-muted-foreground",
            )}
          >
            <TypeIcon className="size-3" />
            {notification.type}
          </span>

          {/* Actions on hover */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {isUnread && onMarkAsRead && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Check className="size-3" />
                Read
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(notification.id)}
                className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
