import rabbitmq from "@/lib/rabbitmq";
import {
  NOTIFICATIONS_EXCHANGE,
  NOTIFICATIONS_EXCHANGE_TYPE,
  NOTIFICATIONS_QUEUE,
  NOTIFICATIONS_DLQ,
  NOTIFICATIONS_DLX,
  ROUTING_KEYS,
  QUEUE_OPTIONS,
} from "./constants";

let isSetupComplete = false;

/**
 * Sets up the RabbitMQ infrastructure for notifications:
 * - Creates the topic exchange for routing notifications
 * - Creates the dead letter exchange for failed messages
 * - Creates the main queue with DLQ binding
 * - Creates the dead letter queue
 * - Binds routing keys to the main queue
 */
export async function setupNotificationInfrastructure(): Promise<void> {
  if (isSetupComplete) {
    console.log("Notification infrastructure already set up");
    return;
  }

  try {
    console.log("Setting up notification infrastructure...");

    // Ensure connection is established
    await rabbitmq.connect();

    // 1. Create the dead letter exchange (direct type for simple routing)
    await rabbitmq.assertExchange(NOTIFICATIONS_DLX, "direct", {
      durable: true,
    });
    console.log(`Created dead letter exchange: ${NOTIFICATIONS_DLX}`);

    // 2. Create the main notifications exchange (topic type for flexible routing)
    await rabbitmq.assertExchange(
      NOTIFICATIONS_EXCHANGE,
      NOTIFICATIONS_EXCHANGE_TYPE,
      {
        durable: true,
      }
    );
    console.log(`Created notifications exchange: ${NOTIFICATIONS_EXCHANGE}`);

    // 3. Create the dead letter queue
    await rabbitmq.assertQueue(NOTIFICATIONS_DLQ, QUEUE_OPTIONS.dlq);
    console.log(`Created dead letter queue: ${NOTIFICATIONS_DLQ}`);

    // 4. Bind DLQ to DLX
    await rabbitmq.bindQueue(NOTIFICATIONS_DLQ, NOTIFICATIONS_DLX, "dead-letter");
    console.log(`Bound ${NOTIFICATIONS_DLQ} to ${NOTIFICATIONS_DLX}`);

    // 5. Create the main notifications queue with DLQ settings
    await rabbitmq.assertQueue(NOTIFICATIONS_QUEUE, QUEUE_OPTIONS.main);
    console.log(`Created main queue: ${NOTIFICATIONS_QUEUE}`);

    // 6. Bind routing keys to the main queue
    const routingKeys = [
      ROUTING_KEYS.EMAIL,
      ROUTING_KEYS.PUSH,
      ROUTING_KEYS.IN_APP,
    ];

    for (const routingKey of routingKeys) {
      await rabbitmq.bindQueue(
        NOTIFICATIONS_QUEUE,
        NOTIFICATIONS_EXCHANGE,
        routingKey
      );
      console.log(
        `Bound ${NOTIFICATIONS_QUEUE} to ${NOTIFICATIONS_EXCHANGE} with key: ${routingKey}`
      );
    }

    isSetupComplete = true;
    console.log("Notification infrastructure setup complete!");
  } catch (error) {
    console.error("Failed to set up notification infrastructure:", error);
    throw error;
  }
}

/**
 * Check if the infrastructure has been set up
 */
export function isInfrastructureReady(): boolean {
  return isSetupComplete;
}

/**
 * Reset the setup state (useful for testing)
 */
export function resetSetupState(): void {
  isSetupComplete = false;
}
