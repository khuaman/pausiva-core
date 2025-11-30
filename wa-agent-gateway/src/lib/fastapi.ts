/**
 * FastAPI client for Pausiva AI Multiagent
 *
 * This module calls the ai-multiagent FastAPI endpoint directly.
 * 
 * Endpoint versioning:
 * - V1 (/v1/chat/*): Legacy multi-agent orchestrator
 * - V2 (/v2/chat/*): Single agent with tools (default for new conversations)
 */

export interface FastAPIMessageRequest {
  thread_id: string;
  message_id?: string;
  phone: string;
  message: string;
  user_id?: string; // Optional user ID for authenticated users
}

export interface FastAPIMessageRequestV2 {
  thread_id: string;
  message_id?: string;
  phone: string;
  message: string;
  user_id?: string; // Optional user ID for authenticated users
  is_new_conversation?: boolean; // Flag for new conversations (triggers onboarding)
}

export interface FastAPICheckinRequest {
  thread_id: string;
  message_id?: string;
  phone: string;
  user_id?: string; // Optional user ID for authenticated users
}

export interface FastAPIMessageResponse {
  thread_id: string;
  message_id: string;
  reply_text: string;
  actions: string[];
  risk_level: string;
  risk_score: number;
  symptom_summary: string;
  medication_schedule: Record<string, unknown>[];
  appointments: Record<string, unknown>[];
  follow_up_questions: string[];
  agent_used: string | null;
}

export interface FastAPIMessageResponseV2 extends FastAPIMessageResponse {
  is_new_patient: boolean;
  onboarding_state: string | null;
}

/**
 * Get FastAPI base URL from environment
 */
export function getFastAPIUrl(): string | null {
  return process.env.FASTAPI_URL || null;
}

/**
 * Check if FastAPI is configured
 */
export function isFastAPIConfigured(): boolean {
  return !!process.env.FASTAPI_URL;
}

/**
 * Send a message to the FastAPI V1 chat endpoint (legacy multi-agent)
 */
export async function sendMessage(
  request: FastAPIMessageRequest
): Promise<FastAPIMessageResponse> {
  const baseUrl = getFastAPIUrl();
  if (!baseUrl) {
    throw new Error("FASTAPI_URL environment variable is not set");
  }

  const url = `${baseUrl}/v1/chat/message`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FastAPI error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<FastAPIMessageResponse>;
}

/**
 * Send a message to the FastAPI V2 chat endpoint (single agent with tools)
 * This is the default for new conversations and handles onboarding flow
 */
export async function sendMessageV2(
  request: FastAPIMessageRequestV2
): Promise<FastAPIMessageResponseV2> {
  const baseUrl = getFastAPIUrl();
  if (!baseUrl) {
    throw new Error("FASTAPI_URL environment variable is not set");
  }

  const url = `${baseUrl}/v2/chat/message`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FastAPI V2 error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<FastAPIMessageResponseV2>;
}

/**
 * Send a check-in message to start a conversation (V1 - legacy)
 * @deprecated Use sendMessageV2 with is_new_conversation=true instead
 */
export async function sendCheckin(
  request: FastAPICheckinRequest
): Promise<FastAPIMessageResponse> {
  const baseUrl = getFastAPIUrl();
  if (!baseUrl) {
    throw new Error("FASTAPI_URL environment variable is not set");
  }

  const url = `${baseUrl}/v1/chat/checkin`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FastAPI checkin error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<FastAPIMessageResponse>;
}
