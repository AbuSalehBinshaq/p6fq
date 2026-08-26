import { buildThemeSelection, type StoryThemeSelection } from "./themes";

export function selectThemeForOrder(theme: StoryThemeSelection, scrollToOrder: () => void) {
  const selection = buildThemeSelection(theme);
  scrollToOrder();
  return selection;
}
