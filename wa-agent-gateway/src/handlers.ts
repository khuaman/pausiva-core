import type { Request, Response } from "express";
import { whatsappClient } from "./lib/whatsapp";
import { runAndStream, startThread, getActionType, setActionType, getUserByPhone, sendProactiveMessage } from "./actions";
import { getOrCreateConversation, forceNewConversation } from "./lib/storage";
import { proactiveMessageSchema } from "./schemas";

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

  // Mark message as read and show typing indicator ("...")
  // This provides visual feedback while the AI processes the message
  // Typing indicator auto-dismisses after 25s or when we respond
  await whatsappClient.markAsRead(messageId, true);

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
 * Check if a message is a greeting that should start a new conversation.
 * Detects: hola, buenos días/tardes/noches, buen día, buenas tardes/noches, etc.
 */
function isGreeting(text: string): boolean {
  const normalizedText = text
    .toLowerCase()
    .trim()
    // Normalize accented characters
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Exact start commands
  const exactCommands = ["start", "/start", "hi", "hello"];
  if (exactCommands.includes(normalizedText)) {
    return true;
  }

  // Greeting patterns (Spanish)
  const greetingPatterns = [
    /^hola\b/,                          // "hola", "hola!", "hola como estas"
    /^buenos?\s*dias?\b/,               // "buen dia", "buenos dias"
    /^buenas?\s*tardes?\b/,             // "buena tarde", "buenas tardes"
    /^buenas?\s*noches?\b/,             // "buena noche", "buenas noches"
  ];

  return greetingPatterns.some((pattern) => pattern.test(normalizedText));
}

/**
 * Handle text messages from users
 */
async function handleTextMessage(chatId: string, text: string): Promise<void> {
  // Check if message is a greeting (should start new conversation)
  const shouldStartNew = isGreeting(text);

  // If greeting detected, force a new conversation (ends old one if exists)
  if (shouldStartNew) {
    console.log(`👋 Greeting detected: "${text}" - forcing new conversation`);
    await forceNewConversation(chatId);
    await startThread(chatId);
    return;
  }
  
  // Get or create conversation (uses Supabase + Redis cache)
  const { conversation, isNew } = await getOrCreateConversation(chatId);
  const threadId = conversation.threadId;

  // Start new conversation for truly new conversations (no previous history)
  if (isNew) {
    console.log(`🆕 New conversation for ${chatId} - starting thread`);
    await startThread(chatId);
    return;
  }

  // Get user_id for authenticated users
  const user = await getUserByPhone(chatId);
  const userId = user?.id;

  // Get current action type (default to "chat")
  const actionType = (await getActionType(threadId)) as ActionType;

  // Process message through the multi-agent system
  await runAndStream({
    chatId,
    threadId,
    actionType,
    userInput: text,
    userId,
  });
}

/**
 * Handle button/list reply interactions
 */
async function handleButtonReply(chatId: string, buttonId: string): Promise<void> {
  // Get conversation
  const { conversation } = await getOrCreateConversation(chatId);
  const threadId = conversation.threadId;

  if (!threadId) {
    await whatsappClient.sendTextMessage(chatId, "No hay conversación activa. Escribe 'hola' para comenzar!");
    return;
  }

  // Map button IDs to action types
  const actionMap: Record<string, ActionType> = {
    action_process: "process_data",
    action_query: "query_data",
    action_help: "chat",
    // Support for dynamic action buttons (action_0, action_1, action_2)
    action_0: "chat",
    action_1: "process_data",
    action_2: "query_data",
  };

  const actionType = actionMap[buttonId] ?? "chat";

  // Store action type for this thread (in Redis + DB)
  await setActionType(threadId, actionType);

  // Get user_id for authenticated users
  const user = await getUserByPhone(chatId);
  const userId = user?.id;

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
    userId,
  });
}

/**
 * Handle proactive messages from the platform (POST /api/send-message)
 * Allows the management system to send messages to patients via WhatsApp
 * 
 * This endpoint is async - returns 202 Accepted immediately and processes in background
 */
export function handleProactiveMessage(req: Request, res: Response): void {
  const apiKey = req.headers["x-api-key"];
  const expectedApiKey = process.env.PLATFORM_API_KEY;

  if (expectedApiKey && apiKey !== expectedApiKey) {
    console.warn("⚠️ Unauthorized proactive message attempt");
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  // Validate request body
  const parseResult = proactiveMessageSchema.safeParse(req.body);

  if (!parseResult.success) {
    console.warn("⚠️ Invalid proactive message request:", parseResult.error.flatten());
    res.status(400).json({
      success: false,
      error: "Invalid request body",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const { phone, message, message_type, buttons, metadata } = parseResult.data;

  console.log(`📤 Proactive message request for ${phone} (source: ${metadata?.source || "manual"})`);

  // Return 202 Accepted immediately - message will be processed in background
  res.status(202).json({
    accepted: true,
    message: "Message queued for delivery",
    phone,
  });

  // Process message in background (fire and forget)
  sendProactiveMessage({
    phone,
    message,
    messageType: message_type,
    buttons,
    metadata,
  })
    .then((result) => {
      if (result.success) {
        console.log(`✅ Proactive message sent to ${phone}`);
      } else {
        console.error(`❌ Failed to send proactive message to ${phone}:`, result.error);
      }
    })
    .catch((error) => {
      console.error(`❌ Error sending proactive message to ${phone}:`, error);
    });
}
