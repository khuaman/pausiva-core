import { whatsappClient } from "./lib/whatsapp";
import { getLangGraphClient, getAssistantId, isLangGraphConfigured } from "./lib/langgraph";
import { isFastAPIConfigured, sendMessage, sendCheckin, type FastAPIMessageResponse } from "./lib/fastapi";
import { v4 as uuidv4 } from "uuid";

type ActionType = "chat" | "process_data" | "query_data";

/**
 * Start a new conversation thread
 */
export async function startThread(chatId: string): Promise<string> {
  // Option 1: Use FastAPI (preferred)
  if (isFastAPIConfigured()) {
    try {
      const threadId = uuidv4();
      const response = await sendCheckin({
        thread_id: threadId,
        phone: chatId,
      });

      await sendWelcomeMessage(chatId, response.reply_text);
      return threadId;
    } catch (error) {
      console.error("❌ FastAPI error, trying LangGraph fallback:", error);
    }
  }

  // Option 2: Use LangGraph SDK
  if (isLangGraphConfigured()) {
    try {
      const client = await getLangGraphClient();
      if (client) {
        // Create thread in LangGraph
        const thread = await client.threads.create();
        const threadId = thread.thread_id;

        // Initialize with welcome message
        const assistantId = getAssistantId();
        const streamResponse = client.runs.stream(threadId, assistantId, {
          input: {
            uuid: threadId,
            user_input: "",
            action_type: "chat",
          },
        });

        // Process welcome message
        for await (const chunk of streamResponse) {
          if (chunk.event === "values" && chunk.data.output) {
            await sendWelcomeMessage(chatId, chunk.data.output as string);
          }
        }

        return threadId;
      }
    } catch (error) {
      console.error("❌ LangGraph error, falling back to local:", error);
    }
  }

  // Fallback: Generate local thread ID and send default welcome
  const threadId = uuidv4();
  await sendWelcomeMessage(
    chatId,
    "👋 Hola!\n\nEs un placer ayudarte. ¿Qué te gustaría hacer?"
  );
  return threadId;
}

/**
 * Send welcome message with action buttons
 */
async function sendWelcomeMessage(chatId: string, text: string): Promise<void> {
  await whatsappClient.sendButtons(chatId, text, [
    { id: "action_process", title: "📝 Agendar Cita" },
    { id: "action_query", title: "🔍 Consultar Datos" },
    { id: "action_help", title: "❓ Obtener Ayuda" },
  ]);
}

/**
 * Stream a conversation turn through the multi-agent system
 */
export async function runAndStream({
  chatId,
  threadId,
  userInput = "",
  actionType = "chat",
}: {
  chatId: string;
  threadId: string;
  userInput?: string;
  actionType?: ActionType;
}): Promise<void> {
  // Option 1: Use FastAPI (preferred)
  if (isFastAPIConfigured()) {
    try {
      const response = await sendMessage({
        thread_id: threadId,
        phone: chatId,
        message: userInput,
      });

      await handleFastAPIResponse({ chatId, response });
      return;
    } catch (error) {
      console.error("❌ FastAPI streaming error, trying LangGraph:", error);
    }
  }

  // Option 2: Use LangGraph SDK
  if (isLangGraphConfigured()) {
    try {
      const client = await getLangGraphClient();
      if (client) {
        const assistantId = getAssistantId();
        const streamResponse = client.runs.stream(threadId, assistantId, {
          input: {
            uuid: threadId,
            user_input: userInput,
            action_type: actionType,
          },
          streamMode: "updates",
        });

        // Collect all chunks
        const chunks: unknown[] = [];
        for await (const chunk of streamResponse) {
          chunks.push(chunk.data);
        }

        // Process chunks based on agent outputs
        await handleChunks({ chatId, actionType, chunks });
        return;
      }
    } catch (error) {
      console.error("❌ LangGraph streaming error:", error);
    }
  }

  // Fallback: Echo response for testing without any AI backend
  await whatsappClient.sendTextMessage(
    chatId,
    `🤖 Modo eco (sin backend AI configurado)\n\nDijiste: "${userInput}"\nAcción: ${actionType}`
  );
}

/**
 * Handle response from FastAPI endpoint
 */
async function handleFastAPIResponse({
  chatId,
  response,
}: {
  chatId: string;
  response: FastAPIMessageResponse;
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
 * Process streaming chunks from multi-agent system (LangGraph)
 */
async function handleChunks({
  chatId,
  actionType,
  chunks,
}: {
  chatId: string;
  actionType: ActionType;
  chunks: unknown[];
}): Promise<void> {
  for (const chunk of chunks) {
    const data = chunk as Record<string, Record<string, unknown>>;

    // Handle text output from any agent
    const output = data[actionType]?.output;
    if (output && typeof output === "string") {
      await whatsappClient.sendTextMessage(chatId, output);
    }

    // Handle structured data from processor agent
    const parsedData = data.parse_data?.parsed_data;
    if (parsedData) {
      // TODO: Validate with Zod and insert to database
      console.log("📊 Parsed data:", parsedData);
      await whatsappClient.sendTextMessage(
        chatId,
        "✅ ¡Cita agendada exitosamente!"
      );
    }

    // Handle query results from SQL agent
    const queryOutput = data.format_results?.output;
    if (queryOutput && typeof queryOutput === "string") {
      await whatsappClient.sendTextMessage(chatId, queryOutput);
    }
  }
}
