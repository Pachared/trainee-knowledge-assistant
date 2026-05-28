import { jsonOk } from "@/lib/http/response";

export const runtime = "nodejs";

export async function GET() {
  return jsonOk({
    status: "ok",
    service: "trainee-knowledge-assistant"
  });
}
