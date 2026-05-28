-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'แชทใหม่',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatSessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "citedChunkIds" TEXT,
    "model" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "chromaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatSessionId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenUsage_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TokenUsage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Message_chatSessionId_createdAt_idx" ON "Message"("chatSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_userId_createdAt_idx" ON "Document"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_chromaId_key" ON "DocumentChunk"("chromaId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_chunkIndex_idx" ON "DocumentChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TokenUsage_messageId_key" ON "TokenUsage"("messageId");

-- CreateIndex
CREATE INDEX "TokenUsage_chatSessionId_createdAt_idx" ON "TokenUsage"("chatSessionId", "createdAt");
