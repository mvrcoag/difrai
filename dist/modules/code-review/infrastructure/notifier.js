import nodemailer from "nodemailer";
import { NotificationError } from "../domain/errors.js";
import { env } from "../../../env.js";
export class EmailNotifier {
    transporter;
    from;
    defaultTo;
    constructor(targetEmail) {
        if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
            throw new Error("Missing Email Configuration");
        }
        this.transporter = nodemailer.createTransport({
            host: env.EMAIL_HOST,
            port: Number(env.EMAIL_PORT) || 587,
            secure: env.EMAIL_SECURE,
            auth: {
                user: env.EMAIL_USER,
                pass: env.EMAIL_PASS,
            },
        });
        this.from = env.EMAIL_FROM || env.EMAIL_USER;
        this.defaultTo = targetEmail || env.EMAIL_TO;
    }
    async send(review, commitUrl, recipient) {
        const to = recipient || this.defaultTo;
        if (!to) {
            throw new NotificationError("No recipient email provided");
        }
        const html = this.generateHtml(review, commitUrl);
        try {
            await this.transporter.sendMail({
                from: this.from,
                to: to,
                subject: `[${review.overallSeverity.toUpperCase()}] AI Code Review Result`,
                html,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            throw new NotificationError(`Failed to send email: ${message}`);
        }
    }
    generateHtml(review, commitUrl) {
        const colorMap = {
            critical: "#dc2626",
            warning: "#f59e0b",
            info: "#3b82f6",
            clean: "#10b981",
        };
        const findingsHtml = review.findings.map(f => `
      <div style="margin-bottom: 20px; padding: 15px; border-left: 5px solid ${colorMap[f.severity] || '#ccc'}; background-color: #f9f9f9;">
        <h3 style="margin: 0 0 10px 0; color: #333;">
          <span style="color: ${colorMap[f.severity] || '#333'};">[${f.severity.toUpperCase()}]</span> ${f.title}
        </h3>
        <p style="margin: 5px 0;"><strong>File:</strong> ${f.filePath} ${f.lineRange ? `(L${f.lineRange.start}-${f.lineRange.end})` : ''}</p>
        <p style="margin: 5px 0;">${f.description}</p>
        ${f.suggestion ? `<p style="margin: 5px 0;"><strong>Suggestion:</strong> ${f.suggestion}</p>` : ''}
        ${f.codeSuggestion ? `<pre style="background: #e5e7eb; padding: 10px; border-radius: 5px; overflow-x: auto;"><code>${f.codeSuggestion}</code></pre>` : ''}
      </div>
    `).join('');
        return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">AI Code Review</h1>
        <p><strong>Commit:</strong> <a href="${commitUrl}">${commitUrl}</a></p>
        <div style="padding: 15px; background-color: ${colorMap[review.overallSeverity] || '#eee'}; color: white; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin: 0;">Overall Status: ${review.overallSeverity.toUpperCase()}</h2>
          <p style="margin: 5px 0 0 0;">${review.summary}</p>
        </div>
        <h2>Findings</h2>
        ${findingsHtml}
      </div>
    `;
    }
}
export class TeamsNotifier {
    webhookUrl;
    constructor() {
        // TeamsNotifier should inspect the env by himself
        if (!env.TEAMS_WEBHOOK_URL) {
            throw new Error("TEAMS_WEBHOOK_URL is missing");
        }
        this.webhookUrl = env.TEAMS_WEBHOOK_URL;
    }
    async send(review, commitUrl, _recipient) {
        const card = this.generateCard(review, commitUrl);
        try {
            const response = await fetch(this.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(card),
            });
            if (!response.ok) {
                throw new Error(`Teams responded with ${response.status}`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            throw new NotificationError(`Failed to send Teams notification: ${message}`);
        }
    }
    generateCard(review, commitUrl) {
        const colorMap = {
            critical: "Attention",
            warning: "Warning",
            info: "Accent",
            clean: "Good",
        };
        const findingsFacts = review.findings.map(f => ({
            title: `[${f.severity.toUpperCase()}] ${f.title}`,
            value: `**File:** ${f.filePath}\n\n${f.description}\n\n**Fix:** ${f.suggestion || "N/A"}`,
        }));
        return {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0076D7",
            "summary": `AI Code Review: ${review.overallSeverity.toUpperCase()}`,
            "sections": [{
                    "activityTitle": "AI Code Review Result",
                    "activitySubtitle": `Overall: ${review.overallSeverity.toUpperCase()}`,
                    "activityImage": "https://cdn-icons-png.flaticon.com/512/2111/2111432.png", // Generic GitHub/Code icon
                    "facts": [
                        { "name": "Summary", "value": review.summary },
                        { "name": "Commit", "value": `[View on GitHub](${commitUrl})` }
                    ],
                    "markdown": true
                },
                {
                    "startGroup": true,
                    "title": "Findings",
                    "facts": findingsFacts.map(f => ({ name: f.title, value: f.value })),
                    "markdown": true
                }]
        };
    }
}
