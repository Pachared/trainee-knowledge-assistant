"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import type { ApiMessage } from "@/components/app/types";

type MessageListProps = {
  messages: ApiMessage[];
  streaming?: boolean;
};

export function MessageList({ messages, streaming }: MessageListProps) {
  return (
    <Stack sx={{ width: "min(100%, 920px)", mx: "auto" }}>
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <Stack
            key={message.id}
            component="article"
            spacing={1}
            sx={{
              my: 2.75,
              alignItems: isUser ? "flex-end" : "flex-start"
            }}
          >
            <Box
              sx={{
                maxWidth: isUser ? "min(720px, 88%)" : "min(100%, 760px)",
                borderRadius: isUser ? 999 : 0,
                bgcolor: isUser ? "primary.main" : "transparent",
                color: isUser ? "primary.contrastText" : "text.primary",
                px: isUser ? 2 : 0,
                py: isUser ? 1.35 : 0,
                typography: "body1",
                overflowWrap: "anywhere"
              }}
            >
              {isUser ? (
                message.content
              ) : (
                <Box className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content || (streaming ? "กำลังคิด..." : "")}
                  </ReactMarkdown>
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
                </>
              )}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
