"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSSE, type SSEStatus, type SSEEvent } from "@/hooks/useSSE";
import { useNotifications, type UseNotificationsReturn } from "@/hooks/useNotifications";
import { usePreferences, type UsePreferencesReturn } from "@/hooks/usePreferences";
import type { Notification } from "@/lib/notifications";

interface NotificationContextValue {
  // User info
  userId: string;

  // SSE connection state
  connectionStatus: SSEStatus;
  lastSSEEvent: SSEEvent | null;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;

  // Notifications state & actions
  notifications: UseNotificationsReturn;

  // Preferences state & actions
  preferences: UsePreferencesReturn;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
  userId: string;
  autoConnect?: boolean;
  autoFetchNotifications?: boolean;
  autoFetchPreferences?: boolean;
}

export function NotificationProvider({
  children,
  userId,
  autoConnect = true,
  autoFetchNotifications = true,
  autoFetchPreferences = true,
}: NotificationProviderProps) {
  // Initialize notifications hook
  const notificationsHook = useNotifications({ userId });

  // Initialize preferences hook
  const preferencesHook = usePreferences({
    userId,
    autoFetch: autoFetchPreferences,
  });

  // Handle incoming SSE notifications
  const handleNotification = useCallback(
    (data: unknown) => {
      const notification = data as Notification;
      notificationsHook.addNotification(notification);
    },
    [notificationsHook]
  );

  const handleConnected = useCallback(() => {
    // Fetch initial notifications when connected
    if (autoFetchNotifications) {
      notificationsHook.fetchNotifications();
    }
  }, [autoFetchNotifications, notificationsHook]);

  // Initialize SSE hook with notification handler
  const sseHook = useSSE({
    userId,
    autoConnect,
    onNotification: handleNotification,
    onConnected: handleConnected,
  });

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      userId,
      connectionStatus: sseHook.status,
      lastSSEEvent: sseHook.lastEvent,
      reconnectAttempts: sseHook.reconnectAttempts,
      connect: sseHook.connect,
      disconnect: sseHook.disconnect,
      notifications: notificationsHook,
      preferences: preferencesHook,
    }),
    [userId, sseHook, notificationsHook, preferencesHook]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access the notification context
 * Must be used within a NotificationProvider
 */
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }

  return context;
}

/**
 * Hook to access just the connection status
 */
export function useConnectionStatus() {
  const { connectionStatus, reconnectAttempts, connect, disconnect } =
    useNotificationContext();

  return {
    status: connectionStatus,
    reconnectAttempts,
    connect,
    disconnect,
    isConnected: connectionStatus === "connected",
    isConnecting: connectionStatus === "connecting",
    isDisconnected: connectionStatus === "disconnected",
    hasError: connectionStatus === "error",
  };
}

/**
 * Hook to access notification list and actions
 */
export function useNotificationList() {
  const { notifications } = useNotificationContext();
  return notifications;
}

/**
 * Hook to access user preferences
 */
export function useUserPreferences() {
  const { preferences } = useNotificationContext();
  return preferences;
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount() {
  const { notifications } = useNotificationContext();
  return notifications.unreadCount;
}
