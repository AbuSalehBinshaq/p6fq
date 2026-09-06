import { describe, expect, it } from "vitest";
import { contentImageLoadingProps, heroImageLoadingProps } from "./imageLoading";

describe("image loading priorities", () => {
  it("keeps the hero visual eager and high priority", () => {
    expect(heroImageLoadingProps).toEqual({ loading: "eager", fetchPriority: "high", decoding: "async" });
  });

  it("loads content visuals lazily while preserving asynchronous decoding", () => {
    expect(contentImageLoadingProps).toEqual({ loading: "lazy", decoding: "async" });
  });
});
