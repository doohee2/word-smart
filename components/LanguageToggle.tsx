"use client";
import React from "react";
import clsx from "clsx";
import { useLanguageMode } from "@/providers/LanguageModeProvider";

export function LanguageToggle({ className }: { className?: string }) {
  const { langMode, setLangMode } = useLanguageMode();

  return (
    <div className={clsx("flex p-1 bg-surface-container rounded-2xl border border-outline-variant/50 shadow-inner w-full max-w-xs sm:max-w-sm", className)}>
      <button
        type="button"
        onClick={() => setLangMode('en')}
        className={clsx(
          "flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 outline-none",
          langMode === 'en'
            ? "bg-primary text-on-primary shadow-md font-extrabold scale-[1.02]"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
        )}
      >
        <span>🇺🇸</span> 영어 단어장
      </button>
      <button
        type="button"
        onClick={() => setLangMode('ja')}
        className={clsx(
          "flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 outline-none",
          langMode === 'ja'
            ? "bg-primary text-on-primary shadow-md font-extrabold scale-[1.02]"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
        )}
      >
        <span>🇯🇵</span> 일본어 한자
      </button>
    </div>
  );
}
