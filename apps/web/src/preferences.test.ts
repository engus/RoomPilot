import { describe, expect, it } from 'vitest';
import { resolveLanguage, resolveTheme, resolveThemePreference } from './preferences';

describe('interface preferences', () => {
  it('uses a saved supported language before browser language', () => {
    expect(resolveLanguage('en', 'ru-RU')).toBe('en');
    expect(resolveLanguage('ru', 'en-US')).toBe('ru');
  });
  it('selects Russian for Russian browsers and English otherwise', () => {
    expect(resolveLanguage(null, 'ru-KZ')).toBe('ru');
    expect(resolveLanguage('invalid', 'RU-ru')).toBe('ru');
    expect(resolveLanguage(null, 'de-DE')).toBe('en');
    expect(resolveLanguage(null, undefined)).toBe('en');
  });
  it('defaults to system and rejects unsupported stored theme values', () => {
    expect(resolveThemePreference(null)).toBe('system');
    expect(resolveThemePreference('invalid')).toBe('system');
    expect(resolveThemePreference('dark')).toBe('dark');
    expect(resolveThemePreference('light')).toBe('light');
  });
  it('tracks the OS only when system is selected', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
