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
            การใช้งานโทเคน
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5 }}>
            ดูจำนวนโทเคนที่ใช้ในแต่ละแชท เพื่อประเมินปริมาณการใช้งาน OpenAI
          </Typography>

          <Paper elevation={0} sx={{ border: 1, borderColor: "divider", p: { xs: 2.25, md: 3 }, mb: 2.5 }}>
            <Chip
              icon={<TollOutlinedIcon />}
              label={`รวม ${total.toLocaleString()} โทเคน`}
              sx={{ width: "100%", justifyContent: "center" }}
            />
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
                      คำตอบจาก AI {item.messageCount} ข้อความ
                    </Typography>
                  </Box>
                  <Chip size="small" label={`เข้า ${item.promptTokens.toLocaleString()} / ออก ${item.completionTokens.toLocaleString()}`} />
                </Paper>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                ยังไม่มีข้อมูลโทเคน เริ่มแชทก่อนแล้วข้อมูลจะแสดงที่นี่
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
