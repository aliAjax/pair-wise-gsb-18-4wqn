// 持久化：记录、排班状态、页面状态分开维护，各自独立命名空间
const KEYS = {
  records: "dental-ledger:records:v1",
  schedule: "dental-ledger:schedule:v1",
  ui: "dental-ledger:ui:v1",
} as const;

export type StoreKey = keyof typeof KEYS;

export function loadStore<T>(key: StoreKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export function saveStore(key: StoreKey, value: unknown): void {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // 存储不可用时静默降级为内存态
  }
}

export function clearAllStores(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
