"use client";

import { useCallback } from "react";
import useSound from "use-sound";
import { useTTSSettings } from "@/providers/TTSSettingsProvider";

export function useAppSound() {
  const { settings, updateSettings } = useTTSSettings();
  const isMuted = settings.isSfxMuted;
  const volume = settings.sfxVolume;

  const toggleMute = useCallback(() => {
    updateSettings({ isSfxMuted: !isMuted });
  }, [isMuted, updateSettings]);

  // Web Audio API를 사용하여 효과음 지연을 줄이고 음악 중단을 완화 (ambient 설정은 제거하여 기본 iOS 오디오 세션 유지)
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
