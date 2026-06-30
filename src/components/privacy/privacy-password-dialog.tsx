"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrivacyStore } from "@/lib/stores";

export function PrivacyPasswordDialog() {
  const passwordHash = usePrivacyStore((state) => state.passwordHash);
  const passwordDialogOpen = usePrivacyStore((state) => state.passwordDialogOpen);
  const closePasswordDialog = usePrivacyStore((state) => state.closePasswordDialog);
  const initPassword = usePrivacyStore((state) => state.initPassword);
  const verifyAndEnable = usePrivacyStore((state) => state.verifyAndEnable);

  const isInitializing = passwordHash === null;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closePasswordDialog();
      resetForm();
    }
  };

  const handleSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      if (isInitializing) {
        if (password.length < 4) {
          setError("密码至少 4 位");
          return;
        }
        if (password !== confirmPassword) {
          setError("两次输入的密码不一致");
          return;
        }
        await initPassword(password);
        resetForm();
      } else {
        const ok = await verifyAndEnable(password);
        if (!ok) {
          setError("密码错误");
          return;
        }
        resetForm();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={passwordDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isInitializing ? "初始化隐私密码" : "输入隐私密码"}</DialogTitle>
          <DialogDescription>
            {isInitializing
              ? "首次开启隐私模式，请设置访问密码。"
              : "开启隐私模式需要验证密码。"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="privacy-password">密码</Label>
            <Input
              id="privacy-password"
              type="password"
              value={password}
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSubmit();
              }}
            />
          </div>
          {isInitializing && (
            <div className="space-y-2">
              <Label htmlFor="privacy-password-confirm">确认密码</Label>
              <Input
                id="privacy-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSubmit();
                }}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? "验证中…" : isInitializing ? "设置并开启" : "确认开启"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
