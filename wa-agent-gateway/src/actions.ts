import { whatsappClient } from "./lib/whatsapp";
import { 
  isFastAPIConfigured, 
  sendMessage, 
  sendMessageV2,
  sendCheckin, 
  type FastAPIMessageResponse,
  type FastAPIMessageResponseV2 
} from "./lib/fastapi";
import {
  getOrCreateConversation,
  getUserByPhone,
  ensureUserExists,
  saveMessage,
  updateConversation,
  setActionType,
  getActionType,
} from "./lib/storage";

type ActionType = "chat" | "process_data" | "query_data";

/**
 * Start a new conversation thread using V2 single agent
 * This handles the onboarding flow for new patients
 */
export async function startThread(chatId: string): Promise<string> {
  if (!isFastAPIConfigured()) {
    throw new Error("FASTAPI_URL environment variable is not set");
  }

  // Ensure user exists (creates via Supabase Auth if not)
  const userResult = await ensureUserExists(chatId);
  const userId = userResult?.user.id;
  const isNewUser = userResult?.isNew ?? false;

  if (isNewUser) {
    console.log(`🆕 Created new user for ${chatId}: ${userId}`);
  }

  // Get or create conversation in database
  const { conversation, isNew } = await getOrCreateConversation(chatId);
  const threadId = conversation.threadId;

  if (isNew) {
    console.log(`🆕 New conversation created: ${threadId} for ${chatId}`);
  } else {
    console.log(`🔄 Reusing conversation: ${threadId} for ${chatId}`);
  }

  // Use V2 endpoint with is_new_conversation flag for natural greeting
  const response = await sendMessageV2({
    thread_id: threadId,
    phone: chatId,
    message: "hola", // Natural greeting to trigger welcome message
    user_id: userId,
    is_new_conversation: true,
  });

  // Save the assistant's welcome message
  await saveMessage(conversation.id, response.reply_text, "assistant", {
    agentUsed: response.agent_used || undefined,
  });

  // Update conversation with agent info
  await updateConversation(threadId, {
    agentUsed: response.agent_used || undefined,
    riskLevel: response.risk_level,
    riskScore: response.risk_score,
  });

  // Send welcome message (without buttons for V2 - let the agent guide naturally)
  await sendWelcomeMessageV2(chatId, response);
  
  return threadId;
}

/**
 * Send welcome message with action buttons (V1 legacy)
 * Uses AI-generated text with optional dynamic buttons from response
 */
async function sendWelcomeMessage(chatId: string, response: FastAPIMessageResponse): Promise<void> {
  // Check if response includes predefined actions/buttons
  const hasActions = response.actions && response.actions.length > 0;

  if (hasActions) {
    // Map actions to buttons (max 3 for WhatsApp)
    const buttons = response.actions.slice(0, 3).map((action, index) => ({
      id: `action_${index}`,
      title: action.slice(0, 20), // WhatsApp button title limit
    }));
    await whatsappClient.sendButtons(chatId, response.reply_text, buttons);
  } else {
    // Default buttons when no specific actions provided
    await whatsappClient.sendButtons(chatId, response.reply_text, [
      { id: "action_process", title: "📝 Agendar Cita" },
      { id: "action_query", title: "🔍 Consultar Datos" },
      { id: "action_help", title: "❓ Obtener Ayuda" },
    ]);
  }
}

/**
 * Send welcome message for V2 (single agent with natural conversation)
 * No buttons by default - let the agent guide the conversation naturally
 */
async function sendWelcomeMessageV2(chatId: string, response: FastAPIMessageResponseV2): Promise<void> {
  // Send the AI-generated welcome message as plain text
  // The agent will ask for the patient's name naturally
  await whatsappClient.sendTextMessage(chatId, response.reply_text);

  // Log onboarding state if present
  if (response.is_new_patient) {
    console.log(`👋 New patient onboarding started for ${chatId}`);
    if (response.onboarding_state) {
      console.log(`📝 Onboarding state: ${response.onboarding_state}`);
    }
  }
}

/**
 * Stream a conversation turn through the FastAPI V2 single agent system
 */
