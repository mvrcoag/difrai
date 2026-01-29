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
}
