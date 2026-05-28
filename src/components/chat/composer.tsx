"use client";

import { FormEvent, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import Typography from "@mui/material/Typography";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import type { ApiDocument } from "@/components/app/types";

type ComposerProps = {
  documents: ApiDocument[];
  disabled?: boolean;
  onSend: (message: string, documentId?: string) => void;
  onUpload: (file: File) => Promise<void>;
  onPrompt: (message: string) => void;
};

export function Composer({ documents, disabled, onSend, onUpload, onPrompt }: ComposerProps) {
  const [message, setMessage] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    onSend(message, documentId || undefined);
    setMessage("");
  }

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    setUploading(true);
    await onUpload(file);
    setUploading(false);
  }

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, pt: 1, pb: { xs: 1.5, md: 3 } }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          width: "min(100%, 920px)",
          mx: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 3.5,
          bgcolor: "#f4f4f5",
          boxShadow: "0 10px 32px rgba(17, 19, 24, 0.08)",
          p: 1.25
        }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "42px minmax(0, 1fr) 42px", alignItems: "end", gap: 1 }}>
          <IconButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="อัปโหลดเอกสาร"
            disabled={uploading}
            sx={{ width: 42, height: 42 }}
          >
            <AttachFileOutlinedIcon />
          </IconButton>
          <TextareaAutosize
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="ถามอะไรก็ได้"
            minRows={1}
            disabled={disabled}
            style={{
              minHeight: 42,
              maxHeight: 180,
              border: 0,
              outline: "none",
              resize: "none",
              background: "transparent",
              color: "inherit",
              padding: "10px 4px",
              font: "inherit"
            }}
          />
          <IconButton
            type="submit"
            aria-label="ส่งข้อความ"
            disabled={disabled || !message.trim()}
            sx={{
              width: 42,
              height: 42,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": { bgcolor: "primary.dark" }
            }}
          >
            <ArrowUpwardOutlinedIcon />
          </IconButton>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mt: 1, px: { xs: 0.5, md: 6 } }}>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
            <Select
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              displayEmpty
              aria-label="เลือกเอกสารสำหรับ RAG"
              sx={{ bgcolor: "background.paper", borderRadius: 999, fontSize: 13 }}
            >
              <MenuItem value="">ใช้เอกสารทั้งหมด</MenuItem>
              {documents.map((document) => (
                <MenuItem key={document.id} value={document.id}>
                  {document.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            type="button"
            variant="outlined"
            startIcon={<AutoAwesomeOutlinedIcon />}
            onClick={() => onPrompt("สรุปเอกสารที่อัปโหลดล่าสุดให้เป็น bullet point")}
            sx={{ borderRadius: 999, bgcolor: "background.paper" }}
          >
            สรุปเอกสาร
          </Button>
          <Typography variant="caption" color="text.secondary">
            {uploading ? "กำลังอัปโหลด..." : "รองรับ PDF/TXT"}
          </Typography>
        </Stack>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          hidden
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </Paper>
    </Box>
  );
}
