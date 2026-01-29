import { AiCodeReviewer } from "../infrastructure/ai-client.js";
import { GithubClient } from "../infrastructure/github-client.js";
import {
  EmailNotifier,
  TeamsNotifier,
  type Notifier,
} from "../infrastructure/notifier.js";
import type { GithubPushEvent } from "../infrastructure/github-schemas.js";
import { env } from "../../../env.js";

export class ReviewService {
  private aiReviewer: AiCodeReviewer;
  private githubClient: GithubClient;
  private notifiers: Notifier[] = [];
  private emailNotifier?: EmailNotifier;

  constructor() {
    this.aiReviewer = new AiCodeReviewer();
    this.githubClient = new GithubClient();

    if (env.TEAMS_ENABLED) {
      try {
        this.notifiers.push(new TeamsNotifier());
      } catch (e) {
        console.warn("Teams enabled but failed to init notifier:", e);
      }
    }

    if (env.EMAIL_ENABLED) {
      try {
        this.emailNotifier = new EmailNotifier();
      } catch (e) {
        console.warn("Email enabled but failed to init notifier:", e);
      }
    }
  }

  async processPushEvent(payload: GithubPushEvent): Promise<void> {
    const { repository, commits } = payload;

    if (!commits || commits.length === 0) {
      return;
    }

    for (const commit of commits) {
      await this.processCommit(repository, commit);
    }
  }

  private async processCommit(
    repository: GithubPushEvent["repository"],
    commit: GithubPushEvent["commits"][number],
  ): Promise<void> {
    const diff = await this.fetchDiff(repository, commit);
    if (!diff) return;

    const review = await this.analyzeChanges(diff, commit.id);
    if (!review) return;

    const metadata = this.createMetadata(repository, commit);
    await this.notify(review, metadata, commit.author?.email);
  }

  private async fetchDiff(
    repository: GithubPushEvent["repository"],
    commit: GithubPushEvent["commits"][number],
  ): Promise<string | null> {
    const owner = repository.owner.name || repository.owner.login;
    const repo = repository.name;

    try {
      return await this.githubClient.getCommitDiff(owner, repo, commit.id);
    } catch (e) {
      console.error(`Skipping commit ${commit.id}: Failed to fetch diff`, e);
      return null;
    }
  }

  private async analyzeChanges(diff: string, commitId: string) {
    try {
      return await this.aiReviewer.analyzeDiff(diff);
    } catch (e) {
      console.error(`Skipping commit ${commitId}: AI analysis failed`, e);
      return null;
    }
  }

  private createMetadata(
    repository: GithubPushEvent["repository"],
    commit: GithubPushEvent["commits"][number],
  ) {
    return {
      repo: repository.full_name || repository.name,
      author: commit.author.name || commit.author.username || "Unknown",
      date: new Date(commit.timestamp).toLocaleString(),
      url: commit.url,
    };
  }

  private async notify(
    review: any,
    metadata: any,
    authorEmail?: string | null,
  ): Promise<void> {
    for (const notifier of this.notifiers) {
      await notifier
        .send(review, metadata)
        .catch((e) => console.error("Notifier failed:", e));
    }

    if (this.emailNotifier && authorEmail) {
      if (typeof authorEmail === "string" && authorEmail.includes("@")) {
        await this.emailNotifier
          .send(review, metadata, authorEmail)
          .catch((e) =>
            console.error(`Failed to send email to ${authorEmail}`, e),
          );
      }
    }
  }
}
