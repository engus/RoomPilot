import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { resolveLanguage, resolveTheme, resolveThemePreference, type Language, type Theme, type ThemePreference } from './preferences';
import { en, ru, type TranslationKey } from './translations';

export type Translate = (key: TranslationKey, parameters?: Record<string, string | number>) => string;
export function translate(language: Language, key: TranslationKey, parameters: Record<string, string | number> = {}): string {
  const text = (language === 'ru' ? ru : en)[key];
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(parameters[name] ?? placeholder));
}
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Preferences still work when browser storage is unavailable. */ } };
type Preferences = { language: Language; themePreference: ThemePreference; theme: Theme; setLanguage: (value: Language) => void; setThemePreference: (value: ThemePreference) => void; t: Translate };
const InterfaceContext = createContext<Preferences | null>(null);
export function InterfaceProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => resolveLanguage(read('roompilot.language'), navigator.language));
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => resolveThemePreference(read('roompilot.theme')));
  const [systemIsDark, setSystemIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const theme = resolveTheme(themePreference, systemIsDark);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = (event: MediaQueryListEvent) => setSystemIsDark(event.matches);
    media.addEventListener('change', change); setSystemIsDark(media.matches);
    return () => media.removeEventListener('change', change);
  }, []);
  useLayoutEffect(() => { document.documentElement.lang = language; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [language, theme]);
  const selectLanguage = (value: Language) => { setLanguage(value); save('roompilot.language', value); };
  const selectTheme = (value: ThemePreference) => { setThemePreference(value); save('roompilot.theme', value); };
  return <InterfaceContext.Provider value={{ language, themePreference, theme, setLanguage: selectLanguage, setThemePreference: selectTheme, t: (key, params) => translate(language, key, params) }}>{children}</InterfaceContext.Provider>;
}
export function useInterface(): Preferences {
  const context = useContext(InterfaceContext);
  if (!context) throw new Error('InterfaceProvider is required.');
  return context;
}
