import { useEffect } from 'react';
import { usePreferences } from '@/store/preferences';
import { isHindi, normalizeLanguage } from './languages';
import { disableHindi, enableHindi } from './translator';

/**
 * Keeps the page language in step with the language chosen in the header.
 * Mounted once at the app root. It waits until the prerendered HTML has been hydrated before
 * touching the DOM, so React never sees text that differs from what the server rendered.
 */
export function LanguageSync() {
  const language = usePreferences((s) => normalizeLanguage(s.language));
  useEffect(() => {
    const run = () => (isHindi(language) ? enableHindi() : disableHindi(language));
    // First paint: let hydration settle. Later changes (user picks a language): apply at once.
    const w = window as Window & { __zpLangReady?: boolean };
    if (w.__zpLangReady) {
      run();
      return;
    }
    const t = window.setTimeout(() => {
      w.__zpLangReady = true;
      run();
    }, 400);
    return () => window.clearTimeout(t);
  }, [language]);
  return null;
}
