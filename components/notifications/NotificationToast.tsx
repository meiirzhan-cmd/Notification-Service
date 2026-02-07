"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import type { Notification } from "@/lib/notifications";

interface Toast {
  id: string;
  notification: Notification;
  exiting: boolean;
}

interface NotificationToastContainerProps {
  className?: string;
  maxToasts?: number;
  autoDissmissMs?: number;
}

// Global toast queue - allows pushing toasts from anywhere
let toastListener: ((notification: Notification) => void) | null = null;

/**
 * Push a notification toast from anywhere in the app
 */
export function pushToast(notification: Notification): void {
  toastListener?.(notification);
}

export function NotificationToastContainer({
  className,
  maxToasts = 3,
  autoDissmissMs = 5000,
}: Readonly<NotificationToastContainerProps>) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );

    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const addToast = useCallback(
    (notification: Notification) => {
      const toast: Toast = {
        id: `toast-${notification.id}-${Date.now()}`,
        notification,
        exiting: false,
      };

      setToasts((prev) => {
        const next = [toast, ...prev];
        // Remove excess toasts
        if (next.length > maxToasts) {
          return next.slice(0, maxToasts);
        }
        return next;
      });

      // Auto-dismiss
      setTimeout(() => {
        removeToast(toast.id);
      }, autoDissmissMs);
    },
    [maxToasts, autoDissmissMs, removeToast],
  );

  // Register global listener
  useEffect(() => {
    toastListener = addToast;
    return () => {
      toastListener = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 w-[360px]",
        className,
      )}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "relative rounded-lg border border-border bg-background shadow-lg overflow-hidden",
            "transition-all duration-200",
            toast.exiting
              ? "opacity-0 translate-x-4"
              : "opacity-100 translate-x-0 animate-in slide-in-from-right-5 fade-in-0",
          )}
        >
          {/* Close button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute top-2 right-2 z-10 rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="size-3.5" />
          </button>

          <NotificationItem notification={toast.notification} compact />

          {/* Auto-dismiss progress bar */}
          <div className="h-0.5 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/40 animate-[shrink_linear_forwards]"
              style={{
                animationDuration: `${autoDissmissMs}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
