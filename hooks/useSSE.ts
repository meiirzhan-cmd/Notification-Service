"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

export interface UseSSEReturn {
  status: SSEStatus;
  lastEvent: SSEEvent | null;
  connect: () => void;
  disconnect: () => void;
  reconnectAttempts: number;
}

export function useSSE(options: UseSSEOptions): UseSSEReturn {
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

  const [status, setStatus] = useState<SSEStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    setStatus("disconnected");
    setReconnectAttempts(0);
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    // Don't connect if already connecting or connected
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

    setStatus("connecting");

    const url = `/api/notifications/stream?userId=${encodeURIComponent(userId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      setStatus("connected");
      setReconnectAttempts(0);
      setLastEvent({ type: "connected", data, timestamp: Date.now() });
      onConnected?.(data);
    });

    eventSource.addEventListener("notification", (event) => {
      const data = JSON.parse(event.data);
      setLastEvent({ type: "notification", data, timestamp: Date.now() });
      onNotification?.(data);
    });

    eventSource.addEventListener("heartbeat", (event) => {
      const data = JSON.parse(event.data);
      setLastEvent({ type: "heartbeat", data, timestamp: Date.now() });
      onHeartbeat?.(data);
    });

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setStatus("error");
      onError?.(error);

      // Close the current connection
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        setReconnectAttempts((prev) => prev + 1);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(
            `SSE reconnecting... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`
          );
          connect();
        }, reconnectInterval);
      } else {
        console.error("SSE max reconnection attempts reached");
        setStatus("disconnected");
      }
    };
  }, [
    userId,
    onNotification,
    onConnected,
    onHeartbeat,
    onError,
    reconnectInterval,
    maxReconnectAttempts,
    reconnectAttempts,
  ]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, autoConnect, connect, disconnect]);

  return {
    status,
    lastEvent,
    connect,
    disconnect,
    reconnectAttempts,
  };
}
