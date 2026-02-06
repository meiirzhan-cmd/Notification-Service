import redis from "@/lib/redis";
import type { Notification } from "@/lib/notifications";

const NOTIFICATIONS_PREFIX = "notifications:user:";
const MAX_NOTIFICATIONS_PER_USER = 100;
const NOTIFICATION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Stores a notification in Redis for history retrieval
 */
export async function storeNotification(notification: Notification): Promise<void> {
  const key = `${NOTIFICATIONS_PREFIX}${notification.userId}`;

  try {
    // Add notification to the user's list (newest first)
    await redis.lpush(key, JSON.stringify(notification));

    // Trim to keep only the most recent notifications
    await redis.ltrim(key, 0, MAX_NOTIFICATIONS_PER_USER - 1);

    // Set TTL on the key
    await redis.expire(key, NOTIFICATION_TTL);
  } catch (error) {
    console.error(`Error storing notification for user ${notification.userId}:`, error);
    throw error;
  }
}

/**
 * Retrieves notification history for a user
 */
export async function getNotificationHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ notifications: Notification[]; total: number }> {
  const key = `${NOTIFICATIONS_PREFIX}${userId}`;
  const limit = Math.min(options.limit ?? 20, MAX_NOTIFICATIONS_PER_USER);
  const offset = options.offset ?? 0;

  try {
    // Get total count
    const total = await redis.llen(key);

    // Get paginated results
    const end = offset + limit - 1;
    const results = await redis.lrange(key, offset, end);

    const notifications = results.map((item) => JSON.parse(item) as Notification);

    return { notifications, total };
  } catch (error) {
    console.error(`Error fetching notification history for user ${userId}:`, error);
    return { notifications: [], total: 0 };
  }
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const key = `${NOTIFICATIONS_PREFIX}${userId}`;

  try {
    const results = await redis.lrange(key, 0, -1);

    for (let i = 0; i < results.length; i++) {
      const notification = JSON.parse(results[i]) as Notification;

      if (notification.id === notificationId) {
        notification.readAt = new Date().toISOString();
        await redis.lset(key, i, JSON.stringify(notification));
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error marking notification as read:`, error);
    return false;
  }
}

/**
 * Deletes a notification from history
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const key = `${NOTIFICATIONS_PREFIX}${userId}`;

  try {
    const results = await redis.lrange(key, 0, -1);

    for (const item of results) {
      const notification = JSON.parse(item) as Notification;

      if (notification.id === notificationId) {
        await redis.lrem(key, 1, item);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error deleting notification:`, error);
    return false;
  }
}

/**
 * Clears all notifications for a user
 */
export async function clearNotificationHistory(userId: string): Promise<boolean> {
  const key = `${NOTIFICATIONS_PREFIX}${userId}`;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Error clearing notification history for user ${userId}:`, error);
    return false;
  }
}

/**
 * Gets unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const key = `${NOTIFICATIONS_PREFIX}${userId}`;

  try {
    const results = await redis.lrange(key, 0, -1);
    let unreadCount = 0;

    for (const item of results) {
      const notification = JSON.parse(item) as Notification;
      if (!notification.readAt) {
        unreadCount++;
      }
    }

    return unreadCount;
  } catch (error) {
    console.error(`Error getting unread count for user ${userId}:`, error);
    return 0;
  }
}
