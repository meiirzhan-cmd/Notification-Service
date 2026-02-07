"use client";

import { useEffect, useRef, useCallback } from "react";
import { useNotificationStore } from "@/stores/notification";

export type SSEStatus = "connecting" | "connected" | "disconnected" | "error";

export interface SSEEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

export interface UseSSEOptions {
  userId: string;
  onNotification?: (data: unknown) => void;
  onConnected?: (data: unknown) => void;
  onHeartbeat?: (data: unknown) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

export function useSSE(options: UseSSEOptions): void {
  const {
    userId,
    onNotification,
    onConnected,
    onHeartbeat,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    autoConnect = true,
  } = options;

  const store = useNotificationStore;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectRef = useRef<() => void>(null);

  // Store callbacks in refs so they never cause reconnection
  const onNotificationRef = useRef(onNotification);
  const onConnectedRef = useRef(onConnected);
  const onHeartbeatRef = useRef(onHeartbeat);
  const onErrorRef = useRef(onError);

  useEffect(() => { onNotificationRef.current = onNotification; }, [onNotification]);
  useEffect(() => { onConnectedRef.current = onConnected; }, [onConnected]);
  useEffect(() => { onHeartbeatRef.current = onHeartbeat; }, [onHeartbeat]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    store.getState().setConnectionStatus("disconnected");
    store.getState().setReconnectAttempts(0);
  }, [clearReconnectTimeout, store]);

  const connect = useCallback(() => {
    if (
      eventSourceRef.current &&
      eventSourceRef.current.readyState !== EventSource.CLOSED
    ) {
      return;
    }

    if (!userId) {
      console.warn("useSSE: userId is required to connect");
      return;
    }

    store.getState().setConnectionStatus("connecting");

    const url = `/api/notifications/stream?userId=${encodeURIComponent(userId)}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      reconnectAttemptsRef.current = 0;
      store.getState().setConnectionStatus("connected");
      store.getState().setLastSSEEvent({ type: "connected", data, timestamp: Date.now() });
      store.getState().setReconnectAttempts(0);
      onConnectedRef.current?.(data);
    });

    eventSource.addEventListener("notification", (event) => {
      const data = JSON.parse(event.data);
      store.getState().setLastSSEEvent({ type: "notification", data, timestamp: Date.now() });
      onNotificationRef.current?.(data);
    });

    eventSource.addEventListener("heartbeat", (event) => {
      const data = JSON.parse(event.data);
      store.getState().setLastSSEEvent({ type: "heartbeat", data, timestamp: Date.now() });
      onHeartbeatRef.current?.(data);
    });

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      store.getState().setConnectionStatus("error");
      onErrorRef.current?.(error);

      eventSource.close();
      eventSourceRef.current = null;

      const attempts = reconnectAttemptsRef.current;
      if (attempts < maxReconnectAttempts) {
        reconnectAttemptsRef.current = attempts + 1;
        store.getState().setReconnectAttempts(attempts + 1);
        console.log(
          `SSE reconnecting... (attempt ${attempts + 1}/${maxReconnectAttempts})`,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current?.();
        }, reconnectInterval);
      } else {
        console.error("SSE max reconnection attempts reached");
        store.getState().setConnectionStatus("disconnected");
      }
    };

    eventSourceRef.current = eventSource;
  }, [userId, maxReconnectAttempts, reconnectInterval, store]);

  // Keep connectRef in sync
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Auto-connect on mount, cleanup on unmount
  useEffect(() => {
    if (autoConnect && userId) {
      const id = setTimeout(() => connect(), 0);
      return () => {
        clearTimeout(id);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [userId, autoConnect, connect, disconnect]);
}
