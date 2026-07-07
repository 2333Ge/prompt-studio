"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Eraser, Key, RefreshCw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAllData, initSeedData, resetAndSeed } from "@/lib/dev";
import { initPrivacyFeature } from "@/lib/dev/init-privacy-feature";
import { usePrivacyStore } from "@/lib/stores";

type DevAction = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  dangerous?: boolean;
  run: () => Promise<string>;
};

export function DevTools() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 3000);
  }, []);

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  const runAction = async (action: DevAction) => {
    if (busy) return;
    setBusy(action.id);
    try {
      const message = await action.run();
      showFeedback(message);
      router.refresh();
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(null);
    }
  };

  const actions: DevAction[] = [
    {
      id: "seed",
      label: "初始化示例数据",
      description: "覆盖写入 my-prompts 预埋数据",
      icon: <Database className="h-3.5 w-3.5" />,
      run: async () => {
        const result = await initSeedData();
        return `示例数据已加载（${result.imported} 条）`;
      },
    },
    {
      id: "reset-seed",
      label: "清空并重置",
      description: "清空数据库后重新导入示例",
      icon: <RefreshCw className="h-3.5 w-3.5" />,
      dangerous: true,
      run: async () => {
        if (!confirm("确定清空全部数据并重新导入示例？")) {
          return "已取消";
        }
        const result = await resetAndSeed();
        return `已重置（${result.imported} 条）`;
      },
    },
    {
      id: "clear",
      label: "清空数据库",
      description: "删除所有 Prompt 与关联数据",
      icon: <Eraser className="h-3.5 w-3.5" />,
      dangerous: true,
      run: async () => {
        if (!confirm("确定清空全部本地数据？")) {
          return "已取消";
        }
        await clearAllData();
        return "数据库已清空";
      },
    },
    {
      id: "init-privacy-feature",
      label: "初始化隐私功能",
      description: "初始化密码 12345687 并写入一条隐私数据",
      icon: <Key className="h-3.5 w-3.5" />,
      run: async () => {
        const { passwordHash, promptCreated } = await initPrivacyFeature();
        usePrivacyStore.setState({ passwordHash, privacyModeEnabled: false });
        return promptCreated
          ? "隐私功能已初始化（密码 12345687，已写入示例隐私 Prompt）"
          : "隐私功能已初始化（密码 12345687，隐私 Prompt 已存在）";
      },
    },
  ];

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-2">
      {feedback && (
        <div className="rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
          {feedback}
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-lg border border-amber-500/40 bg-popover shadow-lg transition-all duration-200",
          open
            ? "pointer-events-auto max-h-96 w-56 opacity-100"
            : "pointer-events-none max-h-0 w-0 border-0 opacity-0",
        )}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">DevTools</p>
          <p className="text-[10px] text-muted-foreground">仅开发环境可见</p>
        </div>
        <ul className="p-1">
          {actions.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                disabled={!!busy}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50",
                  action.dangerous && "text-destructive hover:bg-destructive/10",
                )}
                onClick={() => void runAction(action)}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  {action.icon}
                  {busy === action.id ? "处理中…" : action.label}
                </span>
                <span className="pl-5 text-[10px] text-muted-foreground">{action.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        aria-label="DevTools"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-700 shadow-md backdrop-blur-sm transition-transform hover:scale-105 dark:text-amber-300"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <Wrench className="h-4 w-4" />
      </button>
    </div>
  );
}
