import { z } from "zod";
import "dotenv/config";
const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000),
    // GitHub
    GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
    GITHUB_WEBHOOK_SECRET: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
    // AI
    OPEN_ROUTER_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().default("gpt-4o"),
    // Features
    EMAIL_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    TEAMS_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    // Email
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.coerce.number().optional(),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    EMAIL_SECURE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    EMAIL_TO: z.string().optional(), // Fallback/Default recipient
    // Teams
    TEAMS_WEBHOOK_URL: z.string().optional(),
}).refine((data) => data.OPEN_ROUTER_API_KEY || data.OPENAI_API_KEY, {
    message: "Either OPEN_ROUTER_API_KEY or OPENAI_API_KEY must be set",
    path: ["OPEN_ROUTER_API_KEY"],
}).refine((data) => {
    if (data.EMAIL_ENABLED) {
        return data.EMAIL_HOST && data.EMAIL_USER && data.EMAIL_PASS;
    }
    return true;
}, {
    message: "Email configuration is required when EMAIL_ENABLED is true",
    path: ["EMAIL_ENABLED"],
}).refine((data) => {
    if (data.TEAMS_ENABLED) {
        return !!data.TEAMS_WEBHOOK_URL;
    }
    return true;
}, {
    message: "TEAMS_WEBHOOK_URL is required when TEAMS_ENABLED is true",
    path: ["TEAMS_ENABLED"],
});
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error("❌ Invalid environment variables:", result.error.format());
        throw new Error("Invalid environment variables");
    }
    return result.data;
};
export const env = parseEnv();
