import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import webhookRoute from './modules/code-review/routes/webhook-route.js';
const app = new Hono();
app.route('/webhooks', webhookRoute);
app.get('/', (c) => {
    return c.text('Hello Hono!');
});
serve({
    fetch: app.fetch,
    port: 3000
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
