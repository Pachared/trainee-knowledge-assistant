"use client";

import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import type { ApiDocument } from "@/components/app/types";

type UploadViewProps = {
  documents: ApiDocument[];
  status?: string;
  onUpload: (file: File) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onReindexDocument: (documentId: string) => Promise<void>;
  onReindexAllDocuments: () => Promise<void>;
};

export function UploadView({
  documents,
  status,
  onUpload,
  onDeleteDocument,
  onReindexDocument,
  onReindexAllDocuments
}: UploadViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [bulkReindexing, setBulkReindexing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiDocument | null>(null);
  const pendingReindexCount = documents.filter((document) => document.status === "ready_without_chroma").length;

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const documentId = deleteTarget.id;
    setBusyDocumentId(documentId);
    setDeleteTarget(null);
    try {
      await onDeleteDocument(documentId);
    } finally {
      setBusyDocumentId(null);
    }
  }

  async function handleReindex(document: ApiDocument) {
    setBusyDocumentId(document.id);
    try {
      await onReindexDocument(document.id);
    } finally {
      setBusyDocumentId(null);
    }
  }

  async function handleReindexAll() {
    setBulkReindexing(true);
    try {
      await onReindexAllDocuments();
    } finally {
      setBulkReindexing(false);
    }
  }

  return (
    <Box component="section" sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: { xs: 1.75, md: 3 }, py: { xs: 2.75, md: 4 } }}>
        <Box sx={{ width: "min(100%, 920px)", mx: "auto" }}>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
            อัปโหลดเอกสาร
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            ระบบจะแยก text, chunk, ฝัง embedding และส่งเข้า Chroma สำหรับถามตอบจาก context
          </Typography>
          {status ? (
            <Alert severity={status.includes("ไม่สำเร็จ") || status.includes("failed") ? "warning" : "info"} sx={{ mb: 2 }}>
              {status}
            </Alert>
          ) : null}

          <Paper elevation={0} sx={{ display: "grid", gap: 2, border: 1, borderColor: "divider", p: 3 }}>
            <Button
              variant="contained"
              startIcon={<DriveFolderUploadOutlinedIcon />}
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              size="large"
            >
              {uploading ? "กำลังประมวลผลไฟล์" : "เลือกไฟล์ PDF/TXT"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              validate type/size และ sanitize path ก่อนบันทึกลง `data/uploads`
            </Typography>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </Paper>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3.5, mb: 1.5, alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}>
            <Typography variant="h3" component="h3">
              เอกสารล่าสุด
            </Typography>
            <Button
              type="button"
              variant="outlined"
              startIcon={<SyncOutlinedIcon />}
              disabled={!pendingReindexCount || bulkReindexing}
              onClick={() => void handleReindexAll()}
            >
              {bulkReindexing ? "กำลัง re-index" : `Re-index ทั้งหมด (${pendingReindexCount})`}
            </Button>
          </Stack>
          <Stack spacing={1.25}>
            {documents.length ? (
              documents.map((document) => (
                <Paper
                  key={document.id}
                  elevation={0}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
                    gap: 1.75,
                    alignItems: "center",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1.75
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                      {document.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {document.filename} · {Math.ceil(document.size / 1024)} KB · {document._count?.chunks ?? 0} chunks
                    </Typography>
                    {document.failedReason ? (
                      <Typography
                        variant="caption"
                        color={document.status === "failed" ? "error.main" : "warning.main"}
                        sx={{ mt: 0.5, display: "block", overflowWrap: "anywhere" }}
                      >
                        เหตุผล: {document.failedReason}
                      </Typography>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                    <Chip size="small" label={document.status} />
                    <IconButton
                      type="button"
                      aria-label={`re-index Chroma ${document.title}`}
                      size="small"
                      disabled={busyDocumentId === document.id}
                      onClick={() => void handleReindex(document)}
                    >
                      <SyncOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      type="button"
                      aria-label={`ลบเอกสาร ${document.title}`}
                      size="small"
                      disabled={busyDocumentId === document.id}
                      onClick={() => setDeleteTarget(document)}
                      color="error"
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                ยังไม่มีเอกสาร
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>ลบเอกสาร</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {`ต้องการลบเอกสาร "${deleteTarget?.title ?? ""}" พร้อม chunks และข้อมูลใน Chroma หรือไม่?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setDeleteTarget(null)}>
            ยกเลิก
          </Button>
          <Button type="button" variant="contained" color="error" onClick={() => void confirmDelete()}>
            ลบเอกสาร
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
