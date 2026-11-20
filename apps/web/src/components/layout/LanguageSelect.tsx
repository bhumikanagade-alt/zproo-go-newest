import { Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES, normalizeLanguage } from '@/i18n/languages';
import { usePreferences } from '@/store/preferences';

export function LanguageSelect({ className = '' }: { className?: string }) {
  const language = normalizeLanguage(usePreferences((s) => s.language));
  const setLanguage = usePreferences((s) => s.setLanguage);
  return (
    // translate="no": language names always stay in their own script, in every language.
    <label
      translate="no"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-sm font-semibold ${className}`}
    >
      <Languages className="size-4 text-primary" aria-hidden />
      <select
        aria-label="Language"
        value={language}
        onChange={(e) => setLanguage(normalizeLanguage(e.target.value))}
        className="h-9 bg-transparent text-sm outline-none"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
