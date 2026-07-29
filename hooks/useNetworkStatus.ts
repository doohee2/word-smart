import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 동기적 초기 체크
    setIsOnline(navigator.onLine);

    const verifyNetwork = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200); // 최대 1.2초 타임아웃

        const response = await fetch(`/manifest.json?_t=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setIsOnline(response.ok || response.status === 304);
      } catch {
        // 타임아웃 또는 회선 끊김으로 통신 실패 시 가짜 온라인 판독 -> false 전환
        setIsOnline(false);
      }
    };

    // 마운트 즉시 능동 핑 1회 실행
    verifyNetwork();

    const handleOnline = () => verifyNetwork();
    const handleOffline = () => setIsOnline(false);
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        verifyNetwork();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // 화면 활성화 시 15초 주기 능동 핑
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        verifyNetwork();
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      clearInterval(intervalId);
    };
  }, []);

  return isOnline;
}
