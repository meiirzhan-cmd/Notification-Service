import { type NextRequest } from "next/server";
import type { Notification } from "@/lib/notifications";

/**
 * Client connection store
 * Maps userId to their active response stream controller
 */
interface ClientConnection {
  controller: ReadableStreamDefaultController<Uint8Array>;
  connectedAt: Date;
  lastActivity: Date;
}

const clients = new Map<string, ClientConnection>();

/**
 * Heartbeat interval in milliseconds (30 seconds)
 */
const HEARTBEAT_INTERVAL = 30000;

/**
 * Encodes a message in SSE format
 */
function encodeSSE(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${payload}\n\n`);
}

/**
 * Sends a notification to a specific user's stream
 */
export function sendNotificationToUser(
  userId: string,
  notification: Notification
): boolean {
  const client = clients.get(userId);

  if (!client) {
    return false;
  }

  try {
    client.controller.enqueue(encodeSSE("notification", notification));
    client.lastActivity = new Date();
    return true;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    removeClient(userId);
    return false;
  }
}

/**
 * Broadcasts a notification to multiple users
 */
export function broadcastNotification(
  userIds: string[],
  notification: Notification
): { sent: number; failed: number } {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    if (sendNotificationToUser(userId, notification)) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Gets the list of connected user IDs
 */
export function getConnectedUsers(): string[] {
  return Array.from(clients.keys());
}

/**
 * Checks if a user is connected
 */
export function isUserConnected(userId: string): boolean {
  return clients.has(userId);
}

/**
 * Gets connection info for a user
 */
export function getConnectionInfo(userId: string): {
  connectedAt: Date;
  lastActivity: Date;
} | null {
  const client = clients.get(userId);
  if (!client) return null;

  return {
    connectedAt: client.connectedAt,
    lastActivity: client.lastActivity,
  };
}

/**
 * Removes a client connection
 */
function removeClient(userId: string): void {
  const client = clients.get(userId);
  if (client) {
    try {
      client.controller.close();
    } catch {
      // Controller might already be closed
    }
    clients.delete(userId);
    console.log(`Client disconnected: ${userId}. Active connections: ${clients.size}`);
  }
}

/**
 * Starts the heartbeat for a client
 */
function startHeartbeat(
  userId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal
): void {
  const heartbeat = () => {
    if (signal.aborted) {
      return;
    }

    const client = clients.get(userId);
    if (!client) {
      return;
    }

    try {
      controller.enqueue(encodeSSE("heartbeat", { timestamp: Date.now() }));
      client.lastActivity = new Date();

      // Schedule next heartbeat
      setTimeout(heartbeat, HEARTBEAT_INTERVAL);
    } catch (error) {
      console.error(`Heartbeat failed for user ${userId}:`, error);
      removeClient(userId);
    }
  };

  // Start first heartbeat after interval
  setTimeout(heartbeat, HEARTBEAT_INTERVAL);
}

/**
 * GET /api/notifications/stream
 *
 * Establishes an SSE connection for real-time notifications.
 * Requires userId query parameter.
 *
 * Events:
 * - connected: Initial connection confirmation
 * - notification: New notification data
 * - heartbeat: Keep-alive ping (every 30s)
 */
export async function GET(request: NextRequest): Promise<Response> {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "userId query parameter is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Close existing connection for this user if any
  if (clients.has(userId)) {
    removeClient(userId);
  }

  // Create abort controller for cleanup
  const abortController = new AbortController();

  // Create the readable stream
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register the client
      clients.set(userId, {
        controller,
        connectedAt: new Date(),
        lastActivity: new Date(),
      });

      console.log(`Client connected: ${userId}. Active connections: ${clients.size}`);

      // Send initial connection confirmation
      controller.enqueue(
        encodeSSE("connected", {
          userId,
          timestamp: Date.now(),
          message: "Successfully connected to notification stream",
        })
      );

      // Start heartbeat mechanism
      startHeartbeat(userId, controller, abortController.signal);
    },

    cancel() {
      // Handle client disconnection
      abortController.abort();
      removeClient(userId);
    },
  });

  // Handle request abort (client disconnect)
  request.signal.addEventListener("abort", () => {
    abortController.abort();
    removeClient(userId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
