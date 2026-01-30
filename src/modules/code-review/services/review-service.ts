import { AiCodeReviewer } from "../infrastructure/ai-client.js";
import { GithubClient } from "../infrastructure/github-client.js";
import {
  EmailNotifier,
  TeamsNotifier,
  type Notifier,
} from "../infrastructure/notifier.js";
import type { GithubPushEvent } from "../infrastructure/github-schemas.js";
import { env } from "../../../env.js";
import { logger } from "../../../common/logger.js";

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
        logger.info("Teams notifier initialized successfully");
      } catch (e) {
        logger.warn("Teams enabled but failed to init notifier:", e);
      }
    }

    if (env.EMAIL_ENABLED) {
      try {
        this.emailNotifier = new EmailNotifier();
        logger.info("Email notifier initialized successfully");
      } catch (e) {
        logger.warn("Email enabled but failed to init notifier:", e);
      }
    }
  }

  async processPushEvent(payload: GithubPushEvent): Promise<void> {
    const { repository, commits } = payload;

    if (!commits || commits.length === 0) {
      logger.info(`No commits found in push event for ${repository.full_name}`);
      return;
    }

    logger.info(`Starting review process for ${commits.length} commit(s) in ${repository.full_name}`);

    for (const commit of commits) {
      logger.info(`Processing commit: ${commit.id} by ${commit.author.name}`);
      await this.processCommit(repository, commit);
    }
    
    logger.info(`Finished processing push event for ${repository.full_name}`);
  }

  private async processCommit(
    repository: GithubPushEvent["repository"],
    commit: GithubPushEvent["commits"][number],
  ): Promise<void> {
    const diff = await this.fetchDiff(repository, commit);
    if (!diff) {
      logger.warn(`Skipping commit ${commit.id}: Empty or unavailable diff`);
      return;
    }

    logger.info(`Analyzing changes for commit ${commit.id}...`);
    const review = await this.analyzeChanges(diff, commit.id);
    if (!review) {
      logger.warn(`Skipping commit ${commit.id}: Analysis yielded no results`);
      return;
    }

    logger.info(`Review completed for commit ${commit.id}. Overall severity: ${review.overallSeverity}`);

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
      logger.error(`Failed to fetch diff for commit ${commit.id}:`, e);
      return null;
    }
  }

  private async analyzeChanges(diff: string, commitId: string) {
    try {
      return await this.aiReviewer.analyzeDiff(diff);
    } catch (e) {
      logger.error(`AI analysis failed for commit ${commitId}:`, e);
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
    logger.info(`Sending notifications for commit ${metadata.repo}...`);

    for (const notifier of this.notifiers) {
      const notifierName = notifier.constructor.name;
      logger.debug(`Dispatching notification via ${notifierName}`);
      await notifier
        .send(review, metadata)
        .then(() => logger.info(`${notifierName} notification sent successfully`))
        .catch((e) => logger.error(`${notifierName} notification failed:`, e));
    }

    if (this.emailNotifier && authorEmail) {
      if (typeof authorEmail === "string" && authorEmail.includes("@")) {
        logger.debug(`Dispatching email notification to ${authorEmail}`);
        await this.emailNotifier
          .send(review, metadata, authorEmail)
          .then(() => logger.info(`Email sent successfully to ${authorEmail}`))
          .catch((e) =>
            logger.error(`Failed to send email to ${authorEmail}:`, e),
          );
      } else {
        logger.warn(`Invalid or missing email address for author: ${authorEmail}`);
      }
    }
  }
}
