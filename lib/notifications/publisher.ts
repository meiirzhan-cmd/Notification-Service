import rabbitmq from "@/lib/rabbitmq";
import {
  NOTIFICATIONS_EXCHANGE,
  ROUTING_KEYS,
  type RoutingKey,
} from "./constants";
import { setupNotificationInfrastructure, isInfrastructureReady } from "./setup";
import type {
  Notification,
  NotificationPayload,
  CreateNotificationInput,
  NotificationType,
} from "./types";

/**
 * Maps notification type to routing key
 */
function getRoutingKey(type: NotificationType): RoutingKey {
  switch (type) {
    case "email":
      return ROUTING_KEYS.EMAIL;
    case "push":
      return ROUTING_KEYS.PUSH;
    case "in-app":
      return ROUTING_KEYS.IN_APP;
    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

/**
 * Generates a unique notification ID
 */
function generateNotificationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `notif_${timestamp}_${randomPart}`;
}

/**
 * Publishes a single notification to the RabbitMQ exchange
 */
export async function publishNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  // Ensure infrastructure is set up
  if (!isInfrastructureReady()) {
    await setupNotificationInfrastructure();
  }

  const notification: Notification = {
    id: generateNotificationId(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    category: input.category,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };

  const routingKey = getRoutingKey(input.type);

  const payload: NotificationPayload = {
    notification,
    routingKey,
    timestamp: new Date().toISOString(),
  };

  const success = await rabbitmq.publish(
    NOTIFICATIONS_EXCHANGE,
    routingKey,
    payload as unknown as Record<string, unknown>
  );

  if (!success) {
    throw new Error("Failed to publish notification to exchange");
  }

  console.log(
    `Published notification ${notification.id} with routing key: ${routingKey}`
  );

  return notification;
}

/**
 * Publishes multiple notifications in batch
 */
export async function publishNotifications(
  inputs: CreateNotificationInput[]
): Promise<Notification[]> {
  // Ensure infrastructure is set up
  if (!isInfrastructureReady()) {
    await setupNotificationInfrastructure();
  }

  const notifications: Notification[] = [];

  for (const input of inputs) {
    const notification = await publishNotification(input);
    notifications.push(notification);
  }

  console.log(`Published ${notifications.length} notifications`);

  return notifications;
}

/**
 * Publishes a notification to a specific user
 * Convenience wrapper for common use case
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  category: CreateNotificationInput["category"],
  metadata?: Record<string, unknown>
): Promise<Notification> {
  return publishNotification({
    userId,
    type,
    title,
    body,
    category,
    metadata,
  });
}

/**
 * Publishes the same notification to multiple users
 */
export async function broadcastNotification(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  category: CreateNotificationInput["category"],
  metadata?: Record<string, unknown>
): Promise<Notification[]> {
  const inputs: CreateNotificationInput[] = userIds.map((userId) => ({
    userId,
    type,
    title,
    body,
    category,
    metadata,
  }));

  return publishNotifications(inputs);
}
