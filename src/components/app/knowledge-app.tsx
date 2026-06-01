"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import type { ApiChat, ApiDocument, ApiMessage, ApiUsage, AppView } from "@/components/app/types";
import { Sidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/top-bar";
import { ChatView } from "@/components/chat/chat-view";
import { UploadView } from "@/components/app/upload-view";
import { UsageView } from "@/components/app/usage-view";

type KnowledgeAppProps = {
  view: AppView;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message || "Request failed");
  }

  return payload.data;
}

function parseSseBlock(block: string) {
  const event = block
    .split("\n")
    .find((line) => line.startsWith("event:"))
    ?.replace("event:", "")
    .trim();
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace("data:", "").trim())
    .join("\n");

  return {
    event,
    data: data ? JSON.parse(data) : null
  };
}

export function KnowledgeApp({ view }: KnowledgeAppProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("admin");
  const [chats, setChats] = useState<ApiChat[]>([]);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [usage, setUsage] = useState<ApiUsage[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("");

  const loadChats = useCallback(async (query = "") => {
    const data = await fetchJson<{ chats: ApiChat[] }>(`/api/chats${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setChats(data.chats);
  }, []);

  const loadDocuments = useCallback(async () => {
    const data = await fetchJson<{ documents: ApiDocument[] }>("/api/documents");
    setDocuments(data.documents);
  }, []);

  const loadUsage = useCallback(async () => {
    const data = await fetchJson<{ usage: ApiUsage[] }>("/api/usage");
    setUsage(data.usage);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await fetchJson<{ user: { username: string } | null }>("/api/auth/me");
        if (me.user?.username) {
          setUserName(me.user.username);
        }
        await Promise.all([loadChats(""), loadDocuments(), loadUsage()]);
      } catch {
        router.push("/login");
      }
    }

    void bootstrap();
  }, [loadChats, loadDocuments, loadUsage, router]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadChats(search);
    }, 200);

    return () => window.clearTimeout(handle);
  }, [loadChats, search]);

  useEffect(() => {
    const hasActiveDocumentJob = documents.some((document) => ["queued", "processing"].includes(document.status));

    if (!hasActiveDocumentJob) {
      return;
    }

    const handle = window.setInterval(() => {
      void loadDocuments();
    }, 3000);

    return () => window.clearInterval(handle);
  }, [documents, loadDocuments]);

  async function selectChat(chatId: string) {
    setCurrentChatId(chatId);
    setDrawerOpen(false);
    const data = await fetchJson<{ chat: ApiChat & { messages: ApiMessage[] } }>(`/api/chats/${chatId}/messages`);
    setMessages(data.chat.messages);
    router.push("/chat");
  }

  function newChat() {
    setCurrentChatId(undefined);
    setMessages([]);
    setStatus("");
    setDrawerOpen(false);
    router.push("/chat");
  }

  async function renameChat(chatId: string, title: string) {
    try {
      const data = await fetchJson<{ chat: ApiChat }>(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      setChats((previous) => previous.map((chat) => (chat.id === chatId ? { ...chat, title: data.chat.title } : chat)));
      setStatus("เปลี่ยนชื่อแชทเรียบร้อย");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "เปลี่ยนชื่อแชทไม่สำเร็จ");
    }
  }

  async function deleteChat(chatId: string) {
    try {
      await fetchJson<{ deleted: boolean }>(`/api/chats/${chatId}`, {
        method: "DELETE"
      });
      setChats((previous) => previous.filter((chat) => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(undefined);
        setMessages([]);
      }
      setStatus("ลบแชทเรียบร้อย");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ลบแชทไม่สำเร็จ");
    }
  }

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    setStatus("กำลังประมวลผลเอกสาร...");

    try {
      const data = await fetchJson<{ document: ApiDocument }>("/api/upload", {
        method: "POST",
        body: formData
      });
      await loadDocuments();
      setStatus(
        data.document.failedReason
          ? `อัปโหลดแล้ว แต่มีข้อควรตรวจสอบ: ${data.document.failedReason}`
          : "อัปโหลดแล้ว ระบบกำลังประมวลผลเอกสาร"
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ");
    }
  }

  async function deleteDocument(documentId: string) {
    try {
      await fetchJson<{ deleted: boolean }>(`/api/documents/${documentId}`, {
        method: "DELETE"
      });
      await loadDocuments();
      setStatus("ลบเอกสารเรียบร้อย");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "ลบเอกสารไม่สำเร็จ");
    }
  }

  async function reindexDocument(documentId: string) {
    try {
      const response = await fetch(`/api/documents/${documentId}/reindex`, { method: "POST" });
      const payload = (await response.json()) as ApiEnvelope<{ document: ApiDocument }>;

      await loadDocuments();

      if (!response.ok || !payload.ok) {
        const details = payload.error?.details as { document?: ApiDocument } | undefined;
        setStatus(details?.document?.failedReason || payload.error?.message || "re-index Chroma ไม่สำเร็จ");
        return;
      }

      setStatus(payload.data?.document.failedReason || "re-index Chroma เรียบร้อย");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "re-index Chroma ไม่สำเร็จ");
      await loadDocuments();
    }
  }

  async function reindexAllDocuments() {
    try {
      const data = await fetchJson<{
        result: {
          total: number;
          succeeded: number;
          failed: number;
        };
      }>("/api/documents/reindex", {
        method: "POST"
      });
      await loadDocuments();

      if (data.result.total === 0) {
        setStatus("ไม่มีเอกสารที่ต้อง re-index");
        return;
      }

      setStatus(
        data.result.failed
          ? `re-index สำเร็จ ${data.result.succeeded} รายการ และไม่สำเร็จ ${data.result.failed} รายการ`
          : `re-index Chroma สำเร็จ ${data.result.succeeded} รายการ`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "re-index Chroma ทั้งหมดไม่สำเร็จ");
      await loadDocuments();
    }
  }

  async function sendMessage(message: string, documentId?: string) {
    if (streaming) {
      return;
    }

    const userMessage: ApiMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: message,
      promptTokens: 0,
      outputTokens: 0,
      createdAt: new Date().toISOString()
    };
    const assistantMessage: ApiMessage = {
      id: `local-assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      promptTokens: 0,
      outputTokens: 0,
      createdAt: new Date().toISOString()
    };

    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    setStreaming(true);
    setStatus("กำลังสร้างคำตอบ...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentChatId,
          message,
          documentId
        })
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
        throw new Error(payload?.error?.message || "ส่งข้อความไม่สำเร็จ");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) {
            continue;
          }

          const parsed = parseSseBlock(block);

          if (parsed.event === "meta") {
            setCurrentChatId(parsed.data.chatId);
          }

          if (parsed.event === "delta") {
            const chunk = parsed.data.content as string;
            setMessages((previous) =>
              previous.map((item) =>
                item.id === assistantMessage.id ? { ...item, content: `${item.content}${chunk}` } : item
              )
            );
          }

          if (parsed.event === "done") {
            const saved = parsed.data.message as ApiMessage;
            setMessages((previous) => previous.map((item) => (item.id === assistantMessage.id ? saved : item)));
          }

          if (parsed.event === "error") {
            throw new Error(parsed.data.message);
          }
        }
      }

      setStatus("");
      await Promise.all([loadChats(""), loadUsage()]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
      setMessages((previous) =>
        previous.map((item) =>
          item.id === assistantMessage.id
            ? { ...item, content: "ไม่สามารถสร้างคำตอบได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง" }
            : item
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  const filteredChats = useMemo(() => chats, [chats]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "292px minmax(0, 1fr)" },
        height: "100dvh",
        bgcolor: "background.default"
      }}
    >
      <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, height: "100dvh" }}>
        <Sidebar
          chats={filteredChats}
          currentChatId={currentChatId}
          search={search}
          userName={userName}
          onSearchChange={setSearch}
          onNewChat={newChat}
          onSelectChat={selectChat}
          onRenameChat={renameChat}
          onDeleteChat={deleteChat}
        />
      </Box>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: "min(82vw, 360px)",
              borderRadius: 0,
              overflow: "hidden"
            }
          }
        }}
        sx={{ display: { xs: "block", md: "none" } }}
      >
        <Sidebar
          chats={filteredChats}
          currentChatId={currentChatId}
          search={search}
          userName={userName}
          onSearchChange={setSearch}
          onNewChat={newChat}
          onSelectChat={selectChat}
          onRenameChat={renameChat}
          onDeleteChat={deleteChat}
          onClose={() => setDrawerOpen(false)}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100dvh",
          bgcolor: "background.default"
        }}
      >
        <TopBar view={view} sidebarOpen={drawerOpen} onOpenSidebar={() => setDrawerOpen(true)} onNewChat={newChat} />
        {view === "chat" ? (
          <ChatView
            messages={messages}
            documents={documents}
            streaming={streaming}
            status={status}
            onSend={sendMessage}
            onUpload={uploadFile}
          />
        ) : null}
        {view === "upload" ? (
          <UploadView
            documents={documents}
            status={status}
            onUpload={uploadFile}
            onDeleteDocument={deleteDocument}
            onReindexDocument={reindexDocument}
            onReindexAllDocuments={reindexAllDocuments}
          />
        ) : null}
        {view === "usage" ? <UsageView usage={usage} /> : null}
      </Box>
    </Box>
  );
}
