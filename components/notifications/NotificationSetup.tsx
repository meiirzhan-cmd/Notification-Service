"use client";

import { useEffect, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useNotificationStore } from "@/stores/notification";
import { pushToast } from "./NotificationToast";
import type { Notification } from "@/lib/notifications";

interface NotificationSetupProps {
  userId: string;
  autoConnect?: boolean;
  autoFetchNotifications?: boolean;
  autoFetchPreferences?: boolean;
}

/**
 * Headless component that wires SSE events into the Zustand store.
 * Mount once near the root of your app.
 */
export function NotificationSetup({
  userId,
  autoConnect = true,
  autoFetchNotifications = true,
  autoFetchPreferences = true,
}: Readonly<NotificationSetupProps>) {
  const { addNotification, fetchNotifications, fetchPreferences } =
    useNotificationStore();

  const handleNotification = useCallback(
    (data: unknown) => {
      const notification = data as Notification;
      addNotification(notification);
      pushToast(notification);
    },
    [addNotification],
  );

  const handleConnected = useCallback(() => {
    if (autoFetchNotifications) {
      fetchNotifications(userId);
    }
  }, [autoFetchNotifications, fetchNotifications, userId]);

  useSSE({
    userId,
    autoConnect,
    onNotification: handleNotification,
    onConnected: handleConnected,
  });

  // Fetch notifications on mount (don't wait for SSE connection)
  useEffect(() => {
    if (autoFetchNotifications && userId) {
      fetchNotifications(userId);
    }
  }, [autoFetchNotifications, userId, fetchNotifications]);

  // Auto-fetch preferences on mount
  useEffect(() => {
    if (autoFetchPreferences && userId) {
      fetchPreferences(userId);
    }
  }, [autoFetchPreferences, userId, fetchPreferences]);

  return null;
}
