/**
 * Message Debouncer Service
 *
 * Handles buffering of WhatsApp messages with debouncing to prevent
 * issues when users send multiple messages during AI response generation.
 *
 * Core pattern:
 * - Buffer incoming messages per phone number in Redis
 * - Wait for debounce window (2-3s) before processing
 * - Process all buffered messages in a single AI call
 * - Track generation state to prevent concurrent processing
 */

import { redis } from "./redis";
import { whatsappClient } from "./whatsapp";

// Configuration
const DEBOUNCE_WINDOW_MS = 2500; // 2.5 seconds between messages
const MAX_BUFFER_TIME_MS = 10000; // Maximum 10 seconds before forcing processing
const BUFFER_TTL_SECONDS = 60; // Redis TTL for buffer data

// Redis key prefixes
const BUFFER_KEY_PREFIX = "msg_buffer:";
const GENERATION_KEY_PREFIX = "generation:";
const TIMER_KEY_PREFIX = "timer:";

// In-memory timers (Node.js specific - Redis for state, timers in memory)
const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Message buffer structure stored in Redis
 */
export interface MessageBuffer {
  phone: string;
  messages: BufferedMessage[];
  firstMessageTime: number;
  lastMessageTime: number;
  generationInProgress: boolean;
  currentGenerationId: string | null;
}

export interface BufferedMessage {
  id: string;
  content: string;
  timestamp: number;
  type: "text" | "interactive";
  interactiveId?: string;
}

/**
 * Get the message buffer for a phone number
 */
async function getBuffer(phone: string): Promise<MessageBuffer | null> {
  const key = `${BUFFER_KEY_PREFIX}${phone}`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as MessageBuffer;
}

/**
 * Save the message buffer for a phone number
 */
async function saveBuffer(phone: string, buffer: MessageBuffer): Promise<void> {
  const key = `${BUFFER_KEY_PREFIX}${phone}`;
  await redis.set(key, JSON.stringify(buffer), BUFFER_TTL_SECONDS);
}

/**
 * Clear the message buffer for a phone number
 */
async function clearBuffer(phone: string): Promise<void> {
  const key = `${BUFFER_KEY_PREFIX}${phone}`;
  await redis.del(key);
}

/**
 * Check if generation is in progress for a phone number
 */
export async function isGenerationInProgress(phone: string): Promise<boolean> {
  const key = `${GENERATION_KEY_PREFIX}${phone}`;
  return await redis.exists(key);
}

/**
 * Mark generation as in progress
 */
async function setGenerationInProgress(
  phone: string,
  generationId: string
): Promise<void> {
  const key = `${GENERATION_KEY_PREFIX}${phone}`;
  // Generation lock with 60s TTL as safety (should be cleared on completion)
  await redis.set(key, generationId, 60);
}

/**
 * Clear generation in progress flag
 */
export async function clearGenerationInProgress(phone: string): Promise<void> {
  const key = `${GENERATION_KEY_PREFIX}${phone}`;
  await redis.del(key);
}

/**
 * Get the current generation ID
 */
async function getGenerationId(phone: string): Promise<string | null> {
  const key = `${GENERATION_KEY_PREFIX}${phone}`;
  return await redis.get(key);
}

/**
 * Generate a unique generation ID
 */
function generateGenerationId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Clear the debounce timer for a phone number
 */
function clearDebounceTimer(phone: string): void {
  const timer = debounceTimers.get(phone);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(phone);
  }
}

/**
 * Add a message to the buffer and start/reset debounce timer
 *
 * Returns:
 * - `shouldProcess: true` if the buffer should be processed now (timeout or max time reached)
 * - `shouldProcess: false` if still waiting for more messages
 * - `messages` contains all buffered messages when shouldProcess is true
 */
