"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import React from "react";
import { StudySessionProvider } from "@/providers/StudySessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        <StudySessionProvider>
          {children}
        </StudySessionProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
