import { Check, Info, X } from "lucide-react";
import clsx from "clsx";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  onConfirm,
  confirmText = '확인',
  cancelText = '취소'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-surface-container-high rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-lg flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          {type === 'success' && <div className="p-2 bg-primary-container text-on-primary-container rounded-full"><Check size={24} /></div>}
          {type === 'error' && <div className="p-2 bg-error-container text-error rounded-full"><X size={24} /></div>}
          {type === 'info' && <div className="p-2 bg-secondary-container text-on-secondary-container rounded-full"><Info size={24} /></div>}
          <h2 className="text-title-lg font-bold text-on-surface">{title}</h2>
        </div>
        <p className="text-body-lg text-on-surface-variant mb-4 break-keep">
          {message}
        </p>
        <div className="flex justify-end gap-3 mt-auto">
          {onConfirm && (
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-label-lg font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={() => {
              if (onConfirm) onConfirm();
              else onClose();
            }}
            className={clsx(
              "px-5 py-2.5 rounded-full text-label-lg font-medium transition-colors shadow-sm",
              type === 'error' ? "bg-error text-on-error hover:bg-error/90" : "bg-primary text-on-primary hover:bg-primary/90"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