export async function runAndStream({
  chatId,
  threadId,
  userInput = "",
  actionType = "chat",
  userId,
}: {
  chatId: string;
  threadId: string;
  userInput?: string;
  actionType?: ActionType;
  userId?: string;
}): Promise<void> {
  if (!isFastAPIConfigured()) {
    throw new Error("FASTAPI_URL environment variable is not set");
  }

  // Ensure user exists before processing (creates if needed)
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const userResult = await ensureUserExists(chatId);
    effectiveUserId = userResult?.user.id;
    if (userResult?.isNew) {
      console.log(`🆕 Created new user during runAndStream for ${chatId}: ${effectiveUserId}`);
    }
  }

  // Get conversation to save messages
  const { conversation } = await getOrCreateConversation(chatId);

  // Save user message
  if (userInput) {
    await saveMessage(conversation.id, userInput, "user");
  }

  // Send to FastAPI V2 (single agent with tools)
  const response = await sendMessageV2({
    thread_id: threadId,
    phone: chatId,
    message: userInput,
    user_id: effectiveUserId,
    is_new_conversation: false,
  });

  // Save assistant response
  await saveMessage(conversation.id, response.reply_text, "assistant", {
    agentUsed: response.agent_used || undefined,
  });

  // Update conversation metadata
  await updateConversation(threadId, {
    agentUsed: response.agent_used || undefined,
    riskLevel: response.risk_level,
    riskScore: response.risk_score,
    messageCount: conversation.messageCount + 2, // user + assistant
  });

  // Handle the response
  await handleFastAPIResponse({ chatId, response });
}

/**
 * Handle response from FastAPI endpoint (works with both V1 and V2)
 */
async function handleFastAPIResponse({
  chatId,
  response,
}: {
  chatId: string;
  response: FastAPIMessageResponse | FastAPIMessageResponseV2;
}): Promise<void> {
  // Send the main reply
  if (response.reply_text) {
    await whatsappClient.sendTextMessage(chatId, response.reply_text);
  }

  // Handle risk level alerts
  if (response.risk_level && response.risk_level !== "none" && response.risk_level !== "low") {
    console.log(`⚠️ Risk alert for ${chatId}: ${response.risk_level} (score: ${response.risk_score})`);
  }

  // Handle follow-up questions (could be sent as buttons)
  if (response.follow_up_questions && response.follow_up_questions.length > 0) {
    const questionsText = response.follow_up_questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");
    await whatsappClient.sendTextMessage(
      chatId,
      `💭 También me gustaría preguntarte:\n${questionsText}`
    );
  }

  // Log agent used for debugging
  if (response.agent_used) {
    console.log(`🤖 Agent used: ${response.agent_used}`);
  }
}

/**
 * Send a proactive message to a user via WhatsApp
 * Called by the platform/management system to reach patients
 */
export async function sendProactiveMessage({
  phone,
  message,
  messageType = "text",
  buttons,
  metadata,
}: {
  phone: string;
  message: string;
  messageType?: "text" | "buttons";
  buttons?: Array<{ id: string; title: string }>;
  metadata?: {
    source?: string;
    reference_id?: string;
    triggered_by?: string;
  };
}): Promise<{
  success: boolean;
  message_id?: string;
  conversation_id?: string;
  error?: string;
}> {
  try {
    // Get or create conversation for this phone
    const { conversation } = await getOrCreateConversation(phone);

    // Send the message via WhatsApp
    if (messageType === "buttons" && buttons && buttons.length > 0) {
      await whatsappClient.sendButtons(phone, message, buttons);
    } else {
      await whatsappClient.sendTextMessage(phone, message);
    }

    // Save the message to the database as a system message
    await saveMessage(conversation.id, message, "system", {
      agentUsed: "platform",
      metadata: {
        proactive: true,
        source: metadata?.source || "manual",
        reference_id: metadata?.reference_id,
        triggered_by: metadata?.triggered_by,
      },
    });

    // Update conversation metadata
    await updateConversation(conversation.threadId, {
      messageCount: conversation.messageCount + 1,
    });

    return {
      success: true,
      conversation_id: conversation.id,
    };
  } catch (error) {
    console.error("❌ Error in sendProactiveMessage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Re-export storage functions for use in handlers
export { getActionType, setActionType, getUserByPhone } from "./lib/storage";
