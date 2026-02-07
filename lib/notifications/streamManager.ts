import type { Notification } from "./types";

/**
 * Client connection store
 * Maps userId to their active response stream controller
 */
interface ClientConnection {
  controller: ReadableStreamDefaultController<Uint8Array>;
  connectedAt: Date;
  lastActivity: Date;
}

// Use globalThis so the Map is shared across all Next.js module contexts
// (instrumentation, route handlers, etc.) within the same process.
declare global {
  var __sseClients: Map<string, ClientConnection> | undefined;
}

const clients = globalThis.__sseClients ?? new Map<string, ClientConnection>();
globalThis.__sseClients = clients;

/**
 * Encodes a message in SSE format
 */
export function encodeSSE(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${payload}\n\n`);
}

/**
 * Registers a new client connection
 */
export function registerClient(
  userId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): void {
  clients.set(userId, {
    controller,
    connectedAt: new Date(),
    lastActivity: new Date(),
  });
  console.log(`Client registered: ${userId}. Active connections: ${clients.size}`);
}

/**
 * Removes a client connection
 */
export function removeClient(userId: string): void {
  const client = clients.get(userId);
  if (client) {
    try {
      client.controller.close();
    } catch {
      // Controller might already be closed
    }
    clients.delete(userId);
    console.log(`Client removed: ${userId}. Active connections: ${clients.size}`);
  }
}

/**
 * Gets a client's controller
 */
export function getClient(userId: string): ClientConnection | undefined {
  return clients.get(userId);
}

/**
 * Updates the last activity timestamp for a client
 */
export function updateClientActivity(userId: string): void {
  const client = clients.get(userId);
  if (client) {
    client.lastActivity = new Date();
  }
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
    console.log(`User ${userId} not connected, notification not streamed`);
    return false;
  }

  try {
    client.controller.enqueue(encodeSSE("notification", notification));
    client.lastActivity = new Date();
    console.log(`Streamed notification ${notification.id} to user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    removeClient(userId);
    return false;
  }
}

/**
 * Streams a notification to multiple connected users
 */
export function streamToUsers(
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
 * Streams a notification to all connected users
 */
export function streamToAllConnected(
  notification: Notification
): { sent: number; failed: number } {
  return streamToUsers(Array.from(clients.keys()), notification);
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
 * Gets the total number of connected clients
 */
export function getConnectionCount(): number {
  return clients.size;
}

/**
 * Sends a custom event to a user's stream
 */
export function sendEventToUser(
  userId: string,
  event: string,
  data: unknown
): boolean {
  const client = clients.get(userId);

  if (!client) {
    return false;
  }

  try {
    client.controller.enqueue(encodeSSE(event, data));
    client.lastActivity = new Date();
    return true;
  } catch (error) {
    console.error(`Error sending event to user ${userId}:`, error);
    removeClient(userId);
    return false;
  }
}
