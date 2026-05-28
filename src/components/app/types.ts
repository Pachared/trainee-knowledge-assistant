export type ApiChat = {
  id: string;
  title: string;
  updatedAt: string;
  messages?: ApiMessage[];
};

export type ApiMessage = {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  promptTokens: number;
  outputTokens: number;
  citedChunkIds?: string | null;
  model?: string | null;
  createdAt: string;
};

export type ApiDocument = {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  size: number;
  status: string;
  failedReason?: string | null;
  createdAt: string;
  _count?: {
    chunks: number;
  };
};

export type ApiUsage = {
  id: string;
  title: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  messageCount: number;
  updatedAt: string;
};

export type AppView = "chat" | "upload" | "usage";
