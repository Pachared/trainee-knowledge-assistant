type LogLevel = "info" | "warn" | "error";

export function logEvent(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}
