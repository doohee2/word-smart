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

  // 효과음 엔진 강제 리셋: 기존 AudioContext를 닫고 새 AudioContext를 생성 및 재연결
  const resetAudioEngine = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      if (Howler.ctx) {
        try {
          await Howler.ctx.close();
        } catch {}
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const newCtx = new AudioCtx();
        Howler.ctx = newCtx;
        Howler.masterGain = typeof newCtx.createGain === "undefined" ? (newCtx as unknown as { createGainNode: () => GainNode }).createGainNode() : newCtx.createGain();
        Howler.masterGain.gain.setValueAtTime(isMuted ? 0 : volume, newCtx.currentTime);
        Howler.masterGain.connect(newCtx.destination);
        (Howler as unknown as { _audioUnlocked: boolean })._audioUnlocked = true;
        await newCtx.resume();
      }

      if (typeof navigator !== "undefined" && "audioSession" in navigator && settings.audioSessionMode) {
        (navigator as unknown as { audioSession: { type: string } }).audioSession.type = settings.audioSessionMode;
      }

      // 복구 확인용 테스트 사운드 재생
      playSuccessSound();
    } catch (e) {
      console.error("Failed to reset audio engine:", e);
    }
  }, [isMuted, volume, settings.audioSessionMode, playSuccessSound]);

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
    resetAudioEngine,
  };
}
