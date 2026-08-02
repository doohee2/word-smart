"use client";

import { useState, useEffect, useCallback } from "react";
import useSound from "use-sound";

const MUTE_KEY = "word_smart_muted";

export function useAppSound() {
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Initialize from localStorage and listen to mute toggle events across components
  useEffect(() => {
    const stored = localStorage.getItem(MUTE_KEY);
    if (stored !== null) {
      setIsMuted(stored === "true");
    }

    const handleMuteChange = () => {
      const current = localStorage.getItem(MUTE_KEY);
      setIsMuted(current === "true");
    };

    window.addEventListener("word_smart_mute_change", handleMuteChange);
    return () => window.removeEventListener("word_smart_mute_change", handleMuteChange);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, String(next));
      window.dispatchEvent(new Event("word_smart_mute_change"));
      return next;
    });
  }, []);

  const soundOptions = { volume: 0.5, html5: true };

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
