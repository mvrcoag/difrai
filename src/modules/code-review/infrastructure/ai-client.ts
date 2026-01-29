import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { AiAnalysisError } from "../domain/errors.js";
import { structuredReviewSchema, type StructuredReview } from "./schemas.js";
import { env } from "../../../env.js";

const SYSTEM_PROMPT = `You are a Principal Software Architect and Security Expert leveraging AI Frontier Models to perform a deep code review.
Analyze the provided git commit diff with a focus on structural integrity, security, and long-term maintainability.

Your Mission:
1.  **Security First**: Identify vulnerabilities (OWASP Top 10), exposed secrets, and insecure patterns.
2.  **Architectural Integrity**: Detect violations of Clean Architecture, SOLID principles, and high coupling/low cohesion.
3.  **Maintainability**: Flag complex logic, potential technical debt, and violations of DRY (Don't Repeat Yourself).
4.  **Scalability**: Identify potential performance bottlenecks and non-scalable patterns (e.g., N+1 queries, unoptimized loops).

Guidelines:
-   **Ignore Trivialities**: Do not report minor formatting, spacing, or style preferences unless they severely impact readability.
-   **Be Actionable**: Every finding must include a clear, specific suggestion for improvement.
-   **Code Suggestions**: When proposing a fix, provide a concise code snippet in the \`codeSuggestion\` field that illustrates the best-practice implementation.
-   **Context Matters**: Consider the surrounding context implied by the diff.
-   **Severity Definitions**:
    -   **Critical**: Security vulnerabilities, data loss risks, or major architectural violations that *must* be fixed immediately.
    -   **Warning**: Performance issues, maintainability risks, or significant code smells that should be addressed before merging.
    -   **Info**: Best practice recommendations, educational insights, or minor improvements.
-   **Positive Reinforcement**: If the code is excellent, acknowledge it by returning a "clean" status.

Provide a structured review that acts as a helpful, senior-level conversation starter.`;

export class AiCodeReviewer {
  private client: OpenAI;

  constructor() {
    const apiKey = env.OPEN_ROUTER_API_KEY || env.OPENAI_API_KEY;
    const baseURL = env.OPEN_ROUTER_API_KEY
      ? "https://openrouter.ai/api/v1"
      : undefined;

    if (!apiKey) {
      throw new Error("AI API Key is missing even after env validation.");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  async analyzeDiff(diff: string): Promise<StructuredReview> {
    try {
      const completion = await this.client.chat.completions.parse({
        model: env.AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Review this diff:\n\n${diff}` },
        ],
        response_format: zodResponseFormat(
          structuredReviewSchema,
          "review_result",
        ),
      });

      const result = completion.choices[0].message.parsed;

      if (!result) {
        throw new AiAnalysisError("AI returned an empty response.");
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("AI Analysis Failed:", error);
      throw new AiAnalysisError(`AI Analysis failed: ${message}`);
    }
  }
}
