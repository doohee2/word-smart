"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import React, { useState } from "react";
import { StudySessionProvider } from "@/providers/StudySessionProvider";
import { LanguageModeProvider } from "@/providers/LanguageModeProvider";
import { TTSSettingsProvider } from "@/providers/TTSSettingsProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, _error) => {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            return false; // 오프라인 감지 시 즉시 재시도 차단하여 0.1초 만에 로컬 캐시 개방
          }
          return failureCount < 2; // 온라인 시 failureCount < 2 허용
        },
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
          <LanguageModeProvider>
            <TTSSettingsProvider>
              <StudySessionProvider>
                {children}
              </StudySessionProvider>
            </TTSSettingsProvider>
          </LanguageModeProvider>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
