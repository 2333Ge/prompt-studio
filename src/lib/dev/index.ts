import { getDb } from "@/lib/db";
import { forceReloadSeedData } from "@/lib/seed";

const SEED_FLAG_KEY = "prompt-studio-seed-v1";

export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    [db.prompts, db.categories, db.tags, db.promptTags, db.variableSchemas, db.versions, db.results],
    async () => {
      await Promise.all([
        db.prompts.clear(),
        db.categories.clear(),
        db.tags.clear(),
        db.promptTags.clear(),
        db.variableSchemas.clear(),
        db.versions.clear(),
        db.results.clear(),
      ]);
    },
  );
  localStorage.removeItem(SEED_FLAG_KEY);
}

export async function initSeedData(): Promise<{ imported: number; skipped: number }> {
  return forceReloadSeedData();
}

export async function resetAndSeed(): Promise<{ imported: number; skipped: number }> {
  await clearAllData();
  return forceReloadSeedData();
}
