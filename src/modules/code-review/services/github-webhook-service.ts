import { ReviewService } from "./review-service.js";
import { WebhookValidator } from "../infrastructure/webhook-validator.js";
import { githubPushEventSchema } from "../infrastructure/github-schemas.js";
import { githubPullRequestEventSchema } from "../infrastructure/github-pr-schemas.js";
import { InvalidPayloadError, InvalidJsonError } from "../domain/errors.js";
import { env } from "../../../env.js";
import { logger } from "../../../common/logger.js";

export class GithubWebhookService {
  constructor(
    private reviewService: ReviewService = new ReviewService(),
    private webhookValidator: WebhookValidator = new WebhookValidator(),
  ) {}

  async handleWebhook(
    signature: string | undefined,
    rawBody: string,
    event: string | undefined,
  ): Promise<void> {
    logger.debug(`Validating webhook signature for event: ${event}`);
    await this.webhookValidator.validate(signature, rawBody);

    let rawPayload: any;
    try {
      rawPayload = JSON.parse(rawBody);
    } catch (e) {
      logger.error("Failed to parse webhook JSON payload");
      throw new InvalidJsonError();
    }

    if (event === "push" && !env.GITHUB_PUSH_REVIEW_ENABLED) {
      logger.info("Push review is disabled, skipping push event");
      return;
    }

    if (event === "push") {
      const parseResult = githubPushEventSchema.safeParse(rawPayload);

      if (!parseResult.success) {
        logger.warn("Invalid GitHub push payload structure", parseResult.error.format());
        throw new InvalidPayloadError(parseResult.error.format());
      }

      const payload = parseResult.data;
      const repoName = payload.repository.full_name;
      const commitCount = payload.commits.length;

      logger.info(`Processing push event for ${repoName} with ${commitCount} commit(s)`);

      // Fire and forget to avoid GitHub webhook timeout
      this.reviewService.processPushEvent(payload).catch((error) => {
        logger.error(`Critical error in background processing for ${repoName}:`, error);
      });
      return;
    }

    if (event === "pull_request") {
      const parseResult = githubPullRequestEventSchema.safeParse(rawPayload);

      if (!parseResult.success) {
        logger.warn("Invalid GitHub PR payload structure", parseResult.error.format());
        throw new InvalidPayloadError(parseResult.error.format());
      }

      const payload = parseResult.data;
      const repoName = payload.repository.full_name;

      logger.info(`Processing pull_request (${payload.action}) event for ${repoName} PR #${payload.number}`);

      // Fire and forget to avoid GitHub webhook timeout
      this.reviewService.processPullRequestEvent(payload).catch((error) => {
        logger.error(`Critical error in background PR processing for ${repoName}:`, error);
      });
      return;
    }

    logger.info(`Ignored event: ${event}`);
  }
}
