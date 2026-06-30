"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderTree, Home, Moon, Settings, Sparkles, Sun, Tags } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrivacyStore } from "@/lib/stores";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/prompts", label: "Prompts", icon: Sparkles },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { privacyModeEnabled, registerSecretTap, showPrivacyToggle } = usePrivacyStore();

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-6">
        <button
          type="button"
          className="flex items-center gap-2 font-semibold"
          onClick={registerSecretTap}
          aria-label="Prompt Studio"
        >
          <Sparkles className="h-5 w-5" />
          Prompt Studio
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {showPrivacyToggle && (
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs",
              privacyModeEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {privacyModeEnabled ? "隐私模式" : "普通模式"}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
