"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import TipsAndUpdatesOutlinedIcon from "@mui/icons-material/TipsAndUpdatesOutlined";
import type { ApiDocument, ApiMessage } from "@/components/app/types";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";

type ChatViewProps = {
  messages: ApiMessage[];
  documents: ApiDocument[];
  streaming: boolean;
  status?: string;
  onSend: (message: string, documentId?: string) => void;
  onUpload: (file: File) => Promise<void>;
};

export function ChatView({ messages, documents, streaming, status, onSend, onUpload }: ChatViewProps) {
  const empty = messages.length === 0;

  return (
    <Box component="section" sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: { xs: 1.75, md: 3 }, pt: { xs: 1.75, md: 3 }, pb: 1.5 }}>
        {empty ? (
          <Box sx={{ display: "grid", minHeight: { xs: "54dvh", md: "58dvh" }, placeItems: "center", textAlign: "center" }}>
            <Box>
              <Typography variant="h3" component="h2" sx={{ mb: 1.25, textAlign: { xs: "left", md: "center" } }}>
                เริ่มจากตรงไหนกันดี
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 560, mx: "auto" }}>
                ถามคำถามทั่วไป หรืออัปโหลด PDF/TXT เพื่อให้ระบบค้นคืน context จาก Chroma ก่อนตอบ
              </Typography>
              <Stack
                direction="row"
                spacing={1.25}
                useFlexGap
                sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "center" }, mt: 3.25 }}
              >
                <Button variant="outlined" startIcon={<SearchOutlinedIcon />} onClick={() => onSend("อธิบาย RAG แบบเข้าใจง่าย")} sx={{ borderRadius: 999 }}>
                  RAG คืออะไร
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TipsAndUpdatesOutlinedIcon />}
                  onClick={() => onSend("ช่วยเขียน checklist สำหรับตรวจ assignment นี้")}
                  sx={{ borderRadius: 999 }}
                >
                  เขียน checklist
                </Button>
                <Button variant="outlined" startIcon={<ArticleOutlinedIcon />} onClick={() => onSend("สรุปเอกสารที่อัปโหลดล่าสุด")} sx={{ borderRadius: 999 }}>
                  สรุปไฟล์
                </Button>
                <Button variant="outlined" startIcon={<ImageOutlinedIcon />} onClick={() => onSend("แนะนำภาพรวม UX/UI ของระบบนี้")} sx={{ borderRadius: 999 }}>
                  UX/UI
                </Button>
              </Stack>
            </Box>
          </Box>
        ) : (
          <MessageList messages={messages} streaming={streaming} />
        )}
      </Box>
      {status ? (
        <Typography variant="caption" color="text.secondary" align="center" sx={{ mb: 0.75 }}>
          {status}
        </Typography>
      ) : null}
      <Composer
        documents={documents}
        disabled={streaming}
        onSend={onSend}
        onUpload={onUpload}
        onPrompt={(message, documentId) => onSend(message, documentId)}
      />
    </Box>
  );
}
