export const heroImageLoadingProps = {
  loading: "eager",
  fetchPriority: "high",
  decoding: "async",
} as const;

export const deferredImageLoadingProps = {
  loading: "lazy",
  decoding: "async",
} as const;
