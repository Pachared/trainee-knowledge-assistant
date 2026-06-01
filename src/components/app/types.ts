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
  citations?: ApiCitation[];
  model?: string | null;
  createdAt: string;
};

export type ApiCitation = {
  index: number;
  chunkId: string;
  documentId?: string;
  title: string;
  chunkIndex?: number;
  pageNumber?: number | null;
  fileUrl?: string;
  excerpt?: string;
};

export type ApiDocument = {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  size: number;
  status: string;
  failedReason?: string | null;
  jobStage?: string | null;
  jobProgress?: number;
  totalChunks?: number;
  processedChunks?: number;
  embeddedChunks?: number;
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
