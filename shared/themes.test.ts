import { describe, expect, it } from "vitest";
import { buildThemeSelection } from "./themes";

describe("buildThemeSelection", () => {
  it("keeps the selected story theme and pre-fills its adventure brief", () => {
    expect(buildThemeSelection({
      title: "راشد وكوكب الألوان",
      description: "رحلة بين النجوم يكتشف فيها أن فضوله هو أقوى أدواته.",
    })).toEqual({
      selectedTheme: "راشد وكوكب الألوان",
      adventure: "راشد وكوكب الألوان — رحلة بين النجوم يكتشف فيها أن فضوله هو أقوى أدواته.",
    });
  });
});
