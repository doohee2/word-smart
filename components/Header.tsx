"use client";

import { Info, Settings, User } from "lucide-react";
import { FileOpenButton } from "./FileOpenButton";

export function Header() {
  return (
    <header className="bg-surface docked full-width top-0 shadow-sm z-40 sticky">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        <div className="flex items-center gap-4">
          <button aria-label="정보" className="md:hidden p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <Info size={24} />
          </button>
          <h1 className="text-headline-lg font-bold text-primary md:hidden">Word Smart</h1>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="설정" className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <Settings size={24} />
          </button>
          <FileOpenButton />
          <button aria-label="계정" className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <User size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
