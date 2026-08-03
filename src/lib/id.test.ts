import { afterEach, describe, expect, it, vi } from "vitest";
import { createId } from "./id";
const originalCrypto = globalThis.crypto;
afterEach(() =>
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: originalCrypto,
  }),
);
describe("createId", () => {
  it("uses native randomUUID when available", () => {
    const randomUUID = vi.fn(() => "native-id");
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID },
    });
    expect(createId()).toBe("native-id");
    expect(randomUUID).toHaveBeenCalledOnce();
  });
  it("creates UUID v4 with getRandomValues fallback", () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) => {
          bytes.forEach((_, index) => {
            bytes[index] = index;
          });
          return bytes;
        },
      },
    });
    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
  it("returns non-empty unique IDs without Web Crypto", () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
    });
    const ids = new Set(Array.from({ length: 30 }, createId));
    expect(ids.size).toBe(30);
    expect(Array.from(ids).every(Boolean)).toBe(true);
  });
});
