// RabbitMQ Exchange Configuration
export const NOTIFICATIONS_EXCHANGE = "notifications.exchange";
export const NOTIFICATIONS_EXCHANGE_TYPE = "topic" as const;

// Queue Configuration
export const NOTIFICATIONS_QUEUE = "notifications.queue";
export const NOTIFICATIONS_DLQ = "notifications.dlq";
export const NOTIFICATIONS_DLX = "notifications.dlx"; // Dead Letter Exchange

// Routing Keys
export const ROUTING_KEYS = {
  EMAIL: "notification.email",
  PUSH: "notification.push",
  IN_APP: "notification.in-app",
  // Wildcard patterns for subscribing
  ALL: "notification.*",
} as const;

export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

// Queue Options
export const QUEUE_OPTIONS = {
  main: {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": NOTIFICATIONS_DLX,
      "x-dead-letter-routing-key": "dead-letter",
    },
  },
  dlq: {
    durable: true,
    arguments: {
      "x-message-ttl": 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
} as const;
