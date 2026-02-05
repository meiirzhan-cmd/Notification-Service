import type { ConsumeMessage } from "amqplib";
import rabbitmq from "@/lib/rabbitmq";
import { getUserPreferences } from "@/lib/services/userPreferences";
import type { UserPreferences } from "@/lib/types/notifications";
import { NOTIFICATIONS_QUEUE } from "./constants";
import { setupNotificationInfrastructure, isInfrastructureReady } from "./setup";
import type { Notification, NotificationPayload, NotificationType } from "./types";

/**
 * Handler function type for processing notifications
 */
export type NotificationHandler = (
  notification: Notification,
  preferences: UserPreferences
) => Promise<void>;

/**
 * Configuration for the notification consumer
 */
export interface ConsumerConfig {
  handlers?: {
    email?: NotificationHandler;
    push?: NotificationHandler;
    "in-app"?: NotificationHandler;
  };
  onError?: (error: Error, notification: Notification) => void;
  prefetchCount?: number;
}

/**
 * Checks if current time is within quiet hours
 */
function isInQuietHours(preferences: UserPreferences): boolean {
  if (!preferences.quietHours?.enabled) {
    return false;
  }

  const { start, end, timezone } = preferences.quietHours;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const currentTime = formatter.format(now);
    const [currentHour, currentMinute] = currentTime.split(":").map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch (error) {
    console.error("Error checking quiet hours:", error);
    return false;
  }
}

/**
 * Checks if user has enabled the notification channel
 */
function isChannelEnabled(
  type: NotificationType,
  preferences: UserPreferences
): boolean {
  switch (type) {
    case "email":
      return preferences.channels.email;
    case "push":
      return preferences.channels.push;
    case "in-app":
      return preferences.channels.inApp;
    default:
      return false;
  }
}

/**
 * Checks if user has enabled the notification category
 */
function isCategoryEnabled(
  category: keyof UserPreferences["categories"],
  preferences: UserPreferences
): boolean {
  return preferences.categories[category] ?? false;
}

/**
 * Default handlers for each notification type
 */
const defaultHandlers: Record<NotificationType, NotificationHandler> = {
  email: async (notification, preferences) => {
    console.log(`[EMAIL] Sending to user ${notification.userId}:`, {
      title: notification.title,
      body: notification.body,
      category: notification.category,
    });
    // In production, integrate with email service (SendGrid, SES, etc.)
  },

  push: async (notification, preferences) => {
    console.log(`[PUSH] Sending to user ${notification.userId}:`, {
      title: notification.title,
      body: notification.body,
      category: notification.category,
    });
    // In production, integrate with push service (FCM, APNs, etc.)
  },

  "in-app": async (notification, preferences) => {
    console.log(`[IN-APP] Delivering to user ${notification.userId}:`, {
      title: notification.title,
      body: notification.body,
      category: notification.category,
    });
    // In production, store in database and/or broadcast via WebSocket/SSE
  },
};

/**
 * Processes a single notification message
 */
async function processNotification(
  payload: NotificationPayload,
  config: ConsumerConfig
): Promise<void> {
  const { notification } = payload;

  // Fetch user preferences from Redis
  const preferences = await getUserPreferences(notification.userId);

  // Check if notification should be delivered based on preferences
  const channelEnabled = isChannelEnabled(notification.type, preferences);
  const categoryEnabled = isCategoryEnabled(notification.category, preferences);
  const inQuietHours = isInQuietHours(preferences);

  if (!channelEnabled) {
    console.log(
      `Skipping notification ${notification.id}: channel ${notification.type} disabled for user ${notification.userId}`
    );
    return;
  }

  if (!categoryEnabled) {
    console.log(
      `Skipping notification ${notification.id}: category ${notification.category} disabled for user ${notification.userId}`
    );
    return;
  }

  // For non-security notifications, respect quiet hours
  if (inQuietHours && notification.category !== "security") {
    console.log(
      `Deferring notification ${notification.id}: user ${notification.userId} is in quiet hours`
    );
    // In production, you might want to queue this for later delivery
    return;
  }

  // Get the handler for this notification type
  const handler =
    config.handlers?.[notification.type] ?? defaultHandlers[notification.type];

  if (!handler) {
    throw new Error(`No handler for notification type: ${notification.type}`);
  }

  // Execute the handler
  await handler(notification, preferences);

  console.log(
    `Successfully processed notification ${notification.id} for user ${notification.userId}`
  );
}

/**
 * Parses a RabbitMQ message into a NotificationPayload
 */
function parseMessage(msg: ConsumeMessage): NotificationPayload {
  const content = msg.content.toString();
  return JSON.parse(content) as NotificationPayload;
}

// Store active consumer tag for management
let activeConsumerTag: string | null = null;

/**
 * Starts the notification consumer
 * Subscribes to the notifications queue and processes messages
 */
export async function startConsumer(
  config: ConsumerConfig = {}
): Promise<string> {
  // Ensure infrastructure is set up
  if (!isInfrastructureReady()) {
    await setupNotificationInfrastructure();
  }

  // Set prefetch count if specified
  if (config.prefetchCount) {
    const channel = await rabbitmq.getChannel();
    await channel.prefetch(config.prefetchCount);
  }

  console.log(`Starting notification consumer on queue: ${NOTIFICATIONS_QUEUE}`);

  const consumerTag = await rabbitmq.consume(
    NOTIFICATIONS_QUEUE,
    async (msg: ConsumeMessage) => {
      try {
        const payload = parseMessage(msg);
        await processNotification(payload, config);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Error processing notification:", err);

        // Call error handler if provided
        if (config.onError) {
          try {
            const payload = parseMessage(msg);
            config.onError(err, payload.notification);
          } catch {
            // Ignore parse errors in error handler
          }
        }

        // Re-throw to trigger nack
        throw error;
      }
    }
  );

  activeConsumerTag = consumerTag;
  console.log(`Consumer started with tag: ${consumerTag}`);

  return consumerTag;
}

/**
 * Stops the notification consumer
 */
export async function stopConsumer(consumerTag?: string): Promise<void> {
  const tagToCancel = consumerTag ?? activeConsumerTag;

  if (!tagToCancel) {
    console.log("No active consumer to stop");
    return;
  }

  await rabbitmq.cancelConsumer(tagToCancel);

  if (tagToCancel === activeConsumerTag) {
    activeConsumerTag = null;
  }

  console.log(`Consumer stopped: ${tagToCancel}`);
}

/**
 * Gets the active consumer tag
 */
export function getActiveConsumerTag(): string | null {
  return activeConsumerTag;
}

/**
 * Creates a consumer with custom handlers
 */
export function createConsumer(config: ConsumerConfig = {}) {
  return {
    start: () => startConsumer(config),
    stop: (tag?: string) => stopConsumer(tag),
    getTag: () => activeConsumerTag,
  };
}
