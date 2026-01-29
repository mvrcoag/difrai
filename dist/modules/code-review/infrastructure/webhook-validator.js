import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookValidationError } from "../domain/errors.js";
import { env } from "../../../env.js";
export class WebhookValidator {
    secret;
    constructor() {
        this.secret = env.GITHUB_WEBHOOK_SECRET;
    }
    async validate(signatureHeader, rawBody) {
        if (!signatureHeader) {
            throw new WebhookValidationError("Missing X-Hub-Signature-256 header.");
        }
        const [algorithm, signature] = signatureHeader.split("=");
        if (algorithm !== "sha256" || !signature) {
            throw new WebhookValidationError("Invalid signature format. Expected sha256=<signature>");
        }
        const hmac = createHmac("sha256", this.secret);
        hmac.update(rawBody);
        const calculatedSignature = hmac.digest("hex");
        const trusted = Buffer.from(calculatedSignature, "ascii");
        const untrusted = Buffer.from(signature, "ascii");
        if (trusted.length !== untrusted.length || !timingSafeEqual(trusted, untrusted)) {
            throw new WebhookValidationError("Invalid signature. content mismatch.");
        }
    }
}