export async function bufferMessage(
  phone: string,
  message: BufferedMessage,
  onDebounceExpired: (
    phone: string,
    messages: BufferedMessage[],
    generationId: string
  ) => Promise<void>
): Promise<{
  buffered: boolean;
  isFirstMessage: boolean;
}> {
  const now = Date.now();

  // Get existing buffer or create new one
  let buffer = await getBuffer(phone);
  const isFirstMessage = !buffer || buffer.messages.length === 0;

  if (!buffer) {
    buffer = {
      phone,
      messages: [],
      firstMessageTime: now,
      lastMessageTime: now,
      generationInProgress: false,
      currentGenerationId: null,
    };
  }

  // Add message to buffer
  buffer.messages.push(message);
  buffer.lastMessageTime = now;

  // Save updated buffer
  await saveBuffer(phone, buffer);

  // Clear existing timer
  clearDebounceTimer(phone);

  // Calculate time since first message
  const timeSinceFirst = now - buffer.firstMessageTime;

  // If max buffer time exceeded, process immediately
  if (timeSinceFirst >= MAX_BUFFER_TIME_MS) {
    console.log(
      `⏰ Max buffer time reached for ${phone}, processing ${buffer.messages.length} messages`
    );
    await processBuffer(phone, onDebounceExpired);
    return { buffered: true, isFirstMessage };
  }

  // Set new debounce timer
  const timer = setTimeout(async () => {
    console.log(
      `⏱️ Debounce timer expired for ${phone}, processing buffered messages`
    );
    debounceTimers.delete(phone);
    await processBuffer(phone, onDebounceExpired);
  }, DEBOUNCE_WINDOW_MS);

  debounceTimers.set(phone, timer);

  console.log(
    `📥 Buffered message for ${phone} (${buffer.messages.length} in buffer, waiting ${DEBOUNCE_WINDOW_MS}ms)`
  );

  return { buffered: true, isFirstMessage };
}

/**
 * Process the buffered messages for a phone number
 */
async function processBuffer(
  phone: string,
  onDebounceExpired: (
    phone: string,
    messages: BufferedMessage[],
    generationId: string
  ) => Promise<void>
): Promise<void> {
  const buffer = await getBuffer(phone);

  if (!buffer || buffer.messages.length === 0) {
    console.log(`⚠️ No messages to process for ${phone}`);
    return;
  }

  // Check if generation is already in progress
  if (await isGenerationInProgress(phone)) {
    console.log(
      `⏳ Generation already in progress for ${phone}, keeping messages buffered`
    );
    // Re-schedule check after debounce window
    const timer = setTimeout(async () => {
      debounceTimers.delete(phone);
      await processBuffer(phone, onDebounceExpired);
    }, DEBOUNCE_WINDOW_MS);
    debounceTimers.set(phone, timer);
    return;
  }

  // Generate new generation ID
  const generationId = generateGenerationId();

  // Mark generation in progress
  await setGenerationInProgress(phone, generationId);

  // Get messages and clear buffer
  const messages = [...buffer.messages];
  await clearBuffer(phone);

  console.log(
    `🚀 Processing ${messages.length} buffered message(s) for ${phone} (gen: ${generationId})`
  );

  // Call the processing callback
  try {
    await onDebounceExpired(phone, messages, generationId);
  } catch (error) {
    console.error(`❌ Error processing buffered messages for ${phone}:`, error);
  } finally {
    // Clear generation flag on completion (success or error)
    await clearGenerationInProgress(phone);
  }
}

/**
 * Cancel current generation and invalidate its ID
 * Used when new messages arrive that should supersede the current generation
 */
export async function cancelGeneration(phone: string): Promise<boolean> {
  const currentId = await getGenerationId(phone);
  if (currentId) {
    await clearGenerationInProgress(phone);
    console.log(`🛑 Cancelled generation ${currentId} for ${phone}`);
    return true;
  }
  return false;
}

/**
 * Check if a generation ID is still valid (hasn't been cancelled)
 */
export async function isGenerationValid(
  phone: string,
  generationId: string
): Promise<boolean> {
  const currentId = await getGenerationId(phone);
  return currentId === generationId;
}

/**
 * Send typing indicator for a phone number
 * This is called immediately when the first message arrives
 */
export async function sendTypingIndicator(
  phone: string,
  messageId: string
): Promise<void> {
  try {
    // Mark message as read and show typing indicator
    await whatsappClient.markAsRead(messageId, true);
    console.log(`⌨️ Typing indicator sent for ${phone}`);
  } catch (error) {
    console.error(`❌ Error sending typing indicator for ${phone}:`, error);
  }
}

/**
 * Combine multiple buffered messages into a single message string
 * This is useful for sending to the AI as a single input
 */
export function combineMessages(messages: BufferedMessage[]): string {
  if (messages.length === 1) {
    return messages[0].content;
  }

  // Join messages with newlines, preserving order
  return messages.map((m) => m.content).join("\n");
}

