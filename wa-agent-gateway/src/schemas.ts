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

