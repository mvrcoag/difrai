import { z } from "zod";

const githubAuthorSchema = z.object({
  name: z.string(),
  email: z.string().email().optional().or(z.string()),
  username: z.string().optional(),
});

const githubCommitSchema = z.object({
  id: z.string(),
  tree_id: z.string(),
  distinct: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
  url: z.string().url(),
  author: githubAuthorSchema,
  committer: githubAuthorSchema,
  added: z.array(z.string()),
  removed: z.array(z.string()),
  modified: z.array(z.string()),
});

const githubRepositorySchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  owner: z.object({
    name: z.string().optional(),
    email: z.string().nullable().optional(),
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string().url(),
    url: z.string().url(),
  }),
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string().url(),
});

export const githubPushEventSchema = z.object({
  ref: z.string(),
  before: z.string(),
  after: z.string(),
  repository: githubRepositorySchema,
  pusher: z.object({
    name: z.string(),
    email: z.string().optional(),
  }),
  sender: z.object({
    login: z.string(),
    id: z.number(),
  }),
  created: z.boolean(),
  deleted: z.boolean(),
  forced: z.boolean(),
  base_ref: z.string().nullable(),
  compare: z.string(),
  commits: z.array(githubCommitSchema),
  head_commit: githubCommitSchema.nullable(),
});

export type GithubPushEvent = z.infer<typeof githubPushEventSchema>;
export type GithubCommit = z.infer<typeof githubCommitSchema>;
