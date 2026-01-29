export class CodeReviewDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeReviewDomainError";
  }
}

export class WebhookValidationError extends CodeReviewDomainError {
  constructor(message: string) {
    super(message);
    this.name = "WebhookValidationError";
  }
}

export class AiAnalysisError extends CodeReviewDomainError {
  constructor(message: string) {
    super(message);
    this.name = "AiAnalysisError";
  }
}

export class NotificationError extends CodeReviewDomainError {
  constructor(message: string) {
    super(message);
    this.name = "NotificationError";
  }
}

export class InvalidPayloadError extends CodeReviewDomainError {
  constructor(public details: any) {
    super("Invalid Payload");
    this.name = "InvalidPayloadError";
  }
}

export class InvalidJsonError extends CodeReviewDomainError {
  constructor() {
    super("Invalid JSON");
    this.name = "InvalidJsonError";
  }
}
