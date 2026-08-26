export type StoryThemeSelection = {
  title: string;
  description: string;
};

export function buildThemeSelection(theme: StoryThemeSelection) {
  return {
    selectedTheme: theme.title,
    adventure: `${theme.title} — ${theme.description}`,
  };
}
