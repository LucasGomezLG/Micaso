import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";

const url =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

const LOCAL_DB_PATH = path.join(process.cwd(), ".data", "store.json");

async function readLocalStore(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeLocalStore(data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function dbGet<T>(key: string): Promise<T | null> {
  if (redis) {
    const value = await redis.get<T>(key);
    return value ?? null;
  }
  const store = await readLocalStore();
  return (store[key] as T) ?? null;
}

export async function dbSet<T>(key: string, value: T): Promise<void> {
  if (redis) {
    await redis.set(key, value);
    return;
  }
  const store = await readLocalStore();
  store[key] = value;
  await writeLocalStore(store);
}

/** True when reads/writes go to real Redis instead of the local dev file. */
export function isUsingRemoteDb(): boolean {
  return redis !== null;
}
