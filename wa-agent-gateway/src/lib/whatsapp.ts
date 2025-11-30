/**
 * WhatsApp client using Wapi.js SDK
 * https://javascript.wapikit.com/guide/building-your-application/creating-wapi-client
 *
 * Note: We use a hybrid approach:
 * - Wapi.js for sending messages (text, buttons, lists)
 * - Direct WhatsApp Cloud API for marking messages as read (typing indicator)
 *   since wapi.js doesn't expose this on the message manager
 */

import {
  Client,
  TextMessage,
  ButtonInteractionMessage,
  ListInteractionMessage,
} from "@wapijs/wapi.js";

// WhatsApp Cloud API constants
const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Create Wapi.js client instance
const wapiClient = new Client({
  apiAccessToken: process.env.WHATSAPP_API_ACCESS_TOKEN || "",
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  port: 8080, // Wapi.js internal webhook port (we use Express on 3000)
  webhookEndpoint: "/wapi-webhook",
  webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || "",
});

// Note: We don't call wapiClient.initiate() because we're using Express
// for webhook handling. We only use Wapi.js for sending messages.

interface InteractiveButton {
  id: string;
  title: string;
}

/**
 * WhatsApp client wrapper that uses Wapi.js for sending messages
 */
class WhatsAppClient {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Send a text message using Wapi.js
   */
  async sendTextMessage(to: string, text: string): Promise<void> {
    try {
      console.log(`📤 Attempting to send message to: ${to}`);
      const message = new TextMessage({ text });
      const response = await this.client.message.send({
        message,
        phoneNumber: to,
      });
      console.log("✅ Message sent successfully via Wapi.js");
      console.log("📋 API Response:", JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("❌ Failed to send WhatsApp message:", error);
      throw error;
    }
  }

  /**
   * Send interactive buttons using Wapi.js
   */
  async sendButtons(
    to: string,
    bodyText: string,
    buttons: InteractiveButton[]
  ): Promise<void> {
    try {
      console.log(`📤 Attempting to send buttons to: ${to}`);
      const message = new ButtonInteractionMessage({
        bodyText,
        buttons: buttons.slice(0, 3).map((btn) => ({
          id: btn.id,
          title: btn.title,
        })),
      });
      const response = await this.client.message.send({
        message,
        phoneNumber: to,
      });
      console.log("✅ Buttons sent successfully via Wapi.js");
      console.log("📋 API Response:", JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("❌ Failed to send buttons:", error);
      throw error;
    }
  }

  /**
   * Send interactive list using Wapi.js
   */
  async sendList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<void> {
    try {
      const message = new ListInteractionMessage({
        bodyText,
        buttonText,
        sections: sections.map((section) => ({
          title: section.title,
          rows: section.rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description || "",
          })),
        })),
      });
      await this.client.message.send({
        message,
        phoneNumber: to,
      });
      console.log("✅ List sent successfully via Wapi.js");
    } catch (error) {
      console.error("❌ Failed to send list:", error);
      throw error;
    }
  }

  /**
   * Mark a message as read and trigger typing indicator
   *
   * This uses direct WhatsApp Cloud API call since wapi.js doesn't expose
   * this functionality on the message manager (only available on event objects
   * when using wapi.js's built-in webhook handling).
   *
   * When you mark a message as read, it:
   * 1. Shows "read" receipts (blue checkmarks) on the user's side
   * 2. Triggers the typing indicator ("...") until you send a response
   *
   * Note: Typing indicator stays visible for up to 25 seconds or until
   * you send a message, whichever comes first.
   */
  async markAsRead(messageId: string): Promise<void> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_API_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.warn("⚠️ Missing WhatsApp credentials for markAsRead");
      return;
    }

    try {
      const response = await fetch(
        `${GRAPH_API_BASE_URL}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Message marked as read (typing indicator triggered)");
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to mark message as read:", errorText);
      }
    } catch (error) {
      // Don't throw - marking as read is not critical for the flow
      console.error("❌ Error marking message as read:", error);
    }
  }

  /**
   * Get the underlying Wapi.js client for advanced operations
   */
  getWapiClient(): Client {
    return this.client;
  }
}

// Export singleton instance
export const whatsappClient = new WhatsAppClient(wapiClient);

// Export the raw Wapi.js client if needed for event handling
export { wapiClient };
