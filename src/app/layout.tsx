import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DbProvider } from "@/components/providers/db-provider";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Studio",
  description: "Local-first prompt management workbench",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <DbProvider>
            <AppShell>{children}</AppShell>
          </DbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
