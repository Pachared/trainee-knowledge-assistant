"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import type { AppView } from "@/components/app/types";

type TopBarProps = {
  view: AppView;
  sidebarOpen?: boolean;
  onOpenSidebar: () => void;
  onNewChat: () => void;
};

const titleByView: Record<AppView, string> = {
  chat: "เริ่มจากตรงไหนกันดี",
  upload: "อัปโหลดเอกสาร",
  usage: "Token Usage"
};

export function TopBar({ view, sidebarOpen = false, onOpenSidebar, onNewChat }: TopBarProps) {
  return (
    <>
      <Box
        component="header"
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 62,
          px: 2.75,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper"
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{ fontSize: 18, lineHeight: 1.2, fontWeight: 900 }}>
            {titleByView[view]}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Next.js API Routes + Prisma + SQLite + Chroma + OpenAI
          </Typography>
        </Box>
        <Stack component="nav" direction="row" spacing={1} aria-label="เครื่องมือ">
          <Button component={Link} href="/upload" variant="outlined" startIcon={<DriveFolderUploadOutlinedIcon />}>
            อัปโหลด
          </Button>
          <Button component={Link} href="/usage" variant="outlined" startIcon={<AnalyticsOutlinedIcon />}>
            Token usage
          </Button>
          <Button type="button" variant="outlined" onClick={onNewChat} startIcon={<EditOutlinedIcon />}>
            แชทใหม่
          </Button>
        </Stack>
      </Box>

      <Box
        component="header"
        sx={{
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 64,
          px: 1.75,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper"
        }}
      >
        <IconButton
          type="button"
          onClick={onOpenSidebar}
          onPointerDown={onOpenSidebar}
          onTouchStart={onOpenSidebar}
          aria-label="เปิด sidebar"
          aria-expanded={sidebarOpen}
        >
          <MenuOutlinedIcon sx={{ fontSize: 28 }} />
        </IconButton>
        <Typography component="div" sx={{ fontSize: 18, fontWeight: 900 }} noWrap>
          {titleByView[view]}
        </Typography>
        <Stack direction="row" spacing={0.25}>
          <IconButton type="button" onClick={onNewChat} aria-label="แชทใหม่">
            <AddCommentOutlinedIcon />
          </IconButton>
          <IconButton type="button" aria-label="เพิ่มเติม">
            <MoreHorizOutlinedIcon />
          </IconButton>
        </Stack>
      </Box>
    </>
  );
}
