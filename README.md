# Notification Service

A real-time notification system built with **Next.js 16**, **RabbitMQ**, **Redis**, and **Server-Sent Events (SSE)**. Features a demo dashboard for sending, receiving, and managing notifications with live streaming, user preferences, and Docker deployment.

![Dashboard](screenshots/localhost_dashboard.png)

## Tech Stack

| Layer            | Technology                                       |
| ---------------- | ------------------------------------------------ |
| Framework        | Next.js 16 (App Router, React 19)                |
| Message Queue    | RabbitMQ 3 (exchange + queue with routing keys)  |
| Cache/Store      | Redis 7 (notification history + preferences)     |
| State            | Zustand 5                                        |
| Real-time        | Server-Sent Events (SSE)                         |
| Reverse Proxy    | nginx (rate limiting, SSE headers)               |
| UI               | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide     |
| Containerization | Docker Compose                                   |

## Architecture

```text
  Browser (React)                             Server (Next.js)
 ┌────────────────┐                          ┌──────────────────────────┐
 │ AdminSendPanel │─── POST /api/send ──────>│ publisher.ts             │
 │                │                          │   └─> RabbitMQ Exchange  │
 │                │                          │          │               │
 │                │                          │          ▼               │
 │                │                          │   consumer.ts            │
 │                │                          │   (instrumentation.ts)   │
 │                │                          │     ├─> Preference check │
 │                │                          │     ├─> SSE Stream ──┐   │
 │                │                          │     └─> Redis Store  │   │
 │                │                          │                      │   │
 │  useSSE hook  <│── GET /api/stream (SSE) <┤   streamManager.ts <─┘   │
 │   │            │                          │                         │
 │   ▼            │                          │                         │
 │  Zustand Store │── GET /api/history ─────>│ Redis (notification list)│
 │   │            │                          └──────────────────────────┘
 │   ▼            │
 │  NotificationPanel, Toasts, Bell badge    │
 └────────────────┘
```

**Data flows through three update paths:**

1. **Optimistic** - Notification appears instantly after send (local store update)
2. **SSE** - Consumer streams processed notification back to the browser (~100ms)
3. **Refresh** - Re-fetches from Redis as a fallback (1.5s delayed after send)

## Project Structure

```text
notification-service/
├── app/
│   ├── api/
│   │   ├── notifications/
│   │   │   ├── send/route.ts          # POST - Publish to RabbitMQ
│   │   │   ├── stream/route.ts        # GET  - SSE endpoint
│   │   │   └── history/route.ts       # GET/PATCH/DELETE - CRUD from Redis
│   │   ├── preferences/route.ts       # GET/PUT/DELETE - User preferences
│   │   ├── admin/
│   │   │   ├── stats/route.ts         # Queue & connection stats
│   │   │   └── cache/route.ts         # Redis cache viewer
│   │   └── health/route.ts            # Health check (Redis + RabbitMQ)
│   └── dashboard/
│       ├── page.tsx                   # Dashboard page (server component)
│       ├── DashboardClient.tsx        # Client wrapper
│       └── _components/              # Dashboard panels
│           ├── AdminSendPanel.tsx     # Send test notifications
│           ├── QueueStats.tsx         # SSE status, counts
│           ├── ConnectionMonitor.tsx  # Live SSE connections
│           ├── CacheViewer.tsx        # Redis cache inspector
│           ├── PreferencesPanel.tsx   # User preference controls
│           ├── DashboardHeader.tsx    # Header with bell + panel
│           └── DashboardCard.tsx      # Reusable card wrapper
├── components/
│   ├── notifications/
│   │   ├── NotificationSetup.tsx      # Headless SSE + store wiring
│   │   ├── NotificationBell.tsx       # Bell icon with unread badge
│   │   ├── NotificationPanel.tsx      # Dropdown notification list
│   │   ├── NotificationItem.tsx       # Single notification row
│   │   ├── NotificationToast.tsx      # Toast popups
│   │   ├── ConnectionStatus.tsx       # SSE connection indicator
│   │   └── PreferencesForm.tsx        # Preferences UI form
│   └── ui/                           # shadcn/ui primitives
├── hooks/
│   └── useSSE.ts                     # EventSource hook with auto-reconnect
├── stores/
│   └── notification.ts               # Zustand store (notifications, prefs, SSE)
├── lib/
│   ├── notifications/
│   │   ├── publisher.ts              # Publish to RabbitMQ exchange
│   │   ├── consumer.ts               # Consume from queue, process, stream
│   │   ├── streamManager.ts          # SSE client registry (globalThis)
│   │   ├── setup.ts                  # Exchange/queue/binding setup
│   │   ├── constants.ts              # Queue names, routing keys
│   │   └── types.ts                  # Notification types
│   ├── services/
│   │   ├── notificationStore.ts      # Redis CRUD for notifications
│   │   └── userPreferences.ts        # Redis CRUD for preferences
│   ├── rabbitmq.ts                   # RabbitMQ connection singleton
│   ├── redis.ts                      # Redis connection singleton
│   └── types/
│       └── notifications.ts          # UserPreferences, defaults
├── nginx/
│   └── nginx.conf                    # Reverse proxy, rate limiting, SSE
├── instrumentation.ts                # Starts consumer on server boot
├── proxy.ts                          # Next.js 16 proxy (request logging)
├── Dockerfile                        # Multi-stage build (standalone)
├── docker-compose.yml                # Full stack orchestration
└── .env                              # Environment variables
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Start Infrastructure (RabbitMQ + Redis)

```bash
docker compose up rabbitmq redis -d
```

Wait for healthy status:

```bash
docker compose ps
```

### 2. Configure Environment

Copy and adjust the `.env` file if needed:

```env
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
REDIS_URL=redis://:redis123@localhost:6379
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### Full Docker Deployment

