"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, FileText, Settings, PlaySquare, History, AudioLines } from "lucide-react";
import clsx from "clsx";
import { Logo } from "./Logo";
import { useStudySession } from "@/providers/StudySessionProvider";
import { ConfirmModal } from "./ConfirmModal";
import { TTSSettingsModal } from "./TTSSettingsModal";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isActiveSession, setIsActiveSession } = useStudySession();
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, targetHref: string}>({isOpen: false, targetHref: ''});
  const [isTTSModalOpen, setIsTTSModalOpen] = useState(false);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (isActiveSession) {
      e.preventDefault();
      setModalConfig({isOpen: true, targetHref: href});
    }
  };

  const confirmNavigation = () => {
    setIsActiveSession(false);
    setModalConfig(prev => ({...prev, isOpen: false}));
    
    if (pathname === modalConfig.targetHref || (pathname === '/' && modalConfig.targetHref === '/study')) {
      window.dispatchEvent(new Event('word-smart-stop-session'));
    } else {
      router.push(modalConfig.targetHref);
    }
  };

  const links = [
    { href: "/study", label: "학습", icon: BookOpen },
    { href: "/test", label: "테스트", icon: PlaySquare },
    { href: "/history", label: "기록", icon: History },
    { href: "/pdf", label: "PDF 출력", icon: FileText },
    { href: "#tts-settings", label: "음성 설정", icon: AudioLines, isAction: true },
    { href: "/settings", label: "설정", icon: Settings },
  ];

  return (
    <>
      {/* Desktop SideNavBar */}
      <nav className="fixed h-full left-0 top-0 w-64 hidden md:flex bg-surface-container-low shadow-md flex-col p-4 gap-2 z-50">
        <div className="mb-8 mt-4 px-4 flex items-center gap-3">
          <Link href="/" className="block" onClick={(e) => handleLinkClick(e, '/')}>
            <Logo className="h-[28px]" />
          </Link>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href || (pathname === '/' && link.href === '/study');
            const Icon = link.icon;
            
            if (link.isAction) {
              return (
                <button
                  key={link.label}
                  onClick={() => setIsTTSModalOpen(true)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out text-on-surface-variant hover:bg-surface-variant w-full text-left"
                >
                  <Icon size={24} className="stroke-2" />
                  <span className="text-label-sm">{link.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out",
                  isActive
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                )}
              >
                <Icon size={24} className={isActive ? "stroke-[2.5px]" : "stroke-2"} />
                <span className="text-label-sm">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile BottomNavBar */}
      <nav className="bg-surface border-t border-outline-variant fixed bottom-0 w-full md:hidden z-50 shadow-lg pb-safe h-[72px] flex justify-around items-center px-1">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname === '/' && link.href === '/study');
          const Icon = link.icon;
          
          if (link.isAction) {
            return (
              <button
                key={link.label}
                onClick={() => setIsTTSModalOpen(true)}
                className="flex flex-col items-center justify-center w-full max-w-[80px] h-full gap-1"
              >
                <div className="flex items-center justify-center w-16 h-8 rounded-full transition-colors text-on-surface-variant hover:bg-surface-variant">
                  <Icon size={22} className="stroke-2" />
                </div>
                <span className="text-[11px] whitespace-nowrap transition-colors text-on-surface-variant">
                  {link.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              className="flex flex-col items-center justify-center w-full max-w-[80px] h-full gap-1"
            >
              <div className={clsx(
                "flex items-center justify-center w-16 h-8 rounded-full transition-colors",
                isActive
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-variant"
              )}>
                <Icon size={22} className={isActive ? "stroke-[2.5px]" : "stroke-2"} />
              </div>
              <span className={clsx(
                "text-[11px] whitespace-nowrap transition-colors",
                isActive ? "text-on-surface font-bold" : "text-on-surface-variant"
              )}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))}
        title="학습/테스트 중지"
        message="현재 진행 중인 학습 또는 테스트가 있습니다. 정말 중지하시겠습니까?"
        type="warning"
        onConfirm={confirmNavigation}
        confirmText="이동하기"
        cancelText="계속하기"
      />

      <TTSSettingsModal 
        isOpen={isTTSModalOpen} 
        onClose={() => setIsTTSModalOpen(false)} 
      />
    </>
  );
}
