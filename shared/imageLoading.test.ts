import { describe, expect, it } from "vitest";
import { deferredImageLoadingProps, heroImageLoadingProps } from "./imageLoading";

describe("image loading priorities", () => {
  it("keeps the hero visual eager and high priority", () => {
    expect(heroImageLoadingProps).toEqual({ loading: "eager", fetchPriority: "high", decoding: "async" });
  });

  it("defers non-critical visuals until they approach the viewport", () => {
    expect(deferredImageLoadingProps).toEqual({ loading: "lazy", decoding: "async" });
  });
});
