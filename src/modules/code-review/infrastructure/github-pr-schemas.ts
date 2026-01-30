import { z } from "zod";

const githubPrUserSchema = z.object({
  login: z.string(),
  id: z.number(),
});

const githubPrRefSchema = z.object({
  ref: z.string(),
  sha: z.string(),
  repo: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
      id: z.number(),
    }),
  }),
});

const githubPullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  user: githubPrUserSchema,
  head: githubPrRefSchema,
  base: githubPrRefSchema,
  html_url: z.string().url(),
});

export const githubPullRequestEventSchema = z.object({
  action: z.enum(["opened", "synchronize", "reopened"]),
  number: z.number(),
  pull_request: githubPullRequestSchema,
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
      id: z.number(),
    }),
  }),
  sender: z.object({
    login: z.string(),
    id: z.number(),
  }),
});

export type GithubPullRequestEvent = z.infer<typeof githubPullRequestEventSchema>;
