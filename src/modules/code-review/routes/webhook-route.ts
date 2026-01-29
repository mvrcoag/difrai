import { Hono } from "hono";
import { ReviewService } from "../services/review-service.js";
import { WebhookValidator } from "../infrastructure/webhook-validator.js";
import { WebhookValidationError } from "../domain/errors.js";
import { githubPushEventSchema } from "../infrastructure/github-schemas.js";
import { z } from "zod";

const app = new Hono();
const reviewService = new ReviewService();
const webhookValidator = new WebhookValidator();

app.post("/github", async (c) => {
  try {
    const signature = c.req.header("X-Hub-Signature-256");
    const rawBody = await c.req.text();
    
    // Validate Secret
    await webhookValidator.validate(signature, rawBody);

    const event = c.req.header("X-GitHub-Event");
    
    if (event === "push") {
      const rawPayload = JSON.parse(rawBody);
      const parseResult = githubPushEventSchema.safeParse(rawPayload);

      if (!parseResult.success) {
        console.warn("Invalid GitHub Payload:", parseResult.error.format());
        // We might return 200 to GitHub so it doesn't retry invalid payloads?
        // But for now let's return 400.
        return c.json({ error: "Invalid Payload", details: parseResult.error.format() }, 400);
      }
      
      const payload = parseResult.data;
      // Process in background (fire and forget) or await?
      // Awaiting to ensure execution in serverless contexts, though it might timeout.
      // For this prototype, we await.
      await reviewService.processPushEvent(payload);
    }

    return c.json({ message: "Received" }, 200);
  } catch (error) {
    if (error instanceof WebhookValidationError) {
      console.warn("Webhook validation failed:", error.message);
      return c.json({ error: error.message }, 401);
    }
    // Handle unexpected JSON parse error
    if (error instanceof SyntaxError) {
        return c.json({ error: "Invalid JSON" }, 400);
    }
    
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);
    return c.json({ error: "Internal Server Error", details: message }, 500);
  }
});

export default app;
