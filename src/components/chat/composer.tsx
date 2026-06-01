"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { getDocumentStatusMeta, getReadyDocuments } from "@/components/app/document-status";
import type { ApiDocument } from "@/components/app/types";
import { canSummarizeDocument, DOCUMENT_SUMMARY_PROMPT } from "@/components/chat/summary-action";

type ComposerProps = {
  documents: ApiDocument[];
  disabled?: boolean;
  selectedDocumentId: string;
  onDocumentChange: (documentId: string) => void;
  onSend: (message: string, documentId?: string) => void;
  onUpload: (file: File) => Promise<void>;
  onPrompt: (message: string, documentId?: string) => void;
};

export function Composer({
  documents,
  disabled,
  selectedDocumentId,
  onDocumentChange,
  onSend,
  onUpload,
  onPrompt
}: ComposerProps) {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readyDocuments = useMemo(() => getReadyDocuments(documents), [documents]);
  const documentOptions = useMemo(
    () =>
      [...documents].sort((left, right) => {
        const leftReady = getDocumentStatusMeta(left).canUseForChat ? 0 : 1;
        const rightReady = getDocumentStatusMeta(right).canUseForChat ? 0 : 1;
        return leftReady - rightReady || left.title.localeCompare(right.title, "th");
      }),
    [documents]
  );
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;
  const activeDocumentId = selectedDocument?.id ?? "";
  const canSummarize = canSummarizeDocument(activeDocumentId) && readyDocuments.some((document) => document.id === activeDocumentId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    onSend(message, activeDocumentId || undefined);
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

        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mt: 1.25, px: { xs: 0.5, md: 6 } }}>
          <Autocomplete
            size="small"
            value={selectedDocument}
            options={documentOptions}
            onChange={(_event, value) => onDocumentChange(value?.id ?? "")}
            getOptionLabel={(document) => document.title}
            getOptionDisabled={(document) => !getDocumentStatusMeta(document).canUseForChat}
            groupBy={(document) => (getDocumentStatusMeta(document).canUseForChat ? "พร้อมใช้งาน" : "ยังไม่พร้อม")}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="ยังไม่มีเอกสาร"
            clearText="ถามจากทุกเอกสาร"
            sx={{ minWidth: { xs: "100%", sm: 300 }, flex: { xs: "1 1 100%", md: "0 1 360px" } }}
            renderInput={(params) => {
              return (
                <TextField
                  {...params}
                  label="เอกสารอ้างอิง"
                  placeholder="ค้นหาหรือเลือกเอกสาร"
                  slotProps={{
                    ...params.slotProps,
                    htmlInput: {
                      ...params.slotProps.htmlInput,
                      "aria-label": "เลือกเอกสารสำหรับ RAG"
                    }
                  }}
                />
              );
            }}
            renderOption={(props, document) => {
              const meta = getDocumentStatusMeta(document);
              const { key, ...optionProps } = props;

              return (
                <Box component="li" key={key} {...optionProps} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap>
                      {document.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {meta.stepLabel}
                    </Typography>
                  </Box>
                  <Chip size="small" label={meta.label} color={meta.severity === "error" ? "error" : meta.severity === "success" ? "success" : "warning"} />
                </Box>
              );
            }}
          />
          <Tooltip title={canSummarize ? "สรุปเอกสารที่เลือก" : "เลือกเอกสารที่ประมวลผลแล้วก่อนสรุป"}>
            <span>
              <Button
                type="button"
                variant="outlined"
                startIcon={<AutoAwesomeOutlinedIcon />}
                disabled={disabled || !canSummarize}
                onClick={() => onPrompt(DOCUMENT_SUMMARY_PROMPT, activeDocumentId)}
                sx={{ borderRadius: 999, bgcolor: "background.paper" }}
              >
                สรุปเอกสาร
              </Button>
            </span>
          </Tooltip>
          <Typography variant="caption" color="text.secondary">
            {uploading
              ? "กำลังอัปโหลด..."
              : selectedDocument
                ? getDocumentStatusMeta(selectedDocument).nextStep
                : "ยังไม่เลือกเอกสาร ระบบจะค้นจากทุกไฟล์ที่พร้อมใช้งาน"}
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
