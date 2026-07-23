import { X, RefreshCw } from "lucide-react";
import { APP_INFO_MESSAGE, APP_VERSION } from "@/lib/constants";
import { Logo } from "@/components/Logo";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const isOnline = useNetworkStatus();

  if (!isOpen) return null;

  const handleForceUpdate = async () => {
    if (!isOnline) return;
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      window.location.reload();
    } catch (e) {
      console.error('Failed to force update app', e);
      window.location.reload(); // fallback
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
              className="flex items-center gap-1.5 text-label-sm text-primary hover:text-primary/80 transition-colors bg-primary-container/20 px-3 py-1.5 rounded-full"
            >
              <RefreshCw size={14} />
              <span>최신 버전 업데이트</span>
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
