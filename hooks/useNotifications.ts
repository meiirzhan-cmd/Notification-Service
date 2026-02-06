"use client";

import { useState, useCallback } from "react";
import type { Notification, CreateNotificationInput } from "@/lib/notifications";

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UseNotificationsOptions {
  userId: string;
  initialLimit?: number;
}

export interface UseNotificationsReturn extends NotificationState {
  fetchNotifications: (options?: { limit?: number; offset?: number }) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  sendNotification: (input: Omit<CreateNotificationInput, "userId">) => Promise<Notification | null>;
  addNotification: (notification: Notification) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions): UseNotificationsReturn {
  const { userId, initialLimit = 20 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: initialLimit,
    offset: 0,
    hasMore: false,
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchNotifications = useCallback(
    async (fetchOptions?: { limit?: number; offset?: number }) => {
      if (!userId) return;

      const limit = fetchOptions?.limit ?? initialLimit;
      const offset = fetchOptions?.offset ?? 0;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          userId,
          limit: String(limit),
          offset: String(offset),
        });

        const response = await fetch(`/api/notifications/history?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch notifications");
        }

        if (offset === 0) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }

        setUnreadCount(data.unreadCount);
        setPagination(data.pagination);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch notifications";
        setError(message);
        console.error("Error fetching notifications:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, initialLimit]
  );

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || isLoading) return;

    const newOffset = pagination.offset + pagination.limit;
    await fetchNotifications({ limit: pagination.limit, offset: newOffset });
  }, [pagination, isLoading, fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/notifications/history", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, notificationId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to mark as read");
        }

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to mark as read";
        setError(message);
        console.error("Error marking notification as read:", err);
        return false;
      }
    },
    [userId]
  );

  const deleteNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      try {
        const params = new URLSearchParams({ userId, notificationId });
        const response = await fetch(`/api/notifications/history?${params}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete notification");
        }

        // Update local state
        const deletedNotification = notifications.find((n) => n.id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (deletedNotification && !deletedNotification.readAt) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete notification";
        setError(message);
        console.error("Error deleting notification:", err);
        return false;
      }
    },
    [userId, notifications]
  );

  const sendNotification = useCallback(
    async (input: Omit<CreateNotificationInput, "userId">): Promise<Notification | null> => {
      try {
        const response = await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, userId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to send notification");
        }

        return data.notification;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send notification";
        setError(message);
        console.error("Error sending notification:", err);
        return null;
      }
    },
    [userId]
  );

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => {
      // Avoid duplicates
      if (prev.some((n) => n.id === notification.id)) {
        return prev;
      }
      return [notification, ...prev];
    });

    if (!notification.readAt) {
      setUnreadCount((prev) => prev + 1);
    }

    setPagination((prev) => ({
      ...prev,
      total: prev.total + 1,
    }));
  }, []);

  const refresh = useCallback(async () => {
    await fetchNotifications({ limit: pagination.limit, offset: 0 });
  }, [fetchNotifications, pagination.limit]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    pagination,
    fetchNotifications,
    loadMore,
    markAsRead,
    deleteNotification,
    sendNotification,
    addNotification,
    clearError,
    refresh,
  };
}
