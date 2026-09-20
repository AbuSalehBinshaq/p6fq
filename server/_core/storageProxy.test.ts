import { describe, expect, it } from "vitest";
import { isSensitiveStoryStorageKey, registerStorageProxy } from "./storageProxy";

describe("storage proxy security boundary", () => {
  it("blocks direct public keys for story-order photos", () => {
    expect(isSensitiveStoryStorageKey("story-orders/ST-ABCDEFGHIJ/random.jpg")).toBe(true);
    expect(isSensitiveStoryStorageKey("story-orders")).toBe(true);
  });

  it("returns 404 before Forge access for a sensitive path", async () => {
    let handler: ((req: any, res: any) => Promise<void>) | undefined;
    registerStorageProxy({ get: (_path: string, callback: typeof handler) => { handler = callback; } } as never);
    const response = { statusCode: 200, body: "", status(code: number) { this.statusCode = code; return this; }, send(value: string) { this.body = value; return this; } };
    await handler?.({ params: { 0: "story-orders/ST-ABCDEFGHIJ/random.jpg" } }, response);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("Not found");
  });

  it("keeps legacy generated storage paths outside the sensitive boundary", () => {
    expect(isSensitiveStoryStorageKey("generated/1720000000.png")).toBe(false);
    expect(isSensitiveStoryStorageKey("uploads/example.png")).toBe(false);
  });
});
