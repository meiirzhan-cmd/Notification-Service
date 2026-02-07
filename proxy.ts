import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 Proxy — runs on the Node.js runtime before routes are rendered.
 * Logs API requests and propagates request IDs from nginx.
 */
export default function proxy(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();

  const response = NextResponse.next();

  // Propagate request ID to downstream handlers
  response.headers.set("X-Request-ID", requestId);

  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown";

  const url = new URL(request.url);

  console.log(
    `[${new Date().toISOString()}] ${request.method} ${url.pathname} ip=${ip} rid=${requestId}`,
  );

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
