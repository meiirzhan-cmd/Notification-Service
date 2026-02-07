import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import {
  getConnectedUsers,
  getConnectionCount,
  getConnectionInfo,
} from "@/lib/notifications/streamManager";

/**
 * GET /api/admin/stats
 *
 * Returns live system statistics for the dashboard:
 * - Active SSE connections
 * - Redis cache stats
 */
export async function GET(): Promise<NextResponse> {
  try {
    // SSE connection stats
    const connectedUsers = getConnectedUsers();
    const connectionCount = getConnectionCount();
    const connections = connectedUsers.map((userId) => ({
      userId,
      ...getConnectionInfo(userId),
    }));

    // Redis stats
    let redisInfo: {
      status: string;
      usedMemory: string | null;
      connectedClients: string | null;
      keyCount: number;
    };

    try {
      const info = await redis.info("memory");
      const clientInfo = await redis.info("clients");
      const keyCount = await redis.dbsize();

      const usedMemory = info.match(/used_memory_human:(.+)/)?.[1]?.trim() ?? null;
      const connectedClients = clientInfo.match(/connected_clients:(\d+)/)?.[1] ?? null;

      redisInfo = {
        status: "connected",
        usedMemory,
        connectedClients,
        keyCount,
      };
    } catch {
      redisInfo = {
        status: "disconnected",
        usedMemory: null,
        connectedClients: null,
        keyCount: 0,
      };
    }

    // Fetch some cached preference keys for the viewer
    let cachedKeys: string[] = [];
    try {
      const keys = await redis.keys("user:preferences:*");
      cachedKeys = keys.slice(0, 50);
    } catch {
      // Ignore
    }

    return NextResponse.json({
      sse: {
        connectionCount,
        connections,
      },
      redis: {
        ...redisInfo,
        cachedPreferencesKeys: cachedKeys,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);

    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
