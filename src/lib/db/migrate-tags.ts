import { getDb } from "@/lib/db";

const MIGRATION_KEY = "prompt-studio-flat-tags-v1";

/** 将「分类--名称」格式的标签名转为纯名称 */
export function flattenTagName(name: string): string {
  const idx = name.indexOf("--");
  return idx === -1 ? name : name.slice(idx + 2).trim();
}

/** 一次性迁移：去掉标签二级命名前缀，合并重复标签 */
export async function migrateFlatTagNames(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const db = getDb();
  const tags = await db.tags.toArray();
  const needsUpdate = tags.filter((tag) => flattenTagName(tag.name) !== tag.name);
  if (needsUpdate.length === 0) {
    localStorage.setItem(MIGRATION_KEY, "1");
    return;
  }

  await db.transaction("rw", [db.tags, db.promptTags], async () => {
    const allTags = await db.tags.toArray();
    const nameToTag = new Map<string, (typeof allTags)[number]>();

    for (const tag of allTags) {
      const key = tag.name.toLowerCase();
      if (!nameToTag.has(key)) {
        nameToTag.set(key, tag);
      }
    }

    for (const tag of needsUpdate) {
      const flatName = flattenTagName(tag.name);
      const flatKey = flatName.toLowerCase();
      const existing = nameToTag.get(flatKey);

      if (existing && existing.id !== tag.id) {
        const links = await db.promptTags.where("tagId").equals(tag.id).toArray();
        for (const link of links) {
          const duplicate = await db.promptTags
            .where("[promptId+tagId]")
            .equals([link.promptId, existing.id])
            .first();
          if (duplicate) {
            await db.promptTags.delete(link.id);
          } else {
            await db.promptTags.update(link.id, { tagId: existing.id });
          }
        }
        await db.tags.delete(tag.id);
      } else {
        await db.tags.update(tag.id, { name: flatName });
        nameToTag.set(flatKey, { ...tag, name: flatName });
      }
    }
  });

  localStorage.setItem(MIGRATION_KEY, "1");
}
