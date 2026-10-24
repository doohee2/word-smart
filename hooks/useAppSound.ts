"use client";

import { useCallback, useEffect } from "react";
import useSound from "use-sound";
import { useTTSSettings } from "@/providers/TTSSettingsProvider";

export function useAppSound() {
  const { settings, updateSettings } = useTTSSettings();
  const isMuted = settings.isSfxMuted;
  const volume = settings.sfxVolume;

  // iOS Safari / WebKit 환경에서 상시 transient(덕킹) 오디오 세션 모드 유지
  useEffect(() => {
    const applyTransient = () => {
      if (typeof navigator !== "undefined" && "audioSession" in navigator) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (navigator as any).audioSession.type = "transient";
        } catch (e) {
          console.warn("Failed to set audioSession type to transient", e);
        }
      }
    };
    applyTransient();
    window.addEventListener("touchstart", applyTransient, { once: true, passive: true });
    window.addEventListener("click", applyTransient, { once: true, passive: true });
    return () => {
      window.removeEventListener("touchstart", applyTransient);
      window.removeEventListener("click", applyTransient);
    };
  }, []);

  const toggleMute = useCallback(() => {
    updateSettings({ isSfxMuted: !isMuted });
  }, [isMuted, updateSettings]);

  // Web Audio API를 사용하여 효과음 지연을 줄이고 백그라운드 음악 중단을 방지
  const soundOptions = { volume };

  // Pre-load all sound effects
  const [playStartSound] = useSound("/sounds/soundshelfstudio-ui-digital-tech-notification-549595.mp3", soundOptions);
  const [playClickSound] = useSound("/sounds/soundshelfstudio-ui-switch-off-516361.mp3", soundOptions);
  const [playCompleteSound] = useSound("/sounds/soundshelfstudio-ui-switch-on-516359.mp3", soundOptions);
  const [playSwipeSound] = useSound("/sounds/soundshelfstudio-ui-focus-519789.mp3", soundOptions);
  const [playSuccessSound] = useSound("/sounds/soundshelfstudio-ui-chime-success-sound-551841.mp3", soundOptions);
  const [playErrorSound] = useSound("/sounds/soundshelfstudio-ui-warning-beep-515666.mp3", soundOptions);
  const [playMissionCompleteSound] = useSound("/sounds/soundshelfstudio-mission-complete-chime-534595.mp3", soundOptions);

  const playStart = useCallback(() => {
    if (!isMuted) playStartSound();
  }, [isMuted, playStartSound]);

  const playClick = useCallback(() => {
    if (!isMuted) playClickSound();
  }, [isMuted, playClickSound]);

  const playCompleteWord = useCallback(() => {
    if (!isMuted) playCompleteSound();
  }, [isMuted, playCompleteSound]);

  const playSwipe = useCallback(() => {
    if (!isMuted) playSwipeSound();
  }, [isMuted, playSwipeSound]);

  const playSuccess = useCallback(() => {
    if (!isMuted) playSuccessSound();
  }, [isMuted, playSuccessSound]);

  const playError = useCallback(() => {
    if (!isMuted) playErrorSound();
  }, [isMuted, playErrorSound]);

  const playMissionComplete = useCallback(() => {
    if (!isMuted) playMissionCompleteSound();
  }, [isMuted, playMissionCompleteSound]);

  return {
    isMuted,
    toggleMute,
    playStart,
    playClick,
    playCompleteWord,
    playSwipe,
    playSuccess,
    playError,
    playMissionComplete,
  };
}
