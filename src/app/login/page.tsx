import { Suspense } from "react";
import Box from "@mui/material/Box";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <Box
      component="main"
      sx={{
        display: "grid",
        minHeight: "100dvh",
        placeItems: "center",
        bgcolor: "background.default",
        p: 3
      }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </Box>
  );
}
