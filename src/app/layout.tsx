import type { Metadata } from "next";
import { AppProviders } from "@/theme/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trainee Knowledge Assistant",
  description: "Next.js RAG chat app with Prisma, SQLite, Chroma, and OpenAI"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
