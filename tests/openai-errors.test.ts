import { describe, expect, it } from "vitest";
import { formatAssistantError } from "@/lib/ai/openai-errors";

describe("formatAssistantError", () => {
  it("maps common OpenAI errors to user-actionable Thai messages", () => {
    expect(formatAssistantError({ status: 401, code: "invalid_api_key" })).toContain("OPENAI_API_KEY");
    expect(formatAssistantError({ status: 429, code: "rate_limit_exceeded" })).toContain("rate limit");
    expect(formatAssistantError({ status: 404, message: "model not found" })).toContain("OPENAI_MODEL");
    expect(formatAssistantError({ status: 504 })).toContain("นานเกินไป");
    expect(formatAssistantError({ status: 500 })).toContain("service");
  });
});
