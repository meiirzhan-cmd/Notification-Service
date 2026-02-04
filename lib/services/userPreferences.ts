import redis from "@/lib/redis";
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  NotificationChannel,
  NotificationCategory,
} from "@/lib/types/notifications";

const CACHE_PREFIX = "user:preferences:";
const CACHE_TTL = 3600; // 1 hour in seconds
const NOTIFICATION_SETTINGS_KEY = "notification:settings:global";

/**
 * Get user preferences from Redis cache
 * Returns default preferences if user has no stored preferences
 */
export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const cacheKey = `${CACHE_PREFIX}${userId}`;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as UserPreferences;
    }

    // Return default preferences for new users
    const defaultPrefs: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      userId,
      updatedAt: new Date().toISOString(),
    };

    return defaultPrefs;
  } catch (error) {
    console.error(`Error fetching preferences for user ${userId}:`, error);
    // Return defaults on error to ensure service continuity
    return {
      ...DEFAULT_PREFERENCES,
      userId,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Set user preferences in Redis cache
 */
export async function setUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, "userId" | "updatedAt">>,
): Promise<UserPreferences> {
  const cacheKey = `${CACHE_PREFIX}${userId}`;

  try {
    // Get existing preferences to merge with updates
    const existing = await getUserPreferences(userId);

    const updatedPrefs: UserPreferences = {
      ...existing,
      ...preferences,
      channels: {
        ...existing.channels,
        ...preferences.channels,
      },
      categories: {
        ...existing.categories,
        ...preferences.categories,
      },
      quietHours: preferences.quietHours ?? existing.quietHours,
      userId,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(cacheKey, JSON.stringify(updatedPrefs), "EX", CACHE_TTL);

    return updatedPrefs;
  } catch (error) {
    console.error(`Error setting preferences for user ${userId}:`, error);
    throw new Error("Failed to save user preferences");
  }
}

/**
 * Cache global notification settings
 * Stores available channels, categories, and system-wide defaults
 */
export async function cacheNotificationSettings(): Promise<void> {
  const settings = {
    availableChannels: [
      "email",
      "push",
      "sms",
      "inApp",
    ] as (keyof NotificationChannel)[],
    availableCategories: [
      "marketing",
      "updates",
      "security",
      "social",
      "reminders",
    ] as (keyof NotificationCategory)[],
    defaults: DEFAULT_PREFERENCES,
    frequencyOptions: ["realtime", "hourly", "daily", "weekly"],
    cachedAt: new Date().toISOString(),
  };

  try {
    await redis.set(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    console.log("Notification settings cached successfully");
  } catch (error) {
    console.error("Error caching notification settings:", error);
    throw new Error("Failed to cache notification settings");
  }
}

/**
 * Get cached notification settings
 */
export async function getNotificationSettings(): Promise<{
  availableChannels: (keyof NotificationChannel)[];
  availableCategories: (keyof NotificationCategory)[];
  defaults: typeof DEFAULT_PREFERENCES;
  frequencyOptions: string[];
  cachedAt: string;
} | null> {
  try {
    const cached = await redis.get(NOTIFICATION_SETTINGS_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return null;
  }
}

/**
 * Delete user preferences from cache
 */
export async function deleteUserPreferences(userId: string): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX}${userId}`;

  try {
    const result = await redis.del(cacheKey);
    return result === 1;
  } catch (error) {
    console.error(`Error deleting preferences for user ${userId}:`, error);
    return false;
  }
}
