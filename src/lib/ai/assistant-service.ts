import { estimateTokens } from "@/lib/ai/tokenizer";
import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai-client";
import type { RetrievedContext } from "@/lib/rag/rag-service";

type AssistantInput = {
  message: string;
  history: Array<{ role: string; content: string }>;
  contexts: RetrievedContext[];
};

export function buildAssistantPrompt(input: AssistantInput) {
  const contextText = input.contexts.length
    ? input.contexts
        .map((context, index) => `[${index + 1}] ${context.documentTitle}\n${context.content}`)
        .join("\n\n")
    : "ไม่มีเอกสารที่เกี่ยวข้องจาก Chroma";

  const historyText = input.history
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  return [
    "คุณคือ Trainee Knowledge Assistant ตอบเป็นภาษาไทยให้กระชับ ชัดเจน และอ้างอิงเอกสารเมื่อมี context",
    "ถ้าไม่มีข้อมูลในเอกสาร ให้บอกอย่างตรงไปตรงมาและเสนอคำถามต่อยอด",
    "",
    "บริบทจากเอกสาร:",
    contextText,
    "",
    "ประวัติสนทนาล่าสุด:",
    historyText || "ยังไม่มี",
    "",
    `คำถามผู้ใช้: ${input.message}`
  ].join("\n");
}

export async function* streamAssistantText(input: AssistantInput): AsyncGenerator<string> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  if (!client) {
    const citations = input.contexts.map((context, index) => `[${index + 1}] ${context.documentTitle}`);
    const fallback = [
      "โหมดตัวอย่างยังไม่ได้ตั้งค่า OpenAI API key ครับ",
      input.contexts.length
        ? `พบเอกสารที่เกี่ยวข้อง ${input.contexts.length} ส่วน: ${citations.join(", ")}`
        : "ยังไม่พบ context จากเอกสารที่อัปโหลด",
      `คำถามที่ได้รับ: ${input.message}`
    ].join("\n\n");

    for (const part of fallback.match(/.{1,48}(\s|$)/g) ?? [fallback]) {
      yield part;
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    return;
  }

  const stream = await (client.responses.create as unknown as (input: unknown) => Promise<AsyncIterable<{ type?: string; delta?: string }>>)({
    model,
    input: buildAssistantPrompt(input),
    stream: true
  });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta" && event.delta) {
      yield event.delta;
    }
  }
}

export function summarizeUsage(input: { prompt: string; output: string; model?: string }) {
  return {
    promptTokens: estimateTokens(input.prompt),
    completionTokens: estimateTokens(input.output),
    model: input.model || getOpenAIModel()
  };
}
