export class CodeReviewDomainError extends Error {
    constructor(message) {
        super(message);
        this.name = "CodeReviewDomainError";
    }
}
export class WebhookValidationError extends CodeReviewDomainError {
    constructor(message) {
        super(message);
        this.name = "WebhookValidationError";
    }
}
export class AiAnalysisError extends CodeReviewDomainError {
    constructor(message) {
        super(message);
        this.name = "AiAnalysisError";
    }
}
export class NotificationError extends CodeReviewDomainError {
    constructor(message) {
        super(message);
        this.name = "NotificationError";
    }
}
