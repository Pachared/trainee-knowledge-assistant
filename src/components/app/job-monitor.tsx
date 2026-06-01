"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string };
};

type Job = {
  id: string;
  title: string;
  filename: string;
  status: string;
  failedReason?: string | null;
  jobStage?: string | null;
  jobProgress: number;
  totalChunks: number;
  processedChunks: number;
  embeddedChunks: number;
  indexingAttempts: number;
  lockedBy?: string | null;
  lockedAt?: string | null;
  nextAttemptAt?: string | null;
  lastIndexedAt?: string | null;
  updatedAt: string;
  stale: boolean;
  _count?: { chunks: number };
};

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message || "โหลดข้อมูลไม่สำเร็จ");
  }

  return payload.data;
}

function statusColor(status: string): "default" | "success" | "warning" | "error" | "info" {
  if (status === "ready") return "success";
  if (status === "processing") return "info";
  if (status === "failed") return "error";
  if (status === "ready_without_chroma" || status === "queued") return "warning";
  return "default";
}

export function JobMonitor({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reconciling, setReconciling] = useState(false);

  async function loadJobs() {
    const data = await fetchJson<{ jobs: Job[] }>("/api/admin/jobs");
    setJobs(data.jobs);
  }

  async function runJobAction(action: "retry" | "cancel", documentId: string) {
    setBusyId(documentId);
    setStatus("");
    try {
      await fetchJson<{ job: Job }>("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, documentId })
      });
      await loadJobs();
      setStatus(action === "retry" ? "ส่งงานกลับเข้าคิวแล้ว" : "ยกเลิกงานแล้ว");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "จัดการงานไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  async function reconcileChroma() {
    setReconciling(true);
    setStatus("");
    try {
      const data = await fetchJson<{ result: { total: number; succeeded: number; failed: number } }>("/api/admin/reconcile-chroma", {
        method: "POST"
      });
      await loadJobs();
      setStatus(`ตรวจและสร้างดัชนีใหม่ ${data.result.succeeded}/${data.result.total} รายการ ไม่สำเร็จ ${data.result.failed}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "reconcile Chroma ไม่สำเร็จ");
    } finally {
      setReconciling(false);
    }
  }

  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 900 }}>
              คิวประมวลผลเอกสาร
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ตรวจงาน queued/processing/retry/failed และสั่ง retry หรือ reconcile Chroma ได้จากหน้านี้
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button type="button" variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={() => void loadJobs()}>
              รีเฟรช
            </Button>
            <Button type="button" variant="contained" startIcon={<ReplayOutlinedIcon />} disabled={reconciling} onClick={() => void reconcileChroma()}>
              Reconcile
            </Button>
          </Stack>
        </Stack>

        {status ? <Alert severity={status.includes("ไม่สำเร็จ") ? "error" : "info"}>{status}</Alert> : null}

        <Stack spacing={1.25}>
          {jobs.length ? (
            jobs.map((job) => (
              <Paper key={job.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default" }}>
                <Stack spacing={1.25}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                        {job.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.filename} · attempts {job.indexingAttempts} · {job.jobStage ?? "ไม่มี stage"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                      <Chip size="small" color={statusColor(job.status)} label={job.status} variant="outlined" />
                      {job.stale ? <Chip size="small" color="error" label="งานค้าง" /> : null}
                    </Stack>
                  </Stack>

                  <Box>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>
                        progress {job.jobProgress}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        chunks {job.processedChunks}/{job.totalChunks || job._count?.chunks || 0} · indexed {job.embeddedChunks}/{job.totalChunks || job._count?.chunks || 0}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, job.jobProgress))} sx={{ height: 7, borderRadius: 99 }} />
                  </Box>

                  {job.failedReason ? (
                    <Typography variant="caption" color={job.status === "failed" ? "error.main" : "warning.main"} sx={{ overflowWrap: "anywhere" }}>
                      {job.failedReason}
                    </Typography>
                  ) : null}

                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Button
                      type="button"
                      size="small"
                      startIcon={<ReplayOutlinedIcon />}
                      disabled={busyId === job.id}
                      onClick={() => void runJobAction("retry", job.id)}
                    >
                      ส่งกลับเข้าคิว
                    </Button>
                    {job.status === "processing" || job.status === "queued" ? (
                      <Button
                        type="button"
                        size="small"
                        color="error"
                        startIcon={<StopCircleOutlinedIcon />}
                        disabled={busyId === job.id}
                        onClick={() => void runJobAction("cancel", job.id)}
                      >
                        ยกเลิกงาน
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              ยังไม่มีงานเอกสารในระบบ
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
