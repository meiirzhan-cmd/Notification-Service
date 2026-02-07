export interface SSEConnection {
  userId: string;
  connectedAt: string;
  lastActivity: string;
}

export interface AdminStats {
  sse: { connectionCount: number; connections: SSEConnection[] };
  redis: {
    status: string;
    usedMemory: string | null;
    connectedClients: string | null;
    keyCount: number;
    cachedPreferencesKeys: string[];
  };
  timestamp: string;
}
