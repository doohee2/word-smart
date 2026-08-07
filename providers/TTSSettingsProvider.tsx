"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface TTSSettings {
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsVoiceURI: string;
  autoTTS: boolean;
  sfxVolume: number;
  isSfxMuted: boolean;
}

interface TTSSettingsContextProps {
  settings: TTSSettings;
  updateSettings: (newSettings: Partial<TTSSettings>) => void;
  isLoaded: boolean;
}

const defaultSettings: TTSSettings = {
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsVoiceURI: "",
  autoTTS: false,
  sfxVolume: 0.5,
  isSfxMuted: false,
};

const TTSSettingsContext = createContext<TTSSettingsContextProps | undefined>(undefined);

export function TTSSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TTSSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("word_smart_tts_settings");
    let initialSettings = { ...defaultSettings };
    if (saved) {
      try {
        initialSettings = { ...initialSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse TTS settings", e);
      }
    }
    
    // Migrate legacy mute setting
    const legacyMute = localStorage.getItem("word_smart_muted");
    if (legacyMute !== null) {
      initialSettings.isSfxMuted = legacyMute === "true";
    }

    setSettings(initialSettings);
    setIsLoaded(true);

    const handleLegacyMuteChange = () => {
      const current = localStorage.getItem("word_smart_muted");
      setSettings(prev => ({ ...prev, isSfxMuted: current === "true" }));
    };
    window.addEventListener("word_smart_mute_change", handleLegacyMuteChange);
    return () => window.removeEventListener("word_smart_mute_change", handleLegacyMuteChange);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("word_smart_tts_settings", JSON.stringify(updated));
      
      // Keep legacy word_smart_muted in sync if changed
      if (newSettings.isSfxMuted !== undefined) {
        localStorage.setItem("word_smart_muted", String(newSettings.isSfxMuted));
        window.dispatchEvent(new Event("word_smart_mute_change"));
      }
      return updated;
    });
  }, []);

  return (
    <TTSSettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </TTSSettingsContext.Provider>
  );
}

export function useTTSSettings() {
  const context = useContext(TTSSettingsContext);
  if (context === undefined) {
    throw new Error("useTTSSettings must be used within a TTSSettingsProvider");
  }
  return context;
}
