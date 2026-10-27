"use client";

import { useCallback } from "react";
import useSound from "use-sound";
import { Howler } from "howler";
import { useTTSSettings } from "@/providers/TTSSettingsProvider";

export function useAppSound() {
  const { settings, updateSettings } = useTTSSettings();
  const isMuted = settings.isSfxMuted;
  const volume = settings.sfxVolume;

  const toggleMute = useCallback(() => {
    updateSettings({ isSfxMuted: !isMuted });
  }, [isMuted, updateSettings]);

  // Web Audio API를 사용하여 효과음이 백그라운드 음악을 멈추지 않고 함께 재생되도록 설정
  const soundOptions = { volume };

  // iOS 등에서 화면 잠금/백그라운드 전환 등으로 AudioContext가 정지(suspended/interrupted)되었을 때 자동 복구
  const ensureAudioContext = useCallback(() => {
    if (typeof window !== "undefined" && Howler.ctx && Howler.ctx.state !== "running") {
      Howler.ctx.resume().catch(() => {});
    }
  }, []);

  // Pre-load all sound effects
  const [playStartSound] = useSound("/sounds/soundshelfstudio-ui-digital-tech-notification-549595.mp3", soundOptions);
  const [playClickSound] = useSound("/sounds/soundshelfstudio-ui-switch-off-516361.mp3", soundOptions);
  const [playCompleteSound] = useSound("/sounds/soundshelfstudio-ui-switch-on-516359.mp3", soundOptions);
  const [playSwipeSound] = useSound("/sounds/soundshelfstudio-ui-focus-519789.mp3", soundOptions);
  const [playSuccessSound] = useSound("/sounds/soundshelfstudio-ui-chime-success-sound-551841.mp3", soundOptions);
  const [playErrorSound] = useSound("/sounds/soundshelfstudio-ui-warning-beep-515666.mp3", soundOptions);
  const [playMissionCompleteSound] = useSound("/sounds/soundshelfstudio-mission-complete-chime-534595.mp3", soundOptions);

  const playStart = useCallback(() => {
    if (!isMuted) {
      ensureAudioContext();
      playStartSound();
    }
  }, [isMuted, ensureAudioContext, playStartSound]);

  const playClick = useCallback(() => {
    if (!isMuted) {
      ensureAudioContext();
      playClickSound();
    }
  }, [isMuted, ensureAudioContext, playClickSound]);

  const playCompleteWord = useCallback(() => {
    if (!isMuted) {
      ensureAudioContext();
      playCompleteSound();
    }
  }, [isMuted, ensureAudioContext, playCompleteSound]);

  const playSwipe = useCallback(() => {
    if (!isMuted) {
      ensureAudioContext();
      playSwipeSound();
    }
  }, [isMuted, ensureAudioContext, playSwipeSound]);

  const playSuccess = useCallback(() => {
    if (!isMuted) {
      ensureAudioContext();
      playSuccessSound();
    }
  }, [isMuted, ensureAudioContext, playSuccessSound]);

  const playError = useCallback(() => {
    if (!isMuted) {
      ensureAudioContext();
      playErrorSound();
    }
  }, [isMuted, ensureAudioContext, playErrorSound]);

  const playMissionComplete = useCallback(() => {
    if (!isMuted) {
      ensureAudioContext();
      playMissionCompleteSound();
    }
  }, [isMuted, ensureAudioContext, playMissionCompleteSound]);

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
