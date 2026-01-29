import { ReviewService } from "./review-service.js";
import { WebhookValidator } from "../infrastructure/webhook-validator.js";
import { githubPushEventSchema } from "../infrastructure/github-schemas.js";
import { InvalidPayloadError, InvalidJsonError } from "../domain/errors.js";

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
    await this.webhookValidator.validate(signature, rawBody);
    if (event !== "push") return;

    let rawPayload: any;
    try {
      rawPayload = JSON.parse(rawBody);
    } catch (e) {
      throw new InvalidJsonError();
    }

    const parseResult = githubPushEventSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      console.warn("Invalid GitHub Payload:", parseResult.error.format());
      throw new InvalidPayloadError(parseResult.error.format());
    }

    const payload = parseResult.data;
    await this.reviewService.processPushEvent(payload);
  }
}
