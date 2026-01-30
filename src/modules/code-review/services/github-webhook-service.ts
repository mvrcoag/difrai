import { ReviewService } from "./review-service.js";
import { WebhookValidator } from "../infrastructure/webhook-validator.js";
import { githubPushEventSchema } from "../infrastructure/github-schemas.js";
import { InvalidPayloadError, InvalidJsonError } from "../domain/errors.js";
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

    if (event !== "push") {
      logger.info(`Ignored non-push event: ${event}`);
      return;
    }

    let rawPayload: any;
    try {
      rawPayload = JSON.parse(rawBody);
    } catch (e) {
      logger.error("Failed to parse webhook JSON payload");
      throw new InvalidJsonError();
    }

    const parseResult = githubPushEventSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      logger.warn("Invalid GitHub Payload structure", parseResult.error.format());
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
  }
}
