"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Bell,
  MonitorSmartphone,
  Smartphone,
  Loader2,
} from "lucide-react";
import type { UserPreferences } from "@/lib/types/notifications";

interface PreferencesFormProps {
  preferences: UserPreferences | null;
  isLoading: boolean;
  isSaving: boolean;
  onUpdateChannel: (
    channel: keyof UserPreferences["channels"],
    enabled: boolean,
  ) => void;
  onUpdateCategory: (
    category: keyof UserPreferences["categories"],
    enabled: boolean,
  ) => void;
  onUpdateQuietHours: (quietHours: UserPreferences["quietHours"]) => void;
  onUpdateFrequency: (frequency: UserPreferences["frequency"]) => void;
  className?: string;
}

const channelConfig = [
  {
    key: "email" as const,
    label: "Email",
    description: "Receive via email",
    Icon: Mail,
  },
  {
    key: "push" as const,
    label: "Push",
    description: "Browser push notifications",
    Icon: Bell,
  },
  {
    key: "sms" as const,
    label: "SMS",
    description: "Text messages",
    Icon: Smartphone,
  },
  {
    key: "inApp" as const,
    label: "In-App",
    description: "Real-time in-app alerts",
    Icon: MonitorSmartphone,
  },
];

const categoryConfig = [
  {
    key: "security" as const,
    label: "Security",
    description: "Login alerts, password changes",
  },
  {
    key: "updates" as const,
    label: "Updates",
    description: "Product updates and changelog",
  },
  {
    key: "social" as const,
    label: "Social",
    description: "Mentions, follows, messages",
  },
  {
    key: "marketing" as const,
    label: "Marketing",
    description: "Promotions and newsletters",
  },
  {
    key: "reminders" as const,
    label: "Reminders",
    description: "Scheduled reminders and tasks",
  },
];

const frequencyOptions: {
  value: UserPreferences["frequency"];
  label: string;
}[] = [
  { value: "realtime", label: "Real-time" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export function PreferencesForm({
  preferences,
  isLoading,
  isSaving,
  onUpdateChannel,
  onUpdateCategory,
  onUpdateQuietHours,
  onUpdateFrequency,
  className,
}: PreferencesFormProps) {
  if (isLoading || !preferences) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Channels */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">Channels</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Choose how you receive notifications
        </p>
        <div className="space-y-1">
          {channelConfig.map(({ key, label, description, Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                checked={preferences.channels[key]}
                onCheckedChange={(checked) => onUpdateChannel(key, checked)}
                disabled={isSaving}
                size="sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Categories
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Select which types of notifications to receive
        </p>
        <div className="space-y-1">
          {categoryConfig.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={preferences.categories[key]}
                onCheckedChange={(checked) => onUpdateCategory(key, checked)}
                disabled={isSaving}
                size="sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Quiet Hours */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Quiet Hours
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Pause non-critical notifications during these hours
        </p>
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Enable Quiet Hours
            </p>
            <Switch
              checked={preferences.quietHours?.enabled ?? false}
              onCheckedChange={(enabled) =>
                onUpdateQuietHours({
                  enabled,
                  start: preferences.quietHours?.start ?? "22:00",
                  end: preferences.quietHours?.end ?? "08:00",
                  timezone: preferences.quietHours?.timezone ?? "UTC",
                })
              }
              disabled={isSaving}
              size="sm"
            />
          </div>
          {preferences.quietHours?.enabled && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <Label className="text-xs mb-1">Start</Label>
                <Input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) =>
                    onUpdateQuietHours({
                      ...preferences.quietHours!,
                      start: e.target.value,
                    })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1">End</Label>
                <Input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) =>
                    onUpdateQuietHours({
                      ...preferences.quietHours!,
                      end: e.target.value,
                    })
                  }
                  disabled={isSaving}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Frequency */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Digest Frequency
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          How often to receive notification digests
        </p>
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-border p-1">
          {frequencyOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onUpdateFrequency(value)}
              disabled={isSaving}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                "disabled:opacity-50",
                preferences.frequency === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Saving indicator */}
      {isSaving && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
          <Loader2 className="size-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
