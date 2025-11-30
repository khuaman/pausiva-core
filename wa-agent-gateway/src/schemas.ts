import { z } from "zod";

/**
 * Schema for validating record data from the multi-agent system
 * Customize this based on your data model
 */
export const recordSchema = z.object({
  user_email: z.string().email(),
  user_id: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      value: z
        .number()
        .positive()
        .transform((v) => v.toFixed(2)),
      category: z.string(),
    })
  ),
  created_at: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
});

export type Record = z.infer<typeof recordSchema>;

/**
 * Schema for WhatsApp message validation
 */
export const whatsAppMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: z.enum(["text", "interactive", "image", "audio", "document", "location"]),
  text: z.object({ body: z.string() }).optional(),
  interactive: z
    .object({
      type: z.string(),
      button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    })
    .optional(),
});

export type WhatsAppMessage = z.infer<typeof whatsAppMessageSchema>;

/**
 * Schema for proactive message requests from the platform
 * Used by the management system to send messages to patients via WhatsApp
 */
export const proactiveMessageSchema = z.object({
  /** Patient's phone number in E.164 format (e.g., "573001234567") */
  phone: z.string().min(10).max(15),
  /** Message content to send */
  message: z.string().min(1).max(4096),
  /** Type of message to send */
  message_type: z.enum(["text", "buttons"]).default("text"),
  /** Optional buttons (only for message_type: "buttons", max 3) */
  buttons: z
    .array(
      z.object({
        id: z.string().max(256),
        title: z.string().max(20),
      })
    )
    .max(3)
    .optional(),
  /** Optional metadata for tracking/linking */
  metadata: z
    .object({
      /** Source of the message (e.g., "appointment_reminder", "followup", "manual") */
      source: z.string().optional(),
      /** Related entity ID (e.g., appointment_id, followup_id) */
      reference_id: z.string().uuid().optional(),
      /** Staff member who triggered the message */
      triggered_by: z.string().uuid().optional(),
    })
    .optional(),
});

export type ProactiveMessageRequest = z.infer<typeof proactiveMessageSchema>;

/**
 * Schema for proactive message response
 */
export const proactiveMessageResponseSchema = z.object({
  success: z.boolean(),
  message_id: z.string().optional(),
  conversation_id: z.string().uuid().optional(),
  error: z.string().optional(),
});

export type ProactiveMessageResponse = z.infer<typeof proactiveMessageResponseSchema>;

