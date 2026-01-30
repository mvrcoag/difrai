import { NotificationError } from "../../domain/errors.js";
import type { StructuredReview } from "../schemas.js";
import { env } from "../../../../env.js";
import type { Notifier, CommitMetadata } from "../notifier.js";
import { logger } from "../../../../common/logger.js";

export class TeamsNotifier implements Notifier {
  private webhookUrl: string;

  constructor() {
    if (!env.TEAMS_WEBHOOK_URL) {
      throw new Error("TEAMS_WEBHOOK_URL is missing");
    }
    this.webhookUrl = env.TEAMS_WEBHOOK_URL;
  }

  async send(
    review: StructuredReview,
    metadata: CommitMetadata,
    _recipient?: string,
  ): Promise<void> {
    const card = this.generateCard(review, metadata);
    const maskedUrl = this.webhookUrl.substring(0, 20) + "...";
    
    logger.debug(`Sending Adaptive Card to Teams webhook: ${maskedUrl}`);
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "No response body");
        logger.error(`Teams API error (${response.status}): ${errorText}`);
        throw new Error(`Teams responded with ${response.status}: ${errorText}`);
      }

      logger.info("Teams notification delivered successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to dispatch Teams notification: ${message}`);
      throw new NotificationError(
        `Failed to send Teams notification: ${message}`,
      );
    }
  }

  private generateCard(
    review: StructuredReview,
    metadata: CommitMetadata,
  ): object {
    const findings = review.findings.slice(0, 10);

    const severityColorMap: Record<string, string> = {
      critical: "Attention",
      warning: "Warning",
      info: "Accent",
      clean: "Good",
    };

    const severityIconMap: Record<string, string> = {
      critical: "🔴",
      warning: "🟠",
      info: "🔵",
      clean: "🟢",
    };

    const color = severityColorMap[review.overallSeverity] || "Default";
    const icon = severityIconMap[review.overallSeverity] || "📝";

    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            body: [
              {
                type: "ColumnSet",
                columns: [
                  {
                    type: "Column",
                    width: "auto",
                    items: [
                      {
                        type: "Image",
                        url: "https://cdn-icons-png.flaticon.com/512/2111/2111432.png",
                        size: "Small",
                      },
                    ],
                  },
                  {
                    type: "Column",
                    width: "stretch",
                    items: [
                      {
                        type: "TextBlock",
                        text: `AI Review: ${metadata.repo}`,
                        weight: "Bolder",
                        size: "Medium",
                      },
                      {
                        type: "TextBlock",
                        text: `${icon} Status: ${review.overallSeverity.toUpperCase()}`,
                        color: color,
                        spacing: "None",
                      },
                    ],
                  },
                ],
              },
              {
                type: "Container",
                style: "emphasis",
                bleed: true,
                items: [
                  {
                    type: "TextBlock",
                    text: review.summary,
                    wrap: true,
                    italic: true,
                  },
                ],
              },
              {
                type: "FactSet",
                facts: [
                  { title: "Author", value: metadata.author },
                  { title: "Date", value: metadata.date },
                  {
                    title: "Commit",
                    value: `[View on GitHub](${metadata.url})`,
                  },
                ],
              },
              {
                type: "Container",
                items: findings.map((f) => {
                  const fColor = severityColorMap[f.severity] || "Default";
                  const fIcon = severityIconMap[f.severity] || "▪️";
                  return {
                    type: "Container",
                    separator: true,
                    items: [
                      {
                        type: "TextBlock",
                        text: `${fIcon} **${f.title}**`,
                        wrap: true,
                        color: fColor,
                      },
                      {
                        type: "TextBlock",
                        spacing: "None",
                        text: `File: ${f.filePath}${f.lineRange ? ` (L${f.lineRange.start}-${f.lineRange.end})` : ""}`,
                        isSubtle: true,
                        wrap: true,
                        size: "Small",
                      },
                      {
                        type: "TextBlock",
                        text: f.description,
                        wrap: true,
                        size: "Small",
                      },
                      ...(f.suggestion
                        ? [
                            {
                              type: "TextBlock",
                              text: `**Suggestion:** ${f.suggestion}`,
                              wrap: true,
                              size: "Small",
                              spacing: "Small",
                            },
                          ]
                        : []),
                      ...(f.codeSuggestion
                        ? [
                            {
                              type: "Container",
                              style: "emphasis",
                              items: [
                                {
                                  type: "TextBlock",
                                  text: f.codeSuggestion,
                                  wrap: true,
                                  fontType: "Monospace",
                                  size: "Small",
                                },
                              ],
                              spacing: "Small",
                            },
                          ]
                        : []),
                    ],
                  };
                }),
              },
            ],
            actions: [
              {
                type: "Action.OpenUrl",
                title: "View Commit on GitHub",
                url: metadata.url,
              },
            ],
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.4",
          },
        },
      ],
    };
  }
}
