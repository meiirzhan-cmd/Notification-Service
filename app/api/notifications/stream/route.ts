import { type NextRequest } from "next/server";
import {
  registerClient,
  removeClient,
  getClient,
  encodeSSE,
  updateClientActivity,
} from "@/lib/notifications/streamManager";

/**
 * Heartbeat interval in milliseconds (30 seconds)
 */
const HEARTBEAT_INTERVAL = 30000;

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

    const client = getClient(userId);
    if (!client) {
      return;
    }

    try {
      controller.enqueue(encodeSSE("heartbeat", { timestamp: Date.now() }));
      updateClientActivity(userId);

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
 * - notification: New notification data (pushed from RabbitMQ consumer)
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
  if (getClient(userId)) {
    removeClient(userId);
  }

  // Create abort controller for cleanup
  const abortController = new AbortController();

  // Create the readable stream
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register the client with the stream manager
      registerClient(userId, controller);

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
