import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getAdminDiagnostics } from "@/lib/admin/diagnostics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DiagnosticCardProps = {
  title: string;
  nextStep?: string;
  status: "ok" | "warning" | "error";
  rows: Array<{ label: string; value: string | number | boolean | null | undefined }>;
  message?: string;
};

const statusConfig = {
  ok: {
    label: "ปกติ",
    color: "success" as const,
    icon: <CheckCircleOutlineOutlinedIcon fontSize="small" />
  },
  warning: {
    label: "ควรตรวจสอบ",
    color: "warning" as const,
    icon: <ReportProblemOutlinedIcon fontSize="small" />
  },
  error: {
    label: "ผิดปกติ",
    color: "error" as const,
    icon: <ErrorOutlineOutlinedIcon fontSize="small" />
  }
};

function formatValue(value: DiagnosticCardProps["rows"][number]["value"]) {
  if (typeof value === "boolean") {
    return value ? "ใช่" : "ไม่ใช่";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function defaultNextStep(title: string, status: DiagnosticCardProps["status"]) {
  if (status === "ok") {
    return undefined;
  }

  if (title === "OpenAI") {
    return "ตรวจ OPENAI_API_KEY, OPENAI_MODEL, quota และ billing จากนั้นลองถามใหม่";
  }

  if (title === "Chroma") {
    return "รัน docker compose ps/logs เพื่อตรวจ Chroma แล้วใช้ปุ่มสร้างดัชนีใหม่ในหน้าอัปโหลด";
  }

  if (title === "Redis rate limit") {
    return "ตรวจ RATE_LIMIT_REDIS_URL หรือสถานะ Redis container ถ้าต้องการ rate limit แบบแชร์หลาย instance";
  }

  if (title === "ฐานข้อมูล") {
    return "รัน prisma migrate deploy ใน container หรือเช็ค DATABASE_URL และ volume SQLite";
  }

  if (title === "โฟลเดอร์อัปโหลด") {
    return "ตรวจ permission ของ upload volume หรือค่า UPLOAD_DIR";
  }

  return "เปิด logs ของ web/worker แล้วแก้ service ที่มีสถานะผิดปกติ";
}

function DiagnosticCard({ title, status, rows, message, nextStep }: DiagnosticCardProps) {
  const config = statusConfig[status];
  const advice = nextStep ?? defaultNextStep(title, status);

  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{
        height: "100%",
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        bgcolor: "background.paper"
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
          <Chip icon={config.icon} label={config.label} color={config.color} size="small" variant="outlined" />
        </Stack>

        <Divider />

        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Stack key={row.label} direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                {row.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  textAlign: "right",
                  overflowWrap: "anywhere"
                }}
              >
                {formatValue(row.value)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {message ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: "error.light",
              color: "error.contrastText",
              overflowWrap: "anywhere"
            }}
          >
            <Typography variant="caption" component="span">
              {message}
            </Typography>
          </Box>
        ) : null}

        {advice ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: "background.default",
              border: 1,
              borderColor: "divider"
            }}
          >
            <Typography variant="caption" sx={{ display: "block", fontWeight: 800 }}>
              วิธีแก้ต่อไป
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {advice}
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}

export default async function AdminPage() {
  await requireCurrentUser();
  const diagnostics = await getAdminDiagnostics();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h1" component="h1" sx={{ fontWeight: 900 }}>
                ตรวจสถานะระบบ
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                ตรวจ OpenAI, Chroma, Redis, ฐานข้อมูล และโฟลเดอร์อัปโหลดจากระบบจริง
              </Typography>
            </Box>
            <Button href="/chat" variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>
              กลับไปแชท
            </Button>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2
            }}
          >
            <Box>
              <DiagnosticCard
                title="OpenAI"
                status={diagnostics.openai.status}
                rows={[
                  { label: "ตั้งค่า API key แล้ว", value: diagnostics.openai.keyConfigured },
                  { label: "จำนวน key", value: diagnostics.openai.keyCount },
                  { label: "โมเดลแชท", value: diagnostics.openai.model },
                  { label: "โมเดล embedding", value: diagnostics.openai.embeddingModel },
                  { label: "ผลตรวจ live", value: diagnostics.openai.liveStatus }
                ]}
                message={diagnostics.openai.message}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="Chroma"
                status={diagnostics.chroma.status}
                rows={[
                  { label: "ที่อยู่", value: diagnostics.chroma.url },
                  { label: "Collection", value: diagnostics.chroma.collection }
                ]}
                message={diagnostics.chroma.message}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="Redis rate limit"
                status={diagnostics.redis.status}
                rows={[
                  { label: "ตั้งค่าแล้ว", value: diagnostics.redis.configured },
                  { label: "ที่อยู่", value: diagnostics.redis.url }
                ]}
                message={diagnostics.redis.message}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="ฐานข้อมูล"
                status={diagnostics.database.status}
                rows={[
                  { label: "ไฟล์ migration", value: diagnostics.database.migrationCount },
                  { label: "migration ที่ใช้แล้ว", value: diagnostics.database.appliedCount }
                ]}
                message={diagnostics.database.message}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="ภาพรวมการทำงาน"
                status={diagnostics.metrics.status}
                nextStep={
                  diagnostics.metrics.staleProcessing > 0
                    ? "มีงานประมวลผลค้าง ควร restart worker หรือตรวจ DOCUMENT_WORKER_LOCK_TIMEOUT_MS"
                    : undefined
                }
                rows={[
                  { label: "เอกสารรอประมวลผล", value: diagnostics.metrics.documentsByStatus.queued ?? 0 },
                  { label: "เอกสารกำลังประมวลผล", value: diagnostics.metrics.documentsByStatus.processing ?? 0 },
                  { label: "เอกสารพร้อมใช้งาน", value: diagnostics.metrics.documentsByStatus.ready ?? 0 },
                  { label: "พร้อมใช้แบบสำรอง", value: diagnostics.metrics.documentsByStatus.ready_without_chroma ?? 0 },
                  { label: "เอกสารไม่สำเร็จ", value: diagnostics.metrics.documentsByStatus.failed ?? 0 },
                  { label: "งานค้าง", value: diagnostics.metrics.staleProcessing },
                  { label: "จำนวนแชท", value: diagnostics.metrics.chatSessions },
                  { label: "รายการโทเคน", value: diagnostics.metrics.usageRecords },
                  { label: "โทเคนรวม", value: diagnostics.metrics.totalTokens }
                ]}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="โฟลเดอร์อัปโหลด"
                status={diagnostics.uploadDirectory.status}
                rows={[{ label: "ตำแหน่ง", value: diagnostics.uploadDirectory.path }]}
                message={diagnostics.uploadDirectory.message}
              />
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
