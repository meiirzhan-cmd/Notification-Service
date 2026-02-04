export interface NotificationChannel {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface NotificationCategory {
  marketing: boolean;
  updates: boolean;
  security: boolean;
  social: boolean;
  reminders: boolean;
}

export interface UserPreferences {
  userId: string;
  channels: NotificationChannel;
  categories: NotificationCategory;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  updatedAt: string;
}

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'userId' | 'updatedAt'> = {
  channels: {
    email: true,
    push: true,
    sms: false,
    inApp: true,
  },
  categories: {
    marketing: false,
    updates: true,
    security: true,
    social: true,
    reminders: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
  frequency: 'realtime',
};
