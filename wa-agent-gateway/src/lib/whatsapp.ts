/**
 * WhatsApp client using Wapi.js SDK
 * https://javascript.wapikit.com/guide/building-your-application/creating-wapi-client
 */

import {
  Client,
  TextMessage,
  ButtonInteractionMessage,
  ListInteractionMessage,
} from "@wapijs/wapi.js";

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
      const message = new TextMessage({ text });
      await this.client.message.send({
        message,
        phoneNumber: to,
      });
      console.log("✅ Message sent successfully via Wapi.js");
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
      const message = new ButtonInteractionMessage({
        bodyText,
        buttons: buttons.slice(0, 3).map((btn) => ({
          id: btn.id,
          title: btn.title,
        })),
      });
      await this.client.message.send({
        message,
        phoneNumber: to,
      });
      console.log("✅ Buttons sent successfully via Wapi.js");
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
