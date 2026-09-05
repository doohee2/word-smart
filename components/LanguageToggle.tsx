"use client";
import React from "react";
import clsx from "clsx";
import { useLanguageMode } from "@/providers/LanguageModeProvider";

export function LanguageToggle({ className }: { className?: string }) {
  const { langMode, setLangMode } = useLanguageMode();

  return (
    <div className={clsx("flex items-center gap-6 py-1", className)}>
      <label className="flex items-center gap-2 cursor-pointer text-body-md font-bold text-on-surface select-none hover:text-primary transition-colors">
        <input
          type="radio"
          name="langMode"
          checked={langMode === 'en'}
          onChange={() => setLangMode('en')}
          className="w-4 h-4 text-primary bg-surface-container border-outline focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary transition-colors"
        />
        <span>영어 단어장</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer text-body-md font-bold text-on-surface select-none hover:text-primary transition-colors">
        <input
          type="radio"
          name="langMode"
          checked={langMode === 'ja'}
          onChange={() => setLangMode('ja')}
          className="w-4 h-4 text-primary bg-surface-container border-outline focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary transition-colors"
        />
        <span>일본어 한자</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer text-body-md font-bold text-on-surface select-none hover:text-primary transition-colors">
        <input
          type="radio"
          name="langMode"
          checked={langMode === 'zh'}
          onChange={() => setLangMode('zh')}
          className="w-4 h-4 text-primary bg-surface-container border-outline focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary transition-colors"
        />
        <span>한자 공부</span>
      </label>
    </div>
  );
}
