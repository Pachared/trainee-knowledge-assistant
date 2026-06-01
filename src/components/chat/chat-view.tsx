"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <Box component="section" sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Box ref={scrollRef} sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: { xs: 2, md: 4 }, pt: { xs: 2, md: 4 }, pb: 2 }}>
        {empty ? (
          <Box sx={{ display: "grid", minHeight: { xs: "52dvh", md: "56dvh" }, placeItems: "center" }}>
            <Box sx={{ width: "min(100%, 720px)", textAlign: { xs: "left", md: "center" } }}>
              <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>
                เริ่มแชทจากเอกสารของคุณ
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 620, mx: { xs: 0, md: "auto" } }}>
                อัปโหลด PDF/TXT แล้วเลือกเอกสารในช่องด้านล่างเพื่อถามหรือสรุปจากเนื้อหาจริง ระบบจะแสดงคำตอบพร้อมอ้างอิงจาก context ที่ค้นได้
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                useFlexGap
                sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", md: "center" }, mt: 3.5 }}
              >
                <Button component={Link} href="/upload" variant="contained" startIcon={<DriveFolderUploadOutlinedIcon />} sx={{ borderRadius: 999 }}>
                  อัปโหลดเอกสาร
                </Button>
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
              </Stack>
            </Box>
          </Box>
        ) : (
          <MessageList messages={messages} streaming={streaming} />
        )}
      </Box>
      {status ? (
        <Typography variant="caption" color="text.secondary" align="center" sx={{ px: 2, mb: 1 }}>
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
