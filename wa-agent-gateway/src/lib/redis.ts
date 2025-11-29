import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis client
const client = createClient({
  url: REDIS_URL,
});

// Handle connection events
client.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

client.on("connect", () => {
  console.log("✅ Connected to Redis");
});

client.on("reconnecting", () => {
  console.log("🔄 Reconnecting to Redis...");
});

// Connect to Redis
client.connect().catch((err) => {
  console.error("❌ Failed to connect to Redis:", err);
});

/**
 * Redis wrapper with typed methods for session management
 */
export const redis = {
  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return client.get(key);
  },

  /**
   * Set a key-value pair with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  },

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await client.del(key);
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await client.exists(key);
    return result === 1;
  },

  /**
   * Get the underlying client for advanced operations
   */
  getClient() {
    return client;
  },
};

