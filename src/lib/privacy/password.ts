const PBKDF2_ITERATIONS = 100_000;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt);
  return `${toBase64(salt)}:${toBase64(new Uint8Array(hash))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltPart, hashPart] = stored.split(":");
  if (!saltPart || !hashPart) return false;

  const salt = fromBase64(saltPart);
  const expected = fromBase64(hashPart);
  const actual = new Uint8Array(await deriveKey(password, salt));

  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i]! ^ expected[i]!;
  }
  return diff === 0;
}
