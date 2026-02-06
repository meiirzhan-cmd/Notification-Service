"use client";

import { useState, useCallback, useEffect } from "react";
import type { UserPreferences } from "@/lib/types/notifications";

export interface UsePreferencesOptions {
  userId: string;
  autoFetch?: boolean;
}

export interface PreferencesUpdate {
  channels?: Partial<UserPreferences["channels"]>;
  categories?: Partial<UserPreferences["categories"]>;
  quietHours?: UserPreferences["quietHours"];
  frequency?: UserPreferences["frequency"];
}

export interface UsePreferencesReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (updates: PreferencesUpdate) => Promise<boolean>;
  updateChannel: (channel: keyof UserPreferences["channels"], enabled: boolean) => Promise<boolean>;
  updateCategory: (category: keyof UserPreferences["categories"], enabled: boolean) => Promise<boolean>;
  updateQuietHours: (quietHours: UserPreferences["quietHours"]) => Promise<boolean>;
  updateFrequency: (frequency: UserPreferences["frequency"]) => Promise<boolean>;
  resetPreferences: () => Promise<boolean>;
  clearError: () => void;
}

export function usePreferences(options: UsePreferencesOptions): UsePreferencesReturn {
  const { userId, autoFetch = true } = options;

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/preferences?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch preferences");
      }

      setPreferences(data.preferences);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch preferences";
      setError(message);
      console.error("Error fetching preferences:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updatePreferences = useCallback(
    async (updates: PreferencesUpdate): Promise<boolean> => {
      if (!userId) return false;

      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...updates }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update preferences");
        }

        setPreferences(data.preferences);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update preferences";
        setError(message);
        console.error("Error updating preferences:", err);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  const updateChannel = useCallback(
    async (channel: keyof UserPreferences["channels"], enabled: boolean): Promise<boolean> => {
      return updatePreferences({
        channels: { [channel]: enabled },
      });
    },
    [updatePreferences]
  );

  const updateCategory = useCallback(
    async (category: keyof UserPreferences["categories"], enabled: boolean): Promise<boolean> => {
      return updatePreferences({
        categories: { [category]: enabled },
      });
    },
    [updatePreferences]
  );

  const updateQuietHours = useCallback(
    async (quietHours: UserPreferences["quietHours"]): Promise<boolean> => {
      return updatePreferences({ quietHours });
    },
    [updatePreferences]
  );

  const updateFrequency = useCallback(
    async (frequency: UserPreferences["frequency"]): Promise<boolean> => {
      return updatePreferences({ frequency });
    },
    [updatePreferences]
  );

  const resetPreferences = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setIsSaving(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/preferences?${params}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset preferences");
      }

      // Fetch the default preferences after reset
      await fetchPreferences();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset preferences";
      setError(message);
      console.error("Error resetting preferences:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId, fetchPreferences]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId) {
      fetchPreferences();
    }
  }, [userId, autoFetch, fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    isSaving,
    fetchPreferences,
    updatePreferences,
    updateChannel,
    updateCategory,
    updateQuietHours,
    updateFrequency,
    resetPreferences,
    clearError,
  };
}
