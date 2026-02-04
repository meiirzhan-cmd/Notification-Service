import type { NotificationCategory } from "@/lib/types/notifications";

export type NotificationType = "email" | "push" | "in-app";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  category: keyof NotificationCategory;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

export interface NotificationPayload {
  notification: Notification;
  routingKey: string;
  timestamp: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  category: keyof NotificationCategory;
  metadata?: Record<string, unknown>;
}
