import { CodeReviewDomainError } from "../domain/errors.js";
import { env } from "../../../env.js";

export class GithubClient {
  private token: string;

  constructor() {
    this.token = env.GITHUB_TOKEN;
  }

  async getCommitDiff(owner: string, repo: string, commitSha: string): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`;
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Accept": "application/vnd.github.v3.diff",
          "User-Agent": "AI-Code-Reviewer"
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new CodeReviewDomainError(`Failed to fetch commit diff: ${message}`);
    }
  }

  async getPullRequestDiff(owner: string, repo: string, pullNumber: number): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Accept": "application/vnd.github.v3.diff",
          "User-Agent": "AI-Code-Reviewer",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new CodeReviewDomainError(`Failed to fetch PR diff: ${message}`);
    }
  }

  async submitPullRequestReview(
    owner: string,
    repo: string,
    pullNumber: number,
    review: {
      body: string;
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
      comments: Array<{ path: string; line: number; body: string }>;
    },
  ): Promise<void> {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "AI-Code-Reviewer",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: review.body,
          event: review.event,
          comments: review.comments,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API responded with ${response.status}: ${text}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new CodeReviewDomainError(`Failed to submit PR review: ${message}`);
    }
  }
}
