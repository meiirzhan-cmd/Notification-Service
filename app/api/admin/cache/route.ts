import { type NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

/**
 * GET /api/admin/cache
 *
 * Fetches a cached value by key pattern for the cache viewer.
 *
 * Query parameters:
 * - key: string (required) - exact Redis key to read
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { error: "key query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const type = await redis.type(key);
    let value: unknown;

    switch (type) {
      case "string":
        value = await redis.get(key);
        break;
      case "list": {
        const list = await redis.lrange(key, 0, 49);
        value = list;
        break;
      }
      case "set": {
        const set = await redis.smembers(key);
        value = set;
        break;
      }
      case "hash": {
        const hash = await redis.hgetall(key);
        value = hash;
        break;
      }
      default:
        value = null;
    }

    const ttl = await redis.ttl(key);

    return NextResponse.json({
      key,
      type,
      value,
      ttl: ttl === -1 ? "no expiry" : ttl === -2 ? "expired" : `${ttl}s`,
    });
  } catch (error) {
    console.error("Error fetching cache value:", error);

    return NextResponse.json(
      { error: "Failed to fetch cache value" },
      { status: 500 }
    );
  }
}
