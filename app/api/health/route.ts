import { NextResponse } from "next/server";
import redis from "@/lib/redis";
import rabbitmq from "@/lib/rabbitmq";

interface ServiceStatus {
  status: "healthy" | "unhealthy";
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  services: {
    redis: ServiceStatus;
    rabbitmq: ServiceStatus;
  };
}

const startTime = Date.now();

async function checkRedis(): Promise<ServiceStatus> {
  const start = performance.now();
  try {
    const pong = await redis.ping();
    return {
      status: pong === "PONG" ? "healthy" : "unhealthy",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRabbitMQ(): Promise<ServiceStatus> {
  const start = performance.now();
  try {
    const channel = await rabbitmq.getChannel();
    // checkQueue will throw if the connection is broken
    await channel.checkQueue("notification_queue");
    return {
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [redisStatus, rabbitmqStatus] = await Promise.all([
    checkRedis(),
    checkRabbitMQ(),
  ]);

  const allHealthy =
    redisStatus.status === "healthy" && rabbitmqStatus.status === "healthy";
  const allUnhealthy =
    redisStatus.status === "unhealthy" && rabbitmqStatus.status === "unhealthy";

  const overallStatus: HealthResponse["status"] = allHealthy
    ? "healthy"
    : allUnhealthy
      ? "unhealthy"
      : "degraded";

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    services: {
      redis: redisStatus,
      rabbitmq: rabbitmqStatus,
    },
  };

  return NextResponse.json(body, {
    status: overallStatus === "unhealthy" ? 503 : 200,
  });
}
