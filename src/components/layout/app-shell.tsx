import { AppNav } from "@/components/layout/app-nav";
import { DevTools } from "@/components/dev/dev-tools";
import { PrivacyPasswordDialog } from "@/components/privacy/privacy-password-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen flex-col">
        <AppNav />
        <main className="flex-1">{children}</main>
        <PrivacyPasswordDialog />
        {process.env.NODE_ENV === "development" && <DevTools />}
      </div>
    </TooltipProvider>
  );
}
