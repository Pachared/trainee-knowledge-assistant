"use client";

import { useState, type MouseEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import CloseFullscreenOutlinedIcon from "@mui/icons-material/CloseFullscreenOutlined";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import type { ApiChat } from "@/components/app/types";

type SidebarProps = {
  chats: ApiChat[];
  currentChatId?: string;
  search: string;
  userName: string;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  onClose?: () => void;
};

export function Sidebar({
  chats,
  currentChatId,
  search,
  userName,
  onSearchChange,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onClose
}: SidebarProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedChat, setSelectedChat] = useState<ApiChat | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openMenu(event: MouseEvent<HTMLElement>, chat: ApiChat) {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedChat(chat);
  }

  function closeMenu() {
    setMenuAnchor(null);
  }

  function beginRename() {
    if (!selectedChat) {
      return;
    }
    setRenameTitle(selectedChat.title);
    setRenameOpen(true);
    closeMenu();
  }

  async function submitRename() {
    if (!selectedChat || !renameTitle.trim()) {
      return;
    }
    await onRenameChat(selectedChat.id, renameTitle.trim());
    setRenameOpen(false);
    setSelectedChat(null);
  }

  function beginDelete() {
    if (!selectedChat) {
      closeMenu();
      return;
    }
    setDeleteOpen(true);
    closeMenu();
  }

  async function submitDelete() {
    if (!selectedChat) {
      setDeleteOpen(false);
      return;
    }

    const chatId = selectedChat.id;
    setDeleteOpen(false);
    setSelectedChat(null);
    await onDeleteChat(chatId);
  }

  return (
    <Box
      component="aside"
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        height: "100%",
        bgcolor: { xs: "background.paper", md: "#f7f7f8" },
        borderRight: 1,
        borderColor: "divider",
        p: 1.5
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", minHeight: 44, px: 1, pb: 1.75 }}>
        <Typography variant="h6" component="div">
          Knowledge AI
        </Typography>
        <IconButton type="button" onClick={onClose} aria-label="ปิด sidebar" size="small">
          <CloseFullscreenOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack spacing={1}>
        <Button
          type="button"
          onClick={onNewChat}
          fullWidth
          variant="text"
          startIcon={<AddCommentOutlinedIcon />}
          sx={{
            justifyContent: "flex-start",
            minHeight: 42,
            px: 1.5,
            color: "text.primary",
            bgcolor: "#e9eaed",
            "&:hover": { bgcolor: "#e1e2e6" }
          }}
        >
          แชทใหม่
        </Button>

        <TextField
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="พิมพ์คำค้นหา"
          label="ค้นหาแชท"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />
      </Stack>

      <Box component="section" aria-label="ประวัติแชท" sx={{ minHeight: 0, mt: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.25, mb: 1, fontWeight: 900 }}>
          ประวัติแชท
        </Typography>
        <List
          dense
          disablePadding
          sx={{
            display: "grid",
            gap: 0.75,
            maxHeight: "calc(100dvh - 292px)",
            overflowY: "auto"
          }}
        >
          {chats.length ? (
            chats.map((chat) => (
              <ListItemButton
                key={chat.id}
                selected={chat.id === currentChatId}
                onClick={() => onSelectChat(chat.id)}
                sx={{
                  minHeight: 42,
                  borderRadius: 1,
                  px: 1.25,
                  "&.Mui-selected": {
                    bgcolor: "#e9eaed"
                  },
                  "&.Mui-selected:hover, &:hover": {
                    bgcolor: "#e1e2e6"
                  }
                }}
              >
                <Typography variant="body2" noWrap sx={{ minWidth: 0, flex: 1, fontWeight: chat.id === currentChatId ? 800 : 500 }}>
                  {chat.title}
                </Typography>
                <IconButton
                  type="button"
                  aria-label={`จัดการแชท ${chat.title}`}
                  size="small"
                  onClick={(event) => openMenu(event, chat)}
                  sx={{ ml: 1, color: "text.secondary" }}
                >
                  <MoreHorizOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </ListItemButton>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1.25 }}>
              ยังไม่มีประวัติแชท
            </Typography>
          )}
        </List>
      </Box>

      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: "auto", px: 1, pt: 2, pb: 0.5 }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: "#111318", color: "#fff", fontWeight: 900 }}>
          {userName.slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 900 }}>
            {userName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Mock admin
          </Typography>
        </Box>
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={beginRename}>เปลี่ยนชื่อแชท</MenuItem>
        <MenuItem onClick={beginDelete} sx={{ color: "error.main" }}>
          ลบแชท
        </MenuItem>
      </Menu>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>เปลี่ยนชื่อแชท</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="ชื่อแชท"
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submitRename();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setRenameOpen(false)}>
            ยกเลิก
          </Button>
          <Button type="button" variant="contained" onClick={() => void submitRename()} disabled={!renameTitle.trim()}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>ลบแชท</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {`ต้องการลบแชท "${selectedChat?.title ?? ""}" และข้อความทั้งหมดในแชทนี้หรือไม่?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setDeleteOpen(false)}>
            ยกเลิก
          </Button>
          <Button type="button" variant="contained" color="error" onClick={() => void submitDelete()}>
            ลบแชท
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
