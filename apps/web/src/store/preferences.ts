import type { Currency } from '@zproo/types';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '@/i18n/languages';

interface PreferencesState {
  currency: Currency;
  language: string;
  setCurrency: (currency: Currency) => void;
  setLanguage: (language: string) => void;
}

/** localStorage can throw (private mode, blocked storage); preferences then last for the session only. */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: 'INR',
      language: DEFAULT_LANGUAGE,
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language: normalizeLanguage(language) }),
    }),
    {
      name: 'zproo.preferences',
      version: 2,
      // Marathi was removed: anyone who had it saved (or any unknown value) goes back to English.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<PreferencesState>;
        return { ...state, language: normalizeLanguage(state.language) } as PreferencesState;
      },
      storage: createJSONStorage(() => safeLocalStorage),
      // Read saved preferences after hydration (main.tsx), so the first client render matches
      // the prerendered HTML.
      skipHydration: true,
    },
  ),
);
