import { describe, expect, it, vi } from "vitest";

const openAIMock = vi.hoisted(() => ({
  create: vi.fn()
}));

vi.mock("@/lib/ai/openai-client", () => ({
  getOpenAIClient: () => ({
    responses: {
      create: openAIMock.create
    }
  }),
  getOpenAIModel: () => "gpt-test"
}));

describe("streamAssistantText usage accounting", () => {
  it("reports real token usage from the OpenAI response.completed event", async () => {
    const { streamAssistantText, summarizeUsage } = await import("@/lib/ai/assistant-service");
    const actualUsage: Array<{ promptTokens: number; completionTokens: number; totalTokens: number; model: string }> = [];

    openAIMock.create.mockResolvedValueOnce(
      (async function* () {
        yield { type: "response.output_text.delta", delta: "ตอบจริง" };
        yield {
          type: "response.completed",
          response: {
            model: "gpt-test",
            usage: {
              input_tokens: 123,
              output_tokens: 45,
              total_tokens: 168
            }
          }
        };
      })()
    );

    const chunks: string[] = [];
    for await (const chunk of streamAssistantText(
      {
        message: "ถาม",
        history: [],
        contexts: []
      },
      {
        onUsage: (usage) => actualUsage.push(usage)
      }
    )) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("ตอบจริง");
    expect(actualUsage).toEqual([
      {
        promptTokens: 123,
        completionTokens: 45,
        totalTokens: 168,
        model: "gpt-test"
      }
    ]);
    expect(
      summarizeUsage({
        prompt: "this estimate should not win",
        output: "short",
        model: "gpt-test",
        actualUsage: actualUsage[0]
      })
    ).toMatchObject({
      promptTokens: 123,
      completionTokens: 45,
      totalTokens: 168,
      model: "gpt-test"
    });
  });
});
