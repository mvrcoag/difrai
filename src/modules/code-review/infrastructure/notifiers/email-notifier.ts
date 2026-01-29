import nodemailer from "nodemailer";
import { NotificationError } from "../../domain/errors.js";
import type { StructuredReview } from "../schemas.js";
import { env } from "../../../../env.js";
import type { Notifier, CommitMetadata } from "../notifier.js";

export class EmailNotifier implements Notifier {
  private transporter: nodemailer.Transporter;
  private from: string;
  private defaultTo?: string;

  constructor(targetEmail?: string) {
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

  async send(
    review: StructuredReview,
    metadata: CommitMetadata,
    recipient?: string,
  ): Promise<void> {
    const to = recipient || this.defaultTo;
    if (!to) {
      throw new NotificationError("No recipient email provided");
    }
    const html = this.generateHtml(review, metadata);
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: to,
        subject: `[${review.overallSeverity.toUpperCase()}] AI Code Review: ${metadata.repo}`,
        html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new NotificationError(`Failed to send email: ${message}`);
    }
  }

  private generateHtml(
    review: StructuredReview,
    metadata: CommitMetadata,
  ): string {
    const colorMap: Record<string, string> = {
      critical: "#dc2626",
      warning: "#f59e0b",
      info: "#3b82f6",
      clean: "#10b981",
    };

    const findingsHtml = review.findings
      .map(
        (f) => `
      <div style="margin-bottom: 20px; padding: 15px; border-left: 5px solid ${colorMap[f.severity] || "#ccc"}; background-color: #f9f9f9;">
        <h3 style="margin: 0 0 10px 0; color: #333;">
          <span style="color: ${colorMap[f.severity] || "#333"};">[${f.severity.toUpperCase()}]</span> ${f.title}
        </h3>
        <p style="margin: 5px 0;"><strong>File:</strong> ${f.filePath} ${f.lineRange ? `(L${f.lineRange.start}-${f.lineRange.end})` : ""}</p>
        <p style="margin: 5px 0;">${f.description}</p>
        ${f.suggestion ? `<p style="margin: 5px 0;"><strong>Suggestion:</strong> ${f.suggestion}</p>` : ""}
        ${f.codeSuggestion ? `<pre style="background: #e5e7eb; padding: 10px; border-radius: 5px; overflow-x: auto;"><code>${f.codeSuggestion}</code></pre>` : ""}
      </div>
    `,
      )
      .join("");

    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">AI Code Review</h1>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Repository:</strong> ${metadata.repo}</p>
          <p style="margin: 5px 0;"><strong>Author:</strong> ${metadata.author}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${metadata.date}</p>
          <p style="margin: 5px 0;"><strong>Commit:</strong> <a href="${metadata.url}">${metadata.url}</a></p>
        </div>
        <div style="padding: 15px; background-color: ${colorMap[review.overallSeverity] || "#eee"}; color: white; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin: 0;">Overall Status: ${review.overallSeverity.toUpperCase()}</h2>
          <p style="margin: 5px 0 0 0;">${review.summary}</p>
        </div>
        <h2>Findings</h2>
        ${findingsHtml}
      </div>
    `;
  }
}
