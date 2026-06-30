import { AppNav } from "@/components/layout/app-nav";
import { DevTools } from "@/components/dev/dev-tools";
import { PrivacyPasswordDialog } from "@/components/privacy/privacy-password-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <main className="flex-1">{children}</main>
      <PrivacyPasswordDialog />
      {process.env.NODE_ENV === "development" && <DevTools />}
    </div>
  );
}
