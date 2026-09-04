/**
 * JSON Layer —— 复用 zustand createJSONStorage（JSON.stringify/parse）。
 *
 * SSR-safe lazy resolve：storage 解析延迟到首次 get/set（浏览器执行时），
 * 创建 adapter 不访问 window，避免 Next SSR/build/import 崩溃。
 *
 * namespace 由 persist name 承载（如 community-go.shell），adapter 不加前缀，
 * 避免双重前缀导致 key 漂移。
 */
import { createJSONStorage, type PersistStorage } from 'zustand/middleware';

import type { StateStorage, UnavailablePolicy, WebStorageKind } from './types';

/** 浏览器不可用策略：默认 error（不静默降级 memory，防 Server memory + Client localStorage 双事实源）。 */
function resolveWebStorage(
  kind: WebStorageKind,
  policy: UnavailablePolicy,
): StateStorage | undefined {
  if (typeof window === 'undefined' || !window[kind]) {
    if (policy === 'error') {
      throw new Error(
        `Storage unavailable: ${kind} 在非法环境不可用；请显式配置 unavailablePolicy 或使用 memory storage`,
      );
    }
    if (policy === 'noop') {
      return {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      };
    }
    return undefined;
  }
  const store = window[kind];
  return {
    getItem: (name) => store.getItem(name),
    setItem: (name, value) => {
      store.setItem(name, value);
      return undefined;
    },
    removeItem: (name) => {
      store.removeItem(name);
      return undefined;
    },
  };
}

/** 创建 JSON PersistStorage（lazy resolve Web Storage + JSON 序列化）。 */
export function createJsonStorage<S = unknown>(
  kind: WebStorageKind,
  options?: Readonly<{ unavailablePolicy?: UnavailablePolicy }>,
): PersistStorage<S> {
  const policy = options?.unavailablePolicy ?? 'error';
  const storage = createJSONStorage<S>(() => {
    const resolved = resolveWebStorage(kind, policy);
    if (!resolved) {
      // policy === 'memory' 分支：调用方应显式改用 createMemoryStorage，这里明确报错而非静默。
      throw new Error(`Storage unavailable: ${kind}（policy=memory 需显式使用 memory storage）`);
    }
    return resolved;
  });
  if (!storage) throw new Error(`Storage unavailable: ${kind} createJSONStorage 初始化失败`);
  return storage;
}
