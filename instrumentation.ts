export async function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "page" | "route" | "middleware";
    renderSource:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering";
    revalidateReason: "on-demand" | "stale" | undefined;
    renderType: "dynamic" | "dynamic-resume";
  },
) {
  console.error(
    `[${context.routerKind}] ${request.method} ${request.path} → ${error.message}`,
  );
}

export async function register() {
  // Only start the consumer on the server (not during build or on the client)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startConsumer } = await import("@/lib/notifications/consumer");
    const { setupNotificationInfrastructure } = await import(
      "@/lib/notifications/setup"
    );

    try {
      await setupNotificationInfrastructure();
      await startConsumer({ prefetchCount: 10 });
      console.log("Notification consumer started successfully");
    } catch (error) {
      console.error("Failed to start notification consumer:", error);
    }
  }
}
