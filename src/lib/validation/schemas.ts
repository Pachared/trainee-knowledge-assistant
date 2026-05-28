import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200)
});

export const createChatSchema = z.object({
  title: z.string().trim().max(120).optional()
});

export const chatPromptSchema = z.object({
  sessionId: z.string().min(1).optional(),
  message: z.string().trim().min(1).max(20_000),
  documentId: z.string().min(1).optional()
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional()
});

export const uploadConstraints = {
  allowedMimeTypes: new Set(["application/pdf", "text/plain"]),
  allowedExtensions: new Set([".pdf", ".txt"])
};
