import type { Request, Response } from "express";
import { whatsappClient } from "./lib/whatsapp";
import { redis } from "./lib/redis";
import { runAndStream, startThread } from "./actions";

// Types for WhatsApp webhook payload
interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{ id: string; status: string; timestamp: string }>;
      };
      field: string;
    }>;
  }>;
}

// Action types matching the multi-agent system
type ActionType = "chat" | "process_data" | "query_data";

/**
 * WhatsApp webhook verification (GET /webhook)
 * Required by Meta to verify the webhook URL
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_SECRET;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed");
    res.sendStatus(403);
  }
}

/**
 * WhatsApp webhook handler (POST /webhook)
 * Processes incoming messages and events
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const body = req.body as WhatsAppWebhookBody;

  // Verify it's a WhatsApp webhook
  if (body.object !== "whatsapp_business_account") {
    res.sendStatus(404);
    return;
  }

  // Process each entry
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;

      // Handle incoming messages
      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          await handleMessage(message);
        }
      }

      // Handle status updates (optional - for delivery receipts)
      if (value.statuses) {
        for (const status of value.statuses) {
          console.log(`📬 Message ${status.id} status: ${status.status}`);
        }
      }
    }
  }

  // Always respond with 200 to acknowledge receipt
  res.sendStatus(200);
}

/**
 * Process an individual WhatsApp message
 */
async function handleMessage(message: WhatsAppMessage): Promise<void> {
  const chatId = message.from;
  const messageId = message.id;
  console.log(`📩 Received message from ${chatId}: ${message.type}`);

  // Mark message as read immediately to trigger typing indicator ("...")
  // This provides visual feedback while the AI processes the message
  await whatsappClient.markAsRead(messageId);

  // Handle text messages
  if (message.type === "text" && message.text?.body) {
    await handleTextMessage(chatId, message.text.body);
  }

  // Handle interactive button replies
  if (message.type === "interactive" && message.interactive?.button_reply) {
    await handleButtonReply(chatId, message.interactive.button_reply.id);
  }

  // Handle interactive list replies
  if (message.type === "interactive" && message.interactive?.list_reply) {
    await handleButtonReply(chatId, message.interactive.list_reply.id);
  }
}

/**
 * Handle text messages from users
 */
async function handleTextMessage(chatId: string, text: string): Promise<void> {
  const threadKey = `thread-chat_id:${chatId}`;
  let threadId = await redis.get(threadKey);

  // Check for start commands
  const startCommands = ["start", "hi", "hello", "hola", "/start"];
  if (startCommands.includes(text.toLowerCase()) || !threadId) {
    // Start a new conversation thread
    const newThreadId = await startThread(chatId);
    await redis.set(threadKey, newThreadId);
    return;
  }

  // Get current action type (default to "chat")
  const actionKey = `action-thread_id:${threadId}`;
  const actionType = ((await redis.get(actionKey)) ?? "chat") as ActionType;

  // Process message through the multi-agent system
  await runAndStream({
    chatId,
    threadId,
    actionType,
    userInput: text,
  });
}

/**
 * Handle button/list reply interactions
 */
async function handleButtonReply(chatId: string, buttonId: string): Promise<void> {
  const threadKey = `thread-chat_id:${chatId}`;
  const threadId = await redis.get(threadKey);

  if (!threadId) {
    await whatsappClient.sendTextMessage(chatId, "No hay conversación activa. Escribe 'hola' para comenzar!");
    return;
  }

  // Map button IDs to action types
  const actionMap: Record<string, ActionType> = {
    action_process: "process_data",
    action_query: "query_data",
    action_help: "chat",
  };

  const actionType = actionMap[buttonId] ?? "chat";

  // Store action type for this thread
  const actionKey = `action-thread_id:${threadId}`;
  await redis.set(actionKey, actionType);

  // Context messages for each action (Spanish)
  const contextMessages: Record<string, string> = {
    process_data: "Quiero agendar una cita",
    query_data: "Quiero consultar mis datos",
    chat: "Necesito ayuda",
  };

  // Trigger the action
  await runAndStream({
    chatId,
    threadId,
    actionType,
    userInput: contextMessages[actionType] ?? "",
  });
}

