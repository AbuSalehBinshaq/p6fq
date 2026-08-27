import { describe, expect, it } from "vitest";
import { supportedPaymentMethods } from "./paymentMethods";

describe("supported payment methods", () => {
  it("lists only the payment methods confirmed for the footer", () => {
    expect(supportedPaymentMethods.map(method => method.id)).toEqual([
      "visa",
      "mastercard",
      "amex",
      "apple-pay",
      "google-pay",
    ]);
  });
});
