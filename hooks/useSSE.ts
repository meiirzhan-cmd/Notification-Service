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

/**
 * Creates an EventSource connection and attaches event listeners.
 * Returns a cleanup function that closes the connection.
 */
function createEventSource(
  userId: string,
  callbacks: {
    onStatusChange: (status: SSEStatus) => void;
    onEvent: (event: SSEEvent) => void;
    onNotification?: (data: unknown) => void;
    onConnected?: (data: unknown) => void;
    onHeartbeat?: (data: unknown) => void;
    onError?: (error: Event) => void;
  },
  reconnect: {
    attemptsRef: React.RefObject<number>;
    maxAttempts: number;
    interval: number;
    scheduleRef: React.RefObject<(() => void) | null>;
  },
): EventSource {
  const url = `/api/notifications/stream?userId=${encodeURIComponent(userId)}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("connected", (event) => {
    const data = JSON.parse(event.data);
    reconnect.attemptsRef.current = 0;
    callbacks.onStatusChange("connected");
    callbacks.onEvent({ type: "connected", data, timestamp: Date.now() });
    callbacks.onConnected?.(data);
  });

  eventSource.addEventListener("notification", (event) => {
    const data = JSON.parse(event.data);
    callbacks.onEvent({ type: "notification", data, timestamp: Date.now() });
    callbacks.onNotification?.(data);
  });

  eventSource.addEventListener("heartbeat", (event) => {
    const data = JSON.parse(event.data);
    callbacks.onEvent({ type: "heartbeat", data, timestamp: Date.now() });
    callbacks.onHeartbeat?.(data);
  });

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
    callbacks.onStatusChange("error");
    callbacks.onError?.(error);

    eventSource.close();

    const attempts = reconnect.attemptsRef.current;
    if (attempts < reconnect.maxAttempts) {
      reconnect.attemptsRef.current = attempts + 1;
      console.log(
        `SSE reconnecting... (attempt ${attempts + 1}/${reconnect.maxAttempts})`
      );
      reconnect.scheduleRef.current?.();
    } else {
      console.error("SSE max reconnection attempts reached");
      callbacks.onStatusChange("disconnected");
    }
  };

  return eventSource;
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
  const reconnectAttemptsRef = useRef(0);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);

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

    eventSourceRef.current = createEventSource(
      userId,
      {
        onStatusChange: setStatus,
        onEvent: (event) => {
          setLastEvent(event);
          if (event.type === "connected") {
            setReconnectAttempts(0);
          }
        },
        onNotification,
        onConnected,
        onHeartbeat,
        onError,
      },
      {
        attemptsRef: reconnectAttemptsRef,
        maxAttempts: maxReconnectAttempts,
        interval: reconnectInterval,
        scheduleRef: scheduleReconnectRef,
      },
    );
  }, [
    userId,
    onNotification,
    onConnected,
    onHeartbeat,
    onError,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  // Set up reconnect scheduling via ref to avoid circular deps
  useEffect(() => {
    scheduleReconnectRef.current = () => {
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts(reconnectAttemptsRef.current);
        connect();
      }, reconnectInterval);
    };
  }, [connect, reconnectInterval]);

  // Auto-connect / cleanup
  useEffect(() => {
    if (autoConnect && userId) {
      // Schedule outside synchronous effect body
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

  return {
    status,
    lastEvent,
    connect,
    disconnect,
    reconnectAttempts,
  };
}
