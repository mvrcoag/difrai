import type { ReviewFinding, StructuredReview } from "../infrastructure/schemas.js";

type GitHubReviewEvent = "APPROVE" | "REQUEST_CHANGES" | "COMMENT";

interface GitHubReviewComment {
  path: string;
  line: number;
  body: string;
}

export function mapSeverityToReviewEvent(
  overallSeverity: StructuredReview["overallSeverity"],
): GitHubReviewEvent {
  switch (overallSeverity) {
    case "clean":
      return "APPROVE";
    case "critical":
    case "warning":
      return "REQUEST_CHANGES";
    case "info":
      return "COMMENT";
  }
}

export function mapFindingsToComments(
  findings: ReviewFinding[],
): GitHubReviewComment[] {
  return findings
    .filter((f) => f.filePath && f.lineRange)
    .map((f) => ({
      path: f.filePath,
      line: f.lineRange!.end,
      body: formatCommentBody(f),
    }));
}

function formatCommentBody(finding: ReviewFinding): string {
  const severityEmoji =
    finding.severity === "critical"
      ? "🔴"
      : finding.severity === "warning"
        ? "🟡"
        : "🔵";

  let body = `${severityEmoji} **${finding.severity.toUpperCase()}**: ${finding.title}\n\n${finding.description}`;

  if (finding.suggestion) {
    body += `\n\n**Suggestion:** ${finding.suggestion}`;
  }

  if (finding.codeSuggestion) {
    body += `\n\n\`\`\`suggestion\n${finding.codeSuggestion}\n\`\`\``;
  }

  return body;
}
