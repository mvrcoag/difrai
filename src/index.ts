import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import webhookRoute from "./modules/code-review/routes/webhook-route.js";
import { env } from "./env.js";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());

app.route("/webhooks", webhookRoute);

app.get("/", (c) => {
  return c.text("Hello Difrai");
});

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
