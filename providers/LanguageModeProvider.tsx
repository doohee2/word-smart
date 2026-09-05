"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type LangMode = 'en' | 'ja' | 'zh';

interface LanguageModeContextType {
  langMode: LangMode;
  setLangMode: (mode: LangMode) => void;
}

const LanguageModeContext = createContext<LanguageModeContextType>({
  langMode: 'en',
  setLangMode: () => {},
});

export function LanguageModeProvider({ children }: { children: React.ReactNode }) {
  const [langMode, setLangModeState] = useState<LangMode>('en');

  useEffect(() => {
    const saved = localStorage.getItem('word_smart_lang_mode');
    if (saved === 'en' || saved === 'ja' || saved === 'zh') {
      setLangModeState(saved as LangMode);
    }
  }, []);

  const setLangMode = (mode: LangMode) => {
    setLangModeState(mode);
    localStorage.setItem('word_smart_lang_mode', mode);
  };

  return (
    <LanguageModeContext.Provider value={{ langMode, setLangMode }}>
      {children}
    </LanguageModeContext.Provider>
  );
}

export function useLanguageMode() {
  return useContext(LanguageModeContext);
}
