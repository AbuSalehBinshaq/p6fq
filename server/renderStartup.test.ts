import { beforeEach, describe, expect, it, vi } from "vitest";
import { migrateRenderDatabase } from "./renderDb";
import { initializeRenderDatabase } from "./renderStartup";

vi.mock("./renderDb", () => ({
  migrateRenderDatabase: vi.fn(),
}));

describe("initializeRenderDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs the Render database migration before the server starts", async () => {
    await initializeRenderDatabase();

    expect(migrateRenderDatabase).toHaveBeenCalledOnce();
  });
});
