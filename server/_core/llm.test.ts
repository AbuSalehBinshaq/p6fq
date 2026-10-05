import { afterEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  ENV: {
    llmApiBase: "https://api.deepseek.com",
    llmApiKey: "test-key",
    llmModel: "deepseek-flash",
  },
}));

vi.mock("./env", () => env);

import { invokeLLM, listLLMModels, resolveLLMApiUrl, resolveLLMModel } from "./llm";

afterEach(() => {
  vi.restoreAllMocks();
  env.ENV.llmApiKey = "test-key";
});

describe("DeepSeek-compatible LLM client", () => {
  it("resolves DeepSeek chat and models endpoints without a Forge fallback", () => {
    expect(resolveLLMApiUrl("chat/completions")).toBe("https://api.deepseek.com/chat/completions");
    expect(resolveLLMApiUrl("models")).toBe("https://api.deepseek.com/models");
    expect(resolveLLMModel()).toBe("deepseek-flash");
  });

  it("sends json_object for structured output and keeps the caller schema local", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "test",
      created: 0,
      model: "deepseek-flash",
      choices: [{ index: 0, message: { role: "assistant", content: "{\"pages\":[]}" }, finish_reason: "stop" }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await invokeLLM({
      messages: [
        { role: "system", content: "Return valid JSON." },
        { role: "user", content: "Create a structured response." },
      ],
      outputSchema: { name: "story", schema: { type: "object" }, strict: true },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "deepseek-flash",
      response_format: { type: "json_object" },
    });
  });

  it("lists models through the configured provider without calling Forge", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ object: "list", data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await listLLMModels();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.deepseek.com/models");
  });

  it("fails clearly when the provider key is missing", async () => {
    env.ENV.llmApiKey = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(listLLMModels()).rejects.toThrow("LLM_API_KEY is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
