import { estimateTokens } from "@/lib/ai/tokenizer";
import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai-client";
import type { RetrievedContext } from "@/lib/rag/rag-service";

type AssistantInput = {
  message: string;
  history: Array<{ role: string; content: string }>;
  contexts: RetrievedContext[];
};

export type AssistantTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
};

type AssistantStreamOptions = {
  onUsage?: (usage: AssistantTokenUsage) => void;
};

type ResponseStreamEvent = {
  type?: string;
  delta?: string;
  response?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    } | null;
  };
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
    "ถ้าผู้ใช้ขอสรุปเอกสารและมี context หลายส่วน ให้สรุปจากทุกส่วนที่ได้รับตามลำดับ ไม่เลือกเฉพาะส่วนแรกหรือส่วนที่คล้ายคำถามเท่านั้น",
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

export async function* streamAssistantText(input: AssistantInput, options: AssistantStreamOptions = {}): AsyncGenerator<string> {
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

  const stream = await (client.responses.create as unknown as (input: unknown) => Promise<AsyncIterable<ResponseStreamEvent>>)({
    model,
    input: buildAssistantPrompt(input),
    stream: true
  });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta" && event.delta) {
      yield event.delta;
    }

    if (event.type === "response.completed" && event.response?.usage) {
      const promptTokens = event.response.usage.input_tokens ?? 0;
      const completionTokens = event.response.usage.output_tokens ?? 0;

      options.onUsage?.({
        promptTokens,
        completionTokens,
        totalTokens: event.response.usage.total_tokens ?? promptTokens + completionTokens,
        model: event.response.model || model
      });
    }
  }
}

export function summarizeUsage(input: { prompt: string; output: string; model?: string; actualUsage?: AssistantTokenUsage }) {
  if (input.actualUsage) {
    return input.actualUsage;
  }

  const promptTokens = estimateTokens(input.prompt);
  const completionTokens = estimateTokens(input.output);

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    model: input.model || getOpenAIModel()
  };
}
