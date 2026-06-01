"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import type { ApiDocument } from "@/components/app/types";
import { canSummarizeDocument, DOCUMENT_SUMMARY_PROMPT } from "@/components/chat/summary-action";

type ComposerProps = {
  documents: ApiDocument[];
  disabled?: boolean;
  onSend: (message: string, documentId?: string) => void;
  onUpload: (file: File) => Promise<void>;
  onPrompt: (message: string, documentId?: string) => void;
};

export function Composer({ documents, disabled, onSend, onUpload, onPrompt }: ComposerProps) {
  const [message, setMessage] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readyDocuments = useMemo(
    () => documents.filter((document) => ["ready", "ready_without_chroma"].includes(document.status) && (document._count?.chunks ?? 0) > 0),
    [documents]
  );
  const selectedDocumentId = documents.some((document) => document.id === documentId) ? documentId : "";
  const canSummarize = canSummarizeDocument(selectedDocumentId) && readyDocuments.some((document) => document.id === selectedDocumentId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    onSend(message, selectedDocumentId || undefined);
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
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: "0 14px 36px rgba(31, 41, 55, 0.08)",
          p: 1.5
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
              value={selectedDocumentId}
              onChange={(event) => setDocumentId(event.target.value)}
              displayEmpty
              aria-label="เลือกเอกสารสำหรับ RAG"
              sx={{ bgcolor: "background.paper", borderRadius: 999 }}
            >
              <MenuItem value="">ถามจากทุกเอกสาร</MenuItem>
              {documents.map((document) => (
                <MenuItem
                  key={document.id}
                  value={document.id}
                  disabled={!["ready", "ready_without_chroma"].includes(document.status) || !(document._count?.chunks ?? 0)}
                >
                  {document.title} {document.status === "queued" || document.status === "processing" ? "(กำลังประมวลผล)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title={canSummarize ? "สรุปเอกสารที่เลือก" : "เลือกเอกสารที่ประมวลผลแล้วก่อนสรุป"}>
            <span>
              <Button
                type="button"
                variant="outlined"
                startIcon={<AutoAwesomeOutlinedIcon />}
                disabled={disabled || !canSummarize}
                onClick={() => onPrompt(DOCUMENT_SUMMARY_PROMPT, selectedDocumentId)}
                sx={{ borderRadius: 999, bgcolor: "background.paper" }}
              >
                สรุปเอกสาร
              </Button>
            </span>
          </Tooltip>
          <Typography variant="caption" color="text.secondary">
            {uploading ? "กำลังอัปโหลด..." : canSummarize ? "พร้อมสรุปเอกสารที่เลือก" : "เลือกเอกสารที่พร้อมใช้งานก่อนสรุป"}
          </Typography>
        </Stack>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          hidden
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </Paper>
    </Box>
  );
}
