"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await response.json();

    setLoading(false);

    if (!response.ok || !payload.ok) {
      setError(payload.error?.message || "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    router.push(searchParams.get("next") || "/chat");
    router.refresh();
  }

  return (
    <Paper
      component="form"
      onSubmit={onSubmit}
      elevation={0}
      sx={{
        width: "min(100%, 420px)",
        border: 1,
        borderColor: "divider",
        p: { xs: 3, sm: 3.5 },
        boxShadow: "0 18px 48px rgba(17, 19, 24, 0.12)"
      }}
    >
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="h3" component="h1" sx={{ mb: 1 }}>
            เข้าสู่ Trainee Knowledge Assistant
          </Typography>
          <Typography color="text.secondary" variant="body2">
            ใช้บัญชี mock จากไฟล์ env เพื่อทดสอบระบบ login และ protected routes
          </Typography>
        </Box>

        <TextField
          id="username"
          label="USERNAME"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          placeholder="admin"
          fullWidth
        />

        <TextField
          id="password"
          label="PASSWORD"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="admin123"
          fullWidth
        />

        <Button type="submit" variant="contained" size="large" startIcon={<LoginOutlinedIcon />} disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
        </Button>

        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Paper>
  );
}
