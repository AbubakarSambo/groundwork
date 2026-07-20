import '@testing-library/jest-dom/vitest'

// This jsdom/vitest/Node combination does not construct window.localStorage
// (nor sessionStorage) at all - confirmed by direct probe, not assumed. Any
// test that imports something touching localStorage (zustand's persist
// middleware, most auth-aware components) fails with "Cannot read properties
// of undefined" without this. A minimal in-memory polyfill, installed once
// here so every test file gets it regardless of import order.
if (typeof window !== 'undefined' && !window.localStorage) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>()
    get length() { return this.store.size }
    clear() { this.store.clear() }
    getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null }
    key(index: number) { return Array.from(this.store.keys())[index] ?? null }
    removeItem(key: string) { this.store.delete(key) }
    setItem(key: string, value: string) { this.store.set(key, String(value)) }
  }
  Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true })
  Object.defineProperty(window, 'sessionStorage', { value: new MemoryStorage(), configurable: true })
}
