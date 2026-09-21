import { describe, expect, it } from "vitest";
import { isR2StorageKey, storageBackendForKey } from "./storage";

describe("storage backend routing", () => {
  it("routes story-order files to private R2", () => {
    expect(isR2StorageKey("story-orders/ST-ABCDEFGHIJ/random.jpg")).toBe(true);
    expect(storageBackendForKey("story-orders/ST-ABCDEFGHIJ/random.jpg")).toBe("r2");
    expect(storageBackendForKey("/story-orders/ST-ABCDEFGHIJ/random.jpg")).toBe("r2");
  });

  it("keeps generated and legacy files on Forge", () => {
    expect(isR2StorageKey("generated/1720000000.png")).toBe(false);
    expect(storageBackendForKey("generated/1720000000.png")).toBe("forge");
    expect(storageBackendForKey("uploads/example.png")).toBe("forge");
  });

  it("does not classify a similarly named non-story path as R2", () => {
    expect(storageBackendForKey("story-order-archive/example.jpg")).toBe("forge");
  });
});
