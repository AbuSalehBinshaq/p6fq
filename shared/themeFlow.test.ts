import { describe, expect, it, vi } from "vitest";
import { selectThemeForOrder } from "./themeFlow";

describe("selectThemeForOrder", () => {
  it("prepares the selected theme and moves to the order form", () => {
    const scrollToOrder = vi.fn();
    const result = selectThemeForOrder({
      title: "جود ومدينة المرجان",
      description: "مغامرة تحت الماء عن الشجاعة والتعاون.",
    }, scrollToOrder);

    expect(result).toEqual({
      selectedTheme: "جود ومدينة المرجان",
      adventure: "جود ومدينة المرجان — مغامرة تحت الماء عن الشجاعة والتعاون.",
    });
    expect(scrollToOrder).toHaveBeenCalledOnce();
  });
});
