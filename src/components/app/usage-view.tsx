"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import type { ApiUsage } from "@/components/app/types";

type UsageViewProps = {
  usage: ApiUsage[];
};

export function UsageView({ usage }: UsageViewProps) {
  const total = usage.reduce((sum, item) => sum + item.totalTokens, 0);

  return (
    <Box component="section" sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: { xs: 1.75, md: 3 }, py: { xs: 2.75, md: 4 } }}>
        <Box sx={{ width: "min(100%, 920px)", mx: "auto" }}>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
            Token Usage
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            แสดง token ต่อ session และเก็บ prompt/completion token ของแต่ละคำตอบใน SQLite
          </Typography>

          <Paper elevation={0} sx={{ border: 1, borderColor: "divider", p: 3, mb: 2.25 }}>
            <Chip icon={<TollOutlinedIcon />} label={`Total ${total.toLocaleString()} tokens`} sx={{ width: "100%", justifyContent: "center" }} />
          </Paper>

          <Stack spacing={1.25}>
            {usage.length ? (
              usage.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
                    gap: 1.75,
                    alignItems: "center",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1.75
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.messageCount} assistant messages
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${item.promptTokens.toLocaleString()} in / ${item.completionTokens.toLocaleString()} out`} />
                </Paper>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                ยังไม่มีข้อมูล token usage
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
