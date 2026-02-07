"use client";

import { create } from "zustand";
import type { Notification, CreateNotificationInput } from "@/lib/notifications";
import type { UserPreferences } from "@/lib/types/notifications";
import type { SSEStatus, SSEEvent } from "@/hooks/useSSE";

// ── Notification slice ──────────────────────────────────────────────

interface NotificationSlice {
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

// ── Preferences slice ───────────────────────────────────────────────

interface PreferencesSlice {
  preferences: UserPreferences | null;
  preferencesLoading: boolean;
  preferencesSaving: boolean;
  preferencesError: string | null;
}

// ── SSE slice ───────────────────────────────────────────────────────

interface SSESlice {
  connectionStatus: SSEStatus;
  lastSSEEvent: SSEEvent | null;
  reconnectAttempts: number;
}

// ── Actions ─────────────────────────────────────────────────────────

interface NotificationActions {
  // Notification actions
  fetchNotifications: (
    userId: string,
    options?: { limit?: number; offset?: number },
  ) => Promise<void>;
  loadMore: (userId: string) => Promise<void>;
  markAsRead: (userId: string, notificationId: string) => Promise<boolean>;
  deleteNotification: (
    userId: string,
    notificationId: string,
  ) => Promise<boolean>;
  sendNotification: (
    input: CreateNotificationInput,
  ) => Promise<Notification | null>;
  addNotification: (notification: Notification) => void;
  clearError: () => void;
  refresh: (userId: string) => Promise<void>;

  // Preferences actions
  fetchPreferences: (userId: string) => Promise<void>;
  updatePreferences: (
    userId: string,
    updates: {
      channels?: Partial<UserPreferences["channels"]>;
      categories?: Partial<UserPreferences["categories"]>;
      quietHours?: UserPreferences["quietHours"];
      frequency?: UserPreferences["frequency"];
    },
  ) => Promise<boolean>;
  updateChannel: (
    userId: string,
    channel: keyof UserPreferences["channels"],
    enabled: boolean,
  ) => Promise<boolean>;
  updateCategory: (
    userId: string,
    category: keyof UserPreferences["categories"],
    enabled: boolean,
  ) => Promise<boolean>;
  updateQuietHours: (
    userId: string,
    quietHours: UserPreferences["quietHours"],
  ) => Promise<boolean>;
  updateFrequency: (
    userId: string,
    frequency: UserPreferences["frequency"],
  ) => Promise<boolean>;
  resetPreferences: (userId: string) => Promise<boolean>;
  clearPreferencesError: () => void;

  // SSE actions
  setConnectionStatus: (status: SSEStatus) => void;
  setLastSSEEvent: (event: SSEEvent) => void;
  setReconnectAttempts: (attempts: number) => void;
}

// ── Store ───────────────────────────────────────────────────────────

export type NotificationStore = NotificationSlice &
  PreferencesSlice &
  SSESlice &
  NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  pagination: { total: 0, limit: 20, offset: 0, hasMore: false },

  preferences: null,
  preferencesLoading: false,
  preferencesSaving: false,
  preferencesError: null,

  connectionStatus: "disconnected",
  lastSSEEvent: null,
  reconnectAttempts: 0,

  // ── Notification actions ────────────────────────────────────────

  fetchNotifications: async (userId, options) => {
    if (!userId) return;

    const limit = options?.limit ?? get().pagination.limit;
    const offset = options?.offset ?? 0;

    set({ isLoading: true, error: null });

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

      set((state) => ({
        notifications:
          offset === 0
            ? data.notifications
            : [...state.notifications, ...data.notifications],
        unreadCount: data.unreadCount,
        pagination: data.pagination,
        isLoading: false,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch notifications";
      set({ error: message, isLoading: false });
      console.error("Error fetching notifications:", err);
    }
  },

  loadMore: async (userId) => {
    const { pagination, isLoading } = get();
    if (!pagination.hasMore || isLoading) return;

    const newOffset = pagination.offset + pagination.limit;
    await get().fetchNotifications(userId, {
      limit: pagination.limit,
      offset: newOffset,
    });
  },

  markAsRead: async (userId, notificationId) => {
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

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to mark as read";
      set({ error: message });
      console.error("Error marking notification as read:", err);
      return false;
    }
  },

  deleteNotification: async (userId, notificationId) => {
    try {
      const params = new URLSearchParams({ userId, notificationId });
      const response = await fetch(`/api/notifications/history?${params}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete notification");
      }

      const deletedNotification = get().notifications.find(
        (n) => n.id === notificationId,
      );

      set((state) => ({
        notifications: state.notifications.filter(
          (n) => n.id !== notificationId,
        ),
        unreadCount:
          deletedNotification && !deletedNotification.readAt
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      }));

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete notification";
      set({ error: message });
      console.error("Error deleting notification:", err);
      return false;
    }
  },

  sendNotification: async (input) => {
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send notification");
      }

      // Optimistically add to store so UI updates immediately
      if (data.notification) {
        get().addNotification(data.notification);
      }

      return data.notification;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send notification";
      set({ error: message });
      console.error("Error sending notification:", err);
      return null;
    }
  },

  addNotification: (notification) => {
    set((state) => {
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.readAt
          ? state.unreadCount
          : state.unreadCount + 1,
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      };
    });
  },

  clearError: () => set({ error: null }),

  refresh: async (userId) => {
    const { pagination } = get();
    await get().fetchNotifications(userId, { limit: pagination.limit, offset: 0 });
  },

  // ── Preferences actions ─────────────────────────────────────────

  fetchPreferences: async (userId) => {
    if (!userId) return;

    set({ preferencesLoading: true, preferencesError: null });

    try {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/preferences?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch preferences");
      }

      set({ preferences: data.preferences, preferencesLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch preferences";
      set({ preferencesError: message, preferencesLoading: false });
      console.error("Error fetching preferences:", err);
    }
  },

  updatePreferences: async (userId, updates) => {
    if (!userId) return false;

    set({ preferencesSaving: true, preferencesError: null });

    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update preferences");
      }

      set({ preferences: data.preferences, preferencesSaving: false });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update preferences";
      set({ preferencesError: message, preferencesSaving: false });
      console.error("Error updating preferences:", err);
      return false;
    }
  },

  updateChannel: async (userId, channel, enabled) => {
    return get().updatePreferences(userId, { channels: { [channel]: enabled } });
  },

  updateCategory: async (userId, category, enabled) => {
    return get().updatePreferences(userId, {
      categories: { [category]: enabled },
    });
  },

  updateQuietHours: async (userId, quietHours) => {
    return get().updatePreferences(userId, { quietHours });
  },

  updateFrequency: async (userId, frequency) => {
    return get().updatePreferences(userId, { frequency });
  },

  resetPreferences: async (userId) => {
    if (!userId) return false;

    set({ preferencesSaving: true, preferencesError: null });

    try {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/preferences?${params}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset preferences");
      }

      await get().fetchPreferences(userId);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset preferences";
      set({ preferencesError: message, preferencesSaving: false });
      console.error("Error resetting preferences:", err);
      return false;
    }
  },

  clearPreferencesError: () => set({ preferencesError: null }),

  // ── SSE actions ─────────────────────────────────────────────────

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLastSSEEvent: (event) => set({ lastSSEEvent: event }),
  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
}));
