import { X, RefreshCw } from "lucide-react";
import { APP_INFO_MESSAGE, APP_VERSION } from "@/lib/constants";
import { Logo } from "@/components/Logo";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useState } from "react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const isOnline = useNetworkStatus();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleForceUpdate = async () => {
    if (!isOnline || isUpdating) return;
    
    if (!window.confirm("앱 캐시를 초기화하고 최신 버전으로 업데이트합니다. 단어장 데이터와 학습 기록은 유지됩니다.")) {
      return;
    }
    
    setIsUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      console.error('Failed to force update app', e);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-high rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-lg relative flex flex-col gap-4 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-surface-container rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <X size={20} />
        </button>
        <div className="flex justify-center mb-4 mt-2 pointer-events-none">
          <Logo className="h-12 justify-center" />
        </div>
        <p className="text-body-md text-on-surface-variant leading-relaxed break-all text-left">
          {APP_INFO_MESSAGE}
        </p>
        <div className="flex items-center justify-between mt-2">
          {isOnline ? (
            <button
              onClick={handleForceUpdate}
              disabled={isUpdating}
              className="flex items-center gap-1.5 text-label-sm text-primary hover:text-primary/80 transition-colors bg-primary-container/20 px-3 py-1.5 rounded-full disabled:opacity-70 disabled:cursor-wait"
            >
              <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
              <span>{isUpdating ? "업데이트 확인 중..." : "최신 버전 업데이트"}</span>
            </button>
          ) : (
            <div /> // empty placeholder for layout
          )}
          <p className="text-label-sm text-on-surface-variant font-medium text-right">
            {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
