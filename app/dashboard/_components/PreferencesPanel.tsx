"use client";

import { PreferencesForm } from "@/components/notifications";
import { useUserPreferences } from "@/contexts/NotificationContext";
import { Settings } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

export function PreferencesPanel() {
  const {
    preferences,
    isLoading,
    isSaving,
    updateChannel,
    updateCategory,
    updateQuietHours,
    updateFrequency,
  } = useUserPreferences();

  return (
    <DashboardCard title="User Preferences" icon={Settings}>
      <PreferencesForm
        preferences={preferences}
        isLoading={isLoading}
        isSaving={isSaving}
        onUpdateChannel={updateChannel}
        onUpdateCategory={updateCategory}
        onUpdateQuietHours={updateQuietHours}
        onUpdateFrequency={updateFrequency}
      />
    </DashboardCard>
  );
}
