"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import { AppLogo } from "@/components/app/app-logo";
import type { AppView } from "@/components/app/types";

type TopBarProps = {
  view: AppView;
  sidebarOpen?: boolean;
  onOpenSidebar: () => void;
  onNewChat: () => void;
};

const titleByView: Record<AppView, string> = {
  chat: "แชทเอกสาร",
  upload: "อัปโหลดเอกสาร",
  usage: "การใช้งานโทเคน"
};

export function TopBar({ view, sidebarOpen = false, onOpenSidebar, onNewChat }: TopBarProps) {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<HTMLElement | null>(null);

  function openMobileMenu(event: MouseEvent<HTMLElement>) {
    setMobileMenuAnchor(event.currentTarget);
  }

  function closeMobileMenu() {
    setMobileMenuAnchor(null);
  }

  return (
    <>
      <Box
        component="header"
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 68,
          px: 3,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper"
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", minWidth: 0 }}>
          <AppLogo compact />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="h1">
              {titleByView[view]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              อัปโหลด เลือกเอกสาร แล้วถามหรือสรุปจากข้อมูลจริง
            </Typography>
          </Box>
        </Stack>
        <Stack component="nav" direction="row" spacing={1.25} aria-label="เครื่องมือ">
          <Button component={Link} href="/upload" variant="outlined" startIcon={<DriveFolderUploadOutlinedIcon />}>
            อัปโหลด
          </Button>
          <Button component={Link} href="/usage" variant="outlined" startIcon={<AnalyticsOutlinedIcon />}>
            โทเคน
          </Button>
          <Button component={Link} href="/admin" variant="outlined" startIcon={<AdminPanelSettingsOutlinedIcon />}>
            ตรวจระบบ
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
          aria-label="เปิด sidebar"
          aria-expanded={sidebarOpen}
        >
          <MenuOutlinedIcon sx={{ fontSize: 28 }} />
        </IconButton>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <AppLogo compact />
          <Typography variant="h6" component="div" noWrap>
            {titleByView[view]}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.25}>
          <IconButton type="button" onClick={onNewChat} aria-label="แชทใหม่">
            <AddCommentOutlinedIcon />
          </IconButton>
          <IconButton type="button" aria-label="เพิ่มเติม" aria-haspopup="menu" onClick={openMobileMenu}>
            <MoreHorizOutlinedIcon />
          </IconButton>
        </Stack>
      </Box>
      <Menu anchorEl={mobileMenuAnchor} open={Boolean(mobileMenuAnchor)} onClose={closeMobileMenu}>
        <MenuItem component={Link} href="/upload" onClick={closeMobileMenu}>
          อัปโหลดเอกสาร
        </MenuItem>
        <MenuItem component={Link} href="/usage" onClick={closeMobileMenu}>
          ดูการใช้งานโทเคน
        </MenuItem>
        <MenuItem component={Link} href="/admin" onClick={closeMobileMenu}>
          ตรวจสถานะระบบ
        </MenuItem>
      </Menu>
    </>
  );
}
