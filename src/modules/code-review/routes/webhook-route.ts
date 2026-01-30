import { Hono } from "hono";
import { GithubWebhookService } from "../services/github-webhook-service.js";
import { WebhookValidationError, InvalidPayloadError, InvalidJsonError } from "../domain/errors.js";
import { logger } from "../../../common/logger.js";

const app = new Hono();
const githubWebhookService = new GithubWebhookService();

app.post("/github", async (c) => {
  const event = c.req.header("X-GitHub-Event");
  logger.info(`Received GitHub webhook event: ${event}`);

  try {
    const signature = c.req.header("X-Hub-Signature-256");
    const rawBody = await c.req.text();
    
    await githubWebhookService.handleWebhook(signature, rawBody, event);

    logger.info(`Successfully processed webhook event: ${event}`);
    return c.json({ message: "Received" }, 200);
  } catch (error) {
    if (error instanceof WebhookValidationError) {
      logger.warn("Webhook validation failed:", error.message);
      return c.json({ error: error.message }, 401);
    }
    
    if (error instanceof InvalidPayloadError) {
      logger.warn("Invalid payload received:", error.message);
      return c.json({ error: error.message, details: error.details }, 400);
    }

    if (error instanceof InvalidJsonError) {
        logger.warn("Invalid JSON received in webhook");
        return c.json({ error: "Invalid JSON" }, 400);
    }
    
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Critical error processing webhook:", error);
    return c.json({ error: "Internal Server Error", details: message }, 500);
  }
});

export default app;
