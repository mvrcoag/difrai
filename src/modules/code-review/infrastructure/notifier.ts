import type { StructuredReview } from "./schemas.js";

export interface CommitMetadata {
  repo: string;
  author: string;
  date: string;
  url: string;
}

export interface Notifier {
  send(review: StructuredReview, metadata: CommitMetadata, recipient?: string): Promise<void>;
}

export { EmailNotifier } from "./notifiers/email-notifier.js";
export { TeamsNotifier } from "./notifiers/teams-notifier.js";
