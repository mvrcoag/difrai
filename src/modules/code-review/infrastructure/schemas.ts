import { z } from "zod";

export const FINDING_SEVERITY_VALUES = ['critical', 'warning', 'info'] as const;
export const OVERALL_SEVERITY_VALUES = [
  'critical',
  'warning',
  'info',
  'clean',
] as const;

export const reviewFindingSchema = z.object({
  severity: z.enum(FINDING_SEVERITY_VALUES),
  filePath: z.string().describe('The file path affected by this finding'),
  lineRange: z
    .object({ start: z.number(), end: z.number() })
    .nullable()
    .describe('Line range in the diff, or null if not applicable'),
  title: z.string().describe('Short title summarizing the finding'),
  description: z.string().describe('Detailed explanation of the issue found'),
  suggestion: z
    .string()
    .nullable()
    .describe(
      'Suggested fix or improvement in natural language, or null if none',
    ),
  codeSuggestion: z
    .string()
    .nullable()
    .describe(
      'A concise code snippet or diff illustrating the fix. Use Markdown backticks for code blocks. Null if not applicable.',
    ),
});

export const structuredReviewSchema = z.object({
  summary: z
    .string()
    .describe(
      'A 2-3 sentence overall summary of the commit quality and main concerns',
    ),
  overallSeverity: z
    .enum(OVERALL_SEVERITY_VALUES)
    .describe('The highest severity level found across all findings'),
  findings: z
    .array(reviewFindingSchema)
    .describe('List of specific issues found in the code'),
});

export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type StructuredReview = z.infer<typeof structuredReviewSchema>;
