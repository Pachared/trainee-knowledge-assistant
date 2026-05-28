export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();

  return forwarded || realIp || "local";
}

export function sanitizePlainText(input: string, maxLength = 20_000): string {
  return input.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}
