/**
 * LangGraph SDK client for multi-agent streaming
 * 
 * This module provides a typed interface to the LangGraph API.
 * If LANGGRAPH_API_URL and LANGSMITH_API_KEY are not set, the client
 * methods will be no-ops.
 */

// Dynamic import to handle optional dependency
let LangGraphSDK: typeof import("@langchain/langgraph-sdk") | null = null;

async function getSDK() {
  if (!LangGraphSDK) {
    try {
      LangGraphSDK = await import("@langchain/langgraph-sdk");
    } catch {
      console.warn("⚠️ LangGraph SDK not available");
      return null;
    }
  }
  return LangGraphSDK;
}

/**
 * Get the LangGraph client instance
 */
export async function getLangGraphClient() {
  const sdk = await getSDK();
  if (!sdk) return null;

  return new sdk.Client({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: process.env.LANGGRAPH_API_URL,
  });
}

/**
 * Get the assistant ID from environment
 */
export function getAssistantId(): string {
  const assistantId = process.env.ASSISTANT_ID;
  if (!assistantId) {
    throw new Error("ASSISTANT_ID environment variable is not set");
  }
  return assistantId;
}

/**
 * Check if LangGraph is configured
 */
export function isLangGraphConfigured(): boolean {
  return !!(process.env.LANGGRAPH_API_URL && process.env.LANGSMITH_API_KEY);
}
