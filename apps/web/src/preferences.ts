export type Language = 'en' | 'ru';
export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';
export function resolveLanguage(saved: string | null, browserLanguage?: string): Language {
  if (saved === 'en' || saved === 'ru') return saved;
  return browserLanguage?.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en';
}
export function resolveThemePreference(saved: string | null): ThemePreference {
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}
export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): Theme {
  return preference === 'system' ? systemIsDark ? 'dark' : 'light' : preference;
}
