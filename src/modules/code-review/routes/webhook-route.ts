import { Hono } from "hono";
import { GithubWebhookService } from "../services/github-webhook-service.js";
import { WebhookValidationError, InvalidPayloadError, InvalidJsonError } from "../domain/errors.js";

const app = new Hono();
const githubWebhookService = new GithubWebhookService();

app.post("/github", async (c) => {
  try {
    const signature = c.req.header("X-Hub-Signature-256");
    const rawBody = await c.req.text();
    const event = c.req.header("X-GitHub-Event");
    
    await githubWebhookService.handleWebhook(signature, rawBody, event);

    return c.json({ message: "Received" }, 200);
  } catch (error) {
    if (error instanceof WebhookValidationError) {
      console.warn("Webhook validation failed:", error.message);
      return c.json({ error: error.message }, 401);
    }
    
    if (error instanceof InvalidPayloadError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }

    if (error instanceof InvalidJsonError) {
        return c.json({ error: "Invalid JSON" }, 400);
    }
    
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);
    return c.json({ error: "Internal Server Error", details: message }, 500);
  }
});

export default app;
