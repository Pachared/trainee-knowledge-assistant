"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import type { ApiDocument } from "@/components/app/types";

type UploadViewProps = {
  documents: ApiDocument[];
  onUpload: (file: File) => Promise<void>;
};

export function UploadView({ documents, onUpload }: UploadViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    setUploading(true);
    await onUpload(file);
    setUploading(false);
  }

  return (
    <Box component="section" sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: { xs: 1.75, md: 3 }, py: { xs: 2.75, md: 4 } }}>
        <Box sx={{ width: "min(100%, 920px)", mx: "auto" }}>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
            อัปโหลดเอกสาร
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: { xs: 17, md: 19 } }}>
            ระบบจะแยก text, chunk, ฝัง embedding และส่งเข้า Chroma สำหรับถามตอบจาก context
          </Typography>

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

          <Typography variant="h3" component="h3" sx={{ mt: 3.5, mb: 1.5 }}>
            เอกสารล่าสุด
          </Typography>
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
                  <Chip size="small" label={document.status} />
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
    </Box>
  );
}
