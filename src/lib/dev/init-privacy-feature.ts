import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/privacy/password";

const DEV_PRIVATE_PROMPT_ID = "dev-private-prompt";
const DEV_PASSWORD = "12345687";

export async function initPrivacyFeature(): Promise<{ passwordHash: string; promptCreated: boolean }> {
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const db = getDb();
  const existing = await db.prompts.get(DEV_PRIVATE_PROMPT_ID);
  let promptCreated = false;

  if (!existing) {
    const timestamp = new Date().toISOString();
    await db.prompts.add({
      id: DEV_PRIVATE_PROMPT_ID,
      title: "示例隐私 Prompt",
      content: "这是一条仅隐私模式下可见的示例 Prompt，用于开发测试。",
      notes: "DevTools 初始化隐私功能时写入",
      categoryId: null,
      rating: 0,
      isFavorite: false,
      isPrivate: true,
      schemaId: null,
      currentVersionId: null,
      mediaRefs: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      lastUsedAt: null,
    });
    promptCreated = true;
  }

  return { passwordHash, promptCreated };
}
