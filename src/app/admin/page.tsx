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
  status: "ok" | "warning" | "error";
  rows: Array<{ label: string; value: string | number | boolean | null | undefined }>;
  message?: string;
};

const statusConfig = {
  ok: {
    label: "OK",
    color: "success" as const,
    icon: <CheckCircleOutlineOutlinedIcon fontSize="small" />
  },
  warning: {
    label: "Warning",
    color: "warning" as const,
    icon: <ReportProblemOutlinedIcon fontSize="small" />
  },
  error: {
    label: "Error",
    color: "error" as const,
    icon: <ErrorOutlineOutlinedIcon fontSize="small" />
  }
};

function formatValue(value: DiagnosticCardProps["rows"][number]["value"]) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function DiagnosticCard({ title, status, rows, message }: DiagnosticCardProps) {
  const config = statusConfig[status];

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
          <Typography variant="h6" component="h2" sx={{ fontWeight: 900 }} lang="en">
            {title}
          </Typography>
          <Chip icon={config.icon} label={config.label} color={config.color} size="small" variant="outlined" />
        </Stack>

        <Divider />

        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Stack key={row.label} direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary" lang="en">
                {row.label}
              </Typography>
              <Typography
                variant="body2"
                lang="en"
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
              <Typography variant="h1" component="h1" sx={{ fontWeight: 900 }} lang="en">
                Admin diagnostics
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                ตรวจสถานะ OpenAI, Chroma, Database และ upload directory จากระบบจริง
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
                  { label: "API key configured", value: diagnostics.openai.keyConfigured },
                  { label: "Key count", value: diagnostics.openai.keyCount },
                  { label: "Chat model", value: diagnostics.openai.model },
                  { label: "Embedding model", value: diagnostics.openai.embeddingModel },
                  { label: "Live check", value: diagnostics.openai.liveStatus }
                ]}
                message={diagnostics.openai.message}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="Chroma"
                status={diagnostics.chroma.status}
                rows={[
                  { label: "URL", value: diagnostics.chroma.url },
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
                  { label: "Configured", value: diagnostics.redis.configured },
                  { label: "URL", value: diagnostics.redis.url }
                ]}
                message={diagnostics.redis.message}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="Database"
                status={diagnostics.database.status}
                rows={[
                  { label: "Migration files", value: diagnostics.database.migrationCount },
                  { label: "Applied migrations", value: diagnostics.database.appliedCount }
                ]}
                message={diagnostics.database.message}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="Operational metrics"
                status={diagnostics.metrics.status}
                rows={[
                  { label: "Queued documents", value: diagnostics.metrics.documentsByStatus.queued ?? 0 },
                  { label: "Processing documents", value: diagnostics.metrics.documentsByStatus.processing ?? 0 },
                  { label: "Ready documents", value: diagnostics.metrics.documentsByStatus.ready ?? 0 },
                  { label: "Ready without Chroma", value: diagnostics.metrics.documentsByStatus.ready_without_chroma ?? 0 },
                  { label: "Failed documents", value: diagnostics.metrics.documentsByStatus.failed ?? 0 },
                  { label: "Stale processing", value: diagnostics.metrics.staleProcessing },
                  { label: "Chat sessions", value: diagnostics.metrics.chatSessions },
                  { label: "Usage records", value: diagnostics.metrics.usageRecords },
                  { label: "Total tokens", value: diagnostics.metrics.totalTokens }
                ]}
              />
            </Box>
            <Box>
              <DiagnosticCard
                title="Upload directory"
                status={diagnostics.uploadDirectory.status}
                rows={[{ label: "Path", value: diagnostics.uploadDirectory.path }]}
                message={diagnostics.uploadDirectory.message}
              />
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
