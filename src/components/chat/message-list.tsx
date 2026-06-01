"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import type { ApiCitation, ApiMessage } from "@/components/app/types";

type MessageListProps = {
  messages: ApiMessage[];
  streaming?: boolean;
};

type CitationPreview = {
  document: {
    id: string;
    title: string;
    filename: string;
    mimeType: string;
    fileUrl: string;
    chunkCount: number;
    chunks: Array<{
      id: string;
      chunkIndex: number;
      pageNumber: number | null;
      content: string;
    }>;
  };
};

async function fetchCitationPreview(citation: ApiCitation) {
  if (!citation.documentId) {
    return null;
  }

  const response = await fetch(`/api/documents/${citation.documentId}?chunkId=${encodeURIComponent(citation.chunkId)}`);
  const payload = (await response.json()) as { ok: boolean; data?: CitationPreview; error?: { message?: string } };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message || "โหลดตัวอย่างเอกสารไม่สำเร็จ");
  }

  return payload.data;
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const [selectedCitation, setSelectedCitation] = useState<ApiCitation | null>(null);
  const [citationPreview, setCitationPreview] = useState<CitationPreview | null>(null);
  const [citationPreviewError, setCitationPreviewError] = useState("");
  const [citationPreviewLoading, setCitationPreviewLoading] = useState(false);
  const citationFallback = useMemo(
    () =>
      new Map(
        messages.map((message) => [
          message.id,
          (message.citedChunkIds ?? "")
            .split(",")
            .map((chunkId) => chunkId.trim())
            .filter(Boolean)
            .map((chunkId, index) => ({
              index: index + 1,
              chunkId,
              title: `แหล่งอ้างอิง ${index + 1}`
            }))
        ])
      ),
    [messages]
  );

  return (
    <>
      <Stack sx={{ width: "100%", mx: "auto", gap: 3 }}>
        {messages.map((message) => {
          const isUser = message.role === "user";
          const citations = message.citations?.length ? message.citations : citationFallback.get(message.id) ?? [];

          return (
            <Stack
              key={message.id}
              component="article"
              spacing={1}
              sx={{
                alignItems: isUser ? "flex-end" : "flex-start"
              }}
            >
              <Box
                sx={{
                  maxWidth: isUser ? "min(720px, 88%)" : "min(100%, 800px)",
                  borderRadius: isUser ? 3 : 2.5,
                  bgcolor: isUser ? "primary.main" : "background.paper",
                  color: isUser ? "primary.contrastText" : "text.primary",
                  border: isUser ? 0 : 1,
                  borderColor: "divider",
                  px: isUser ? 2 : 2.25,
                  py: isUser ? 1.35 : 1.75,
                  typography: "body1",
                  overflowWrap: "anywhere",
                  boxShadow: isUser ? "none" : "0 8px 24px rgba(31, 41, 55, 0.05)"
                }}
              >
                {isUser ? (
                  message.content
                ) : (
                  <Box className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || (streaming ? "กำลังร่างคำตอบ..." : "")}</ReactMarkdown>
                  </Box>
                )}
              </Box>

              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", color: "text.secondary" }}>
                {isUser ? (
                  <Chip size="small" label={`tokens ${message.promptTokens || 0}`} />
                ) : (
                  <>
                    <Chip size="small" icon={<SmartToyOutlinedIcon />} label={message.model || "assistant"} />
                    <Chip
                      size="small"
                      icon={<TollOutlinedIcon />}
                      label={`in ${message.promptTokens || 0} / out ${message.outputTokens || 0}`}
                    />
                    {citations.map((citation) => (
                      <Button
                        key={`${message.id}-${citation.chunkId}-${citation.index}`}
                        type="button"
                        size="small"
                        variant="text"
                        onClick={() => {
                          setSelectedCitation(citation);
                          setCitationPreview(null);
                          setCitationPreviewError("");
                          setCitationPreviewLoading(true);
                          void fetchCitationPreview(citation)
                            .then((preview) => setCitationPreview(preview))
                            .catch((error) =>
                              setCitationPreviewError(error instanceof Error ? error.message : "โหลดตัวอย่างเอกสารไม่สำเร็จ")
                            )
                            .finally(() => setCitationPreviewLoading(false));
                        }}
                        sx={{ minHeight: 28, px: 1, borderRadius: 999, color: "text.secondary" }}
                      >
                        อ้างอิง {citation.index}
                      </Button>
                    ))}
                  </>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      <Dialog
        open={Boolean(selectedCitation)}
        onClose={() => {
          setSelectedCitation(null);
          setCitationPreview(null);
          setCitationPreviewError("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>แหล่งอ้างอิงจากเอกสาร</DialogTitle>
        <DialogContent>
          {selectedCitation ? (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                {selectedCitation.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[
                  typeof selectedCitation.pageNumber === "number" ? `หน้า ${selectedCitation.pageNumber}` : null,
                  typeof selectedCitation.chunkIndex === "number" ? `chunk ${selectedCitation.chunkIndex + 1}` : `chunk id: ${selectedCitation.chunkId}`
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ตัวอย่างด้านล่างคือข้อความต้นทางจากเอกสารที่ AI ใช้เป็น context
              </Typography>
              {citationPreview?.document.mimeType === "application/pdf" && citationPreview.document.fileUrl ? (
                <Box
                  component="iframe"
                  title={`PDF preview ${citationPreview.document.filename}`}
                  src={`${citationPreview.document.fileUrl}#page=${selectedCitation.pageNumber ?? 1}`}
                  sx={{
                    width: "100%",
                    height: { xs: 260, sm: 360 },
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.default"
                  }}
                />
              ) : null}
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.default",
                  p: 2,
                  maxHeight: 320,
                  overflow: "auto"
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {citationPreviewLoading
                    ? "กำลังโหลดตัวอย่างเอกสาร..."
                    : citationPreview?.document.chunks[0]?.content || selectedCitation.excerpt || "ไม่มีข้อความตัวอย่างสำหรับแหล่งอ้างอิงนี้"}
                </Typography>
              </Box>
              {citationPreview?.document ? (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    ไฟล์ {citationPreview.document.filename} · ทั้งหมด {citationPreview.document.chunkCount.toLocaleString()} chunks
                  </Typography>
                  <Button
                    href={`${citationPreview.document.fileUrl}#page=${selectedCitation.pageNumber ?? 1}`}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    startIcon={<OpenInNewOutlinedIcon fontSize="small" />}
                    sx={{ borderRadius: 999 }}
                  >
                    เปิดไฟล์ต้นฉบับ
                  </Button>
                </Stack>
              ) : null}
              {citationPreviewError ? (
                <Typography variant="caption" color="warning.main">
                  {citationPreviewError}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
