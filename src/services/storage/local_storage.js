// Storage can be disabled in private windows or full on shared devices.
// Keep the demo usable in memory when the browser cannot save a value.
export function createSafeStorage(storage) {
  const memory = new Map();
  const memoryOnlyKeys = new Set();
  const resolveStorage = () => (typeof storage === 'function' ? storage() : storage);

  const adapter = {
    getItem(key) {
      if (memoryOnlyKeys.has(key)) return memory.get(key) ?? null;
      try {
        const backing = resolveStorage();
        if (!backing) return memory.get(key) ?? null;
        const value = backing.getItem(key);
        if (value === null) memory.delete(key);
        else memory.set(key, value);
        return value;
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      const serialized = String(value);
      memory.set(key, serialized);
      try {
        const backing = resolveStorage();
        if (!backing) throw new Error('Storage unavailable');
        backing.setItem(key, serialized);
        memoryOnlyKeys.delete(key);
      } catch {
        memoryOnlyKeys.add(key);
      }
    },
    removeItem(key) {
      memory.delete(key);
      try {
        const backing = resolveStorage();
        if (!backing) throw new Error('Storage unavailable');
        backing.removeItem(key);
        memoryOnlyKeys.delete(key);
      } catch {
        // A failed removal must not restore a stale session on the next read.
        memoryOnlyKeys.add(key);
      }
    },
    readJSON(key, fallback = null) {
      const value = adapter.getItem(key);
      if (value === null) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        adapter.removeItem(key);
        return fallback;
      }
    },
    writeJSON(key, value) {
      adapter.setItem(key, JSON.stringify(value));
    },
  };

  return adapter;
}

export const localStore = createSafeStorage(() => globalThis.localStorage);
export const sessionStore = createSafeStorage(() => globalThis.sessionStorage);
