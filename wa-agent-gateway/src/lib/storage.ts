/**
 * Storage layer for conversation and message persistence
 *
 * Uses Supabase (via Drizzle) as the source of truth,
 * with Redis as a caching layer for fast lookups.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  patients,
  conversations,
  messages,
  type User,
  type Conversation,
  type NewConversation,
  type NewMessage,
} from "./schema";
import { redis } from "./redis";
import { v4 as uuidv4 } from "uuid";

// Cache TTL in seconds (24 hours)
const CACHE_TTL = 86400;

// Redis key prefixes
const THREAD_KEY_PREFIX = "thread-chat_id:";
const ACTION_KEY_PREFIX = "action-thread_id:";
const USER_KEY_PREFIX = "user-phone:";

// ============================================
// USER QUERIES
// ============================================

/**
 * Get user by phone number
 * Checks Redis cache first, then queries Supabase
 */
export async function getUserByPhone(phone: string): Promise<User | null> {
  // Normalize phone (remove + if present for consistency)
  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const cacheKey = `${USER_KEY_PREFIX}${normalizedPhone}`;

  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as User;
    } catch {
      // Invalid cache, continue to DB query
    }
  }

  // Query Supabase - try both with and without + prefix
  const result = await db
    .select()
    .from(users)
    .where(eq(users.phone, normalizedPhone))
    .limit(1);

  if (result.length === 0) {
    // Try without + prefix
    const altResult = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone.replace(/^\+/, "")))
      .limit(1);

    if (altResult.length === 0) {
      return null;
    }

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(altResult[0]), CACHE_TTL);
    return altResult[0];
  }

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(result[0]), CACHE_TTL);
  return result[0];
}

/**
 * Get patient ID by phone number
 * Looks up user first, then checks if they're a patient
 */
export async function getPatientIdByPhone(phone: string): Promise<string | null> {
  const user = await getUserByPhone(phone);
  if (!user) return null;

  // Check if user is a patient
  const patient = await db
    .select()
    .from(patients)
    .where(eq(patients.id, user.id))
    .limit(1);

  return patient.length > 0 ? patient[0].id : null;
}

// ============================================
// CONVERSATION QUERIES
// ============================================

/**
 * Get or create a conversation for a phone number
 * Returns existing active conversation or creates a new one
 */
export async function getOrCreateConversation(
  phone: string
): Promise<{ conversation: Conversation; isNew: boolean }> {
  const cacheKey = `${THREAD_KEY_PREFIX}${phone}`;

  // Check Redis cache for thread ID
  const cachedThreadId = await redis.get(cacheKey);

  if (cachedThreadId) {
    // Try to find the conversation
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.threadId, cachedThreadId),
          eq(conversations.status, "active")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { conversation: existing[0], isNew: false };
    }
  }

  // Check for existing active conversation in DB
  const existingActive = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.phone, phone), eq(conversations.status, "active"))
    )
    .limit(1);

  if (existingActive.length > 0) {
    // Update Redis cache
    await redis.set(cacheKey, existingActive[0].threadId, CACHE_TTL);
    return { conversation: existingActive[0], isNew: false };
  }

  // Create new conversation
  const threadId = uuidv4();
  const patientId = await getPatientIdByPhone(phone);

  const newConversation: NewConversation = {
    threadId,
    phone,
    patientId,
    channel: "whatsapp",
    status: "active",
    actionType: "chat",
    messageCount: 0,
  };

  const [created] = await db
    .insert(conversations)
    .values(newConversation)
    .returning();

  // Cache the thread ID
  await redis.set(cacheKey, threadId, CACHE_TTL);

  return { conversation: created, isNew: true };
}

/**
 * Get conversation by thread ID
 */
export async function getConversationByThreadId(
  threadId: string
): Promise<Conversation | null> {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.threadId, threadId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update conversation state
 */
export async function updateConversation(
  threadId: string,
  data: Partial<{
    status: "active" | "ended" | "archived";
    actionType: string;
    agentUsed: string;
    messageCount: number;
    summary: string;
    riskLevel: string;
    riskScore: number;
    metadata: Record<string, unknown>;
    endedAt: Date;
  }>
): Promise<Conversation | null> {
  const result = await db
    .update(conversations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(conversations.threadId, threadId))
    .returning();

  return result.length > 0 ? result[0] : null;
}

/**
 * End a conversation
 */
export async function endConversation(threadId: string): Promise<void> {
  await updateConversation(threadId, {
    status: "ended",
    endedAt: new Date(),
  });

  // Clear Redis cache
  const conversation = await getConversationByThreadId(threadId);
  if (conversation) {
    await redis.del(`${THREAD_KEY_PREFIX}${conversation.phone}`);
    await redis.del(`${ACTION_KEY_PREFIX}${threadId}`);
  }
}

/**
 * Increment message count for a conversation
 */
export async function incrementMessageCount(threadId: string): Promise<void> {
  const conversation = await getConversationByThreadId(threadId);
  if (conversation) {
    await updateConversation(threadId, {
      messageCount: conversation.messageCount + 1,
    });
  }
}

// ============================================
// MESSAGE QUERIES
// ============================================

/**
 * Save a message to the database
 */
export async function saveMessage(
  conversationId: string,
  content: string,
  role: "user" | "assistant" | "system",
  options?: {
    externalId?: string;
    agentUsed?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const newMessage: NewMessage = {
    conversationId,
    content,
    role,
    externalId: options?.externalId,
    agentUsed: options?.agentUsed,
    metadata: options?.metadata || {},
  };

  await db.insert(messages).values(newMessage);
}

/**
 * Get messages for a conversation
 */
export async function getMessagesByConversationId(
  conversationId: string,
  limit = 50
): Promise<typeof messages.$inferSelect[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

/**
 * Get recent messages for context (for AI)
 */
export async function getRecentMessages(
  threadId: string,
  limit = 10
): Promise<{ role: string; content: string }[]> {
  const conversation = await getConversationByThreadId(threadId);
  if (!conversation) return [];

  const recentMessages = await db
    .select({
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  // Reverse to get chronological order
  return recentMessages.reverse();
}

// ============================================
// ACTION TYPE MANAGEMENT (using Redis for speed)
// ============================================

/**
 * Get current action type for a thread
 */
export async function getActionType(
  threadId: string
): Promise<string> {
  const cacheKey = `${ACTION_KEY_PREFIX}${threadId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) return cached;

  // Fallback to DB
  const conversation = await getConversationByThreadId(threadId);
  return conversation?.actionType || "chat";
}

/**
 * Set action type for a thread
 */
export async function setActionType(
  threadId: string,
  actionType: string
): Promise<void> {
  const cacheKey = `${ACTION_KEY_PREFIX}${threadId}`;
  
  // Update Redis cache
  await redis.set(cacheKey, actionType, CACHE_TTL);
  
  // Update DB
  await updateConversation(threadId, { actionType });
}

