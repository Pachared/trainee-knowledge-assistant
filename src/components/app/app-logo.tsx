"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type AppLogoProps = {
  compact?: boolean;
};

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <Box aria-label="Knowledge AI ผู้ช่วยสรุปเอกสาร" sx={{ display: "inline-flex", alignItems: "center", gap: 1.15, minWidth: 0 }}>
      <Box
        aria-hidden="true"
        sx={{
          position: "relative",
          display: "grid",
          width: compact ? 34 : 38,
          height: compact ? 34 : 38,
          flex: "0 0 auto",
          placeItems: "center",
          borderRadius: 2,
          color: "primary.contrastText",
          bgcolor: "primary.main",
          boxShadow: "0 10px 24px rgba(20, 184, 166, 0.28)"
        }}
      >
        <Box
          component="span"
          sx={{
            width: compact ? 16 : 18,
            height: compact ? 16 : 18,
            border: "2px solid currentColor",
            borderRadius: "50%",
            "&::after": {
              content: '""',
              position: "absolute",
              width: 9,
              height: 2,
              borderRadius: 999,
              bgcolor: "currentColor",
              transform: "translate(11px, 14px) rotate(45deg)"
            }
          }}
        />
        <Box
          component="span"
          sx={{
            position: "absolute",
            right: compact ? 7 : 8,
            top: compact ? 7 : 8,
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "accent.main"
          }}
        />
      </Box>
      {!compact ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" component="div" noWrap lang="en" sx={{ lineHeight: 1.15 }}>
            Knowledge AI
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            ผู้ช่วยสรุปเอกสาร
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
