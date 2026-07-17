import { X } from "lucide-react";
import { APP_INFO_MESSAGE, APP_VERSION } from "@/lib/constants";
import { Logo } from "@/components/Logo";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-high rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-lg relative flex flex-col gap-4 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-surface-container rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <X size={20} />
        </button>
        <div className="flex justify-center mb-2 mt-4">
          <Logo />
        </div>
        <p className="text-body-md text-on-surface-variant leading-relaxed break-keep">
          {APP_INFO_MESSAGE}
        </p>
        <p className="text-label-sm text-on-surface-variant font-medium mt-2">
          {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