To run everything in Docker (app + nginx + RabbitMQ + Redis):

```bash
docker compose up --build -d
```

Access via nginx at [http://localhost](http://localhost) or directly at [http://localhost:3000](http://localhost:3000).

## Dashboard Features

### Send Test Notification

Publish notifications to RabbitMQ with configurable **type** (email, push, in-app), **category** (updates, security, social, marketing, reminders), title, and body.

### Live Connections

Monitor active SSE connections in real-time. Shows connected user IDs with green indicators.

### Notification Panel

Click the bell icon to see all notifications. Supports mark as read, delete, and load more (paginated from Redis).

### Queue Statistics

Displays SSE connection status, notifications loaded count, total in history, and unread count.

### Redis Cache

View Redis connection status, memory usage, key count, and cached keys.

### User Preferences

Configure notification delivery per user:

- **Channels** - Enable/disable email, push, SMS, in-app
- **Categories** - Toggle updates, security, social, marketing, reminders
- **Quiet Hours** - Set timezone-aware do-not-disturb windows
- **Digest Frequency** - Real-time, hourly, daily, or weekly

## API Endpoints

| Method   | Endpoint                     | Description                      |
| -------- | ---------------------------- | -------------------------------- |
| `POST`   | `/api/notifications/send`    | Publish notification to RabbitMQ |
| `GET`    | `/api/notifications/stream`  | SSE stream (`?userId=...`)       |
| `GET`    | `/api/notifications/history` | Fetch notification history       |
| `PATCH`  | `/api/notifications/history` | Mark notification as read        |
| `DELETE` | `/api/notifications/history` | Delete a notification            |
| `GET`    | `/api/preferences`           | Get user preferences             |
| `PUT`    | `/api/preferences`           | Update user preferences          |
| `DELETE` | `/api/preferences`           | Reset preferences to defaults    |
| `GET`    | `/api/admin/stats`           | Queue & connection statistics    |
| `GET`    | `/api/admin/cache`           | Redis cache info                 |
| `GET`    | `/api/health`                | Health check (Redis + RabbitMQ)  |

## How It Works

### Publishing

When a notification is sent via the dashboard or API, the publisher creates a `Notification` object, wraps it in a payload with a routing key (`notification.email`, `notification.push`, or `notification.in-app`), and publishes it to the RabbitMQ topic exchange.

### Consuming

The consumer runs automatically on server boot (via `instrumentation.ts`). For each message it:

1. Fetches the user's preferences from Redis
2. Checks if the channel and category are enabled
3. Checks quiet hours (security notifications bypass quiet hours)
4. Executes the type-specific handler
5. Streams the notification to the user's SSE connection (if connected)
6. Stores the notification in Redis for history

### Real-time Delivery (SSE)

The `/api/notifications/stream` endpoint creates a `ReadableStream` per user. The `streamManager` maintains a global `Map<userId, StreamController>` using `globalThis` to share state across Next.js module contexts. A heartbeat is sent every 30 seconds to keep connections alive.

### Client State (Zustand)

A single Zustand store manages all client state: notifications list, unread count, pagination, user preferences, and SSE connection status. The `NotificationSetup` component wires SSE events into the store and triggers toast popups.

## Docker Services

| Service    | Port(s)     | Description                       |
| ---------- | ----------- | --------------------------------- |
| `rabbitmq` | 5672, 15672 | Message queue + management UI     |
| `redis`    | 6379        | Cache & notification storage      |
| `app`      | 3000        | Next.js application (standalone)  |
| `nginx`    | 80          | Reverse proxy with rate limiting  |

### nginx Rate Limiting

| Zone          | Rate  | Applies to                  |
| ------------- | ----- | --------------------------- |
| `api_general` | 30r/s | All API routes              |
| `api_send`    | 10r/s | `/api/notifications/send`   |
| `api_sse`     | 5r/s  | `/api/notifications/stream` |

## Environment Variables

| Variable         | Default                                | Description         |
| ---------------- | -------------------------------------- | ------------------- |
| `RABBITMQ_URL`   | `amqp://admin:admin123@localhost:5672` | RabbitMQ connection |
| `RABBITMQ_USER`  | `admin`                                | RabbitMQ username   |
| `RABBITMQ_PASS`  | `admin123`                             | RabbitMQ password   |
| `REDIS_URL`      | `redis://:redis123@localhost:6379`     | Redis connection    |
| `REDIS_PASSWORD` | `redis123`                             | Redis password      |
| `NODE_ENV`       | `development`                          | Environment         |
| `PORT`           | `3000`                                 | Application port    |
