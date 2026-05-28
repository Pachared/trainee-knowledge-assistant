import OpenAI from "openai";
import { getOpenAIKeys } from "@/lib/env";

export function selectOpenAIKey() {
  const keys = getOpenAIKeys();

  if (!keys.length) {
    return null;
  }

  const index = Math.floor(Date.now() / 60_000) % keys.length;
  return keys[index];
}

export function getOpenAIClient() {
  const apiKey = selectOpenAIKey();

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5";
}

export function getOpenAIEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}
