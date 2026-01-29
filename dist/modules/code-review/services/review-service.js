import { AiCodeReviewer } from "../infrastructure/ai-client.js";
import { GithubClient } from "../infrastructure/github-client.js";
import { EmailNotifier, TeamsNotifier } from "../infrastructure/notifier.js";
import { env } from "../../../env.js";
export class ReviewService {
    aiReviewer;
    githubClient;
    notifiers = [];
    emailNotifier;
    constructor() {
        this.aiReviewer = new AiCodeReviewer();
        this.githubClient = new GithubClient();
        if (env.TEAMS_ENABLED) {
            try {
                this.notifiers.push(new TeamsNotifier());
            }
            catch (e) {
                console.warn("Teams enabled but failed to init notifier:", e);
            }
        }
        if (env.EMAIL_ENABLED) {
            try {
                this.emailNotifier = new EmailNotifier();
            }
            catch (e) {
                console.warn("Email enabled but failed to init notifier:", e);
            }
        }
    }
    async processPushEvent(payload) {
        const { repository, commits } = payload;
        // Zod schema ensures commits array exists, but empty check is fine
        if (!commits || commits.length === 0) {
            return;
        }
        const owner = repository.owner.name || repository.owner.login;
        const repo = repository.name;
        for (const commit of commits) {
            // 1. Fetch Diff
            let diff;
            try {
                diff = await this.githubClient.getCommitDiff(owner, repo, commit.id);
            }
            catch (e) {
                console.error(`Skipping commit ${commit.id}: Failed to fetch diff`, e);
                continue;
            }
            // 2. Analyze
            let review;
            try {
                review = await this.aiReviewer.analyzeDiff(diff);
            }
            catch (e) {
                console.error(`Skipping commit ${commit.id}: AI analysis failed`, e);
                continue;
            }
            // 3. Notify Teams/Global
            const commitUrl = commit.url;
            for (const notifier of this.notifiers) {
                await notifier.send(review, commitUrl).catch(e => console.error("Notifier failed:", e));
            }
            // 4. Notify Author via Email
            if (this.emailNotifier && commit.author?.email) {
                // author.email can be string or null/undefined in schema?
                // Let's check schema.
                const authorEmail = commit.author.email;
                if (typeof authorEmail === 'string' && authorEmail.includes('@')) {
                    await this.emailNotifier.send(review, commitUrl, authorEmail)
                        .catch(e => console.error(`Failed to send email to ${authorEmail}`, e));
                }
            }
        }
    }
}
