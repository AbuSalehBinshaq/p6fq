import { beforeEach, describe, expect, it, vi } from "vitest";

const pgMock = vi.hoisted(() => {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = { connect: vi.fn(async () => client), query: vi.fn() };
  return { client, pool };
});

vi.mock("pg", () => ({
  Pool: class MockPool {
    connect = pgMock.pool.connect;
    query = pgMock.pool.query;
  },
}));

import { createRenderStoryOrder } from "./renderDb";

describe("createRenderStoryOrder transaction", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://test/database";
    pgMock.client.query.mockReset();
    pgMock.client.release.mockReset();
    pgMock.pool.connect.mockClear();
  });

  it("rolls back story_orders when story_productions insert fails", async () => {
    pgMock.client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // story_orders INSERT
      .mockRejectedValueOnce(new Error("story_productions insert failed"))
      .mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(createRenderStoryOrder({
      reference: "ST-ABCDEFGHIJ",
      childName: "ريان",
      childAge: 5,
      storyIdea: "رحلة إلى الفضاء",
      educationalValue: "الشجاعة",
      additionalNotes: "",
    })).rejects.toThrow("story_productions insert failed");

    expect(pgMock.pool.connect).toHaveBeenCalledOnce();
    expect(pgMock.client.query.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      expect.stringContaining("INSERT INTO story_orders"),
      expect.stringContaining("INSERT INTO story_productions"),
      "ROLLBACK",
    ]);
    expect(pgMock.client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(pgMock.client.release).toHaveBeenCalledOnce();
  });
});
