import { getDb } from "@/lib/db";
import { importExportRepository } from "@/lib/repositories/dexie-repositories";
import { SEED_BUNDLE } from "./seed-data";

const SEED_FLAG_KEY = "prompt-studio-seed-v1";

/** 首次打开且数据库为空时，导入 my-prompts.md 示例数据 */
export async function seedIfEmpty(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(SEED_FLAG_KEY)) return false;

  const db = getDb();
  const count = await db.prompts.count();
  if (count > 0) return false;

  await importExportRepository.importBundle(SEED_BUNDLE, "overwrite");
  localStorage.setItem(SEED_FLAG_KEY, "1");
  return true;
}

/** 手动重新加载示例数据（Settings 等场景可用） */
export async function reloadSeedData(): Promise<void> {
  await importExportRepository.importBundle(SEED_BUNDLE, "skip");
}

/** 测试用：强制覆盖写入示例数据 */
export async function forceReloadSeedData(): Promise<{ imported: number; skipped: number }> {
  localStorage.setItem(SEED_FLAG_KEY, "1");
  return importExportRepository.importBundle(SEED_BUNDLE, "overwrite");
}
