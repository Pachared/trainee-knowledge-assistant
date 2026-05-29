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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <style>
          {"@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap');"}
        </style>
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
