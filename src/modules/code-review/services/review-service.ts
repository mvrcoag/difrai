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

    // Zod schema ensures commits array exists, but empty check is fine
    if (!commits || commits.length === 0) {
      return;
    }

    const owner = repository.owner.name || repository.owner.login;
    const repo = repository.name;

    for (const commit of commits) {
      console.log("C", commit);
      // 1. Fetch Diff
      let diff: string;
      try {
        diff = await this.githubClient.getCommitDiff(owner, repo, commit.id);
      } catch (e) {
        console.error(`Skipping commit ${commit.id}: Failed to fetch diff`, e);
        continue;
      }

      console.log("D", diff);

      // 2. Analyze
      let review;
      try {
        review = await this.aiReviewer.analyzeDiff(diff);
      } catch (e) {
        console.error(`Skipping commit ${commit.id}: AI analysis failed`, e);
        continue;
      }

      console.log("R", review);

      // 3. Notify Teams/Global
      const metadata = {
        repo: repository.full_name || repository.name,
        author: commit.author.name || commit.author.username || "Unknown",
        date: new Date(commit.timestamp).toLocaleString(),
        url: commit.url,
      };

      for (const notifier of this.notifiers) {
        await notifier
          .send(review, metadata)
          .catch((e) => console.error("Notifier failed:", e));
      }

      // 4. Notify Author via Email
      if (this.emailNotifier && commit.author?.email) {
        const authorEmail = commit.author.email;
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
}
