import { z } from "zod";

export const SearchInput = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(8),
  traceId: z.string().optional(),
});

export type SearchInput = z.infer<typeof SearchInput>;

export const FetchInput = z.object({
  objectIds: z.array(z.string()).min(1),
  traceId: z.string().optional(),
});
export type FetchInput = z.infer<typeof FetchInput>;

export const SearchOutput = z.object({
  objectIds: z.array(z.string()),
  items: z.array(z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().url(),
    snippet: z.string().optional(),
    score: z.number().optional(),
  })),
  traceId: z.string().optional(),
});

export const FetchOutput = z.object({
  documents: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    title: z.string().optional(),
    content: z.string(),
  })),
  traceId: z.string().optional(),
});
