/** Languages the site supports. Marathi has been removed on purpose. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en-IN';

/** Any stored/unknown value (for example an old "mr-IN") falls back to English. */
export function normalizeLanguage(value: unknown): LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === value) ? (value as LanguageCode) : DEFAULT_LANGUAGE;
}

export const isHindi = (code: string): boolean => code === 'hi-IN';
