"use client";

import { PreferencesForm } from "@/components/notifications";
import { useNotificationStore } from "@/stores/notification";
import { Settings } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

const DEMO_USER_ID = "demo-user-001";

export function PreferencesPanel() {
  const preferences = useNotificationStore((s) => s.preferences);
  const isLoading = useNotificationStore((s) => s.preferencesLoading);
  const isSaving = useNotificationStore((s) => s.preferencesSaving);
  const updateChannel = useNotificationStore((s) => s.updateChannel);
  const updateCategory = useNotificationStore((s) => s.updateCategory);
  const updateQuietHours = useNotificationStore((s) => s.updateQuietHours);
  const updateFrequency = useNotificationStore((s) => s.updateFrequency);

  return (
    <DashboardCard title="User Preferences" icon={Settings}>
      <PreferencesForm
        preferences={preferences}
        isLoading={isLoading}
        isSaving={isSaving}
        onUpdateChannel={(channel, enabled) =>
          updateChannel(DEMO_USER_ID, channel, enabled)
        }
        onUpdateCategory={(category, enabled) =>
          updateCategory(DEMO_USER_ID, category, enabled)
        }
        onUpdateQuietHours={(quietHours) =>
          updateQuietHours(DEMO_USER_ID, quietHours)
        }
        onUpdateFrequency={(frequency) =>
          updateFrequency(DEMO_USER_ID, frequency)
        }
      />
    </DashboardCard>
  );
}
