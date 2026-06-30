"use client";

import { useEffect, useState } from "react";
import { getDb } from "@/lib/db";
import { migrateFlatTagNames } from "@/lib/db/migrate-tags";
import { seedIfEmpty } from "@/lib/seed";

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getDb()
      .open()
      .then(() => migrateFlatTagNames())
      .then(() => seedIfEmpty())
      .then(() => setReady(true))
      .catch(console.error);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        正在初始化本地数据库...
      </div>
    );
  }

  return <>{children}</>;
}
