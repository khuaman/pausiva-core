import express from "express";
import { handleWebhook, verifyWebhook } from "./handlers";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "whatsapp-agent-api" });
});

// WhatsApp webhook verification (GET)
app.get("/webhook", verifyWebhook);

// WhatsApp webhook handler (POST)
app.post("/webhook", handleWebhook);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Agent API running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
});

