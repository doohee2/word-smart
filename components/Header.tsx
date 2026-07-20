"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { Settings, User, LogOut, Moon, Sun } from "lucide-react";
import { FileOpenButton } from "./FileOpenButton";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStudySession } from "@/providers/StudySessionProvider";
import { ConfirmModal } from "./ConfirmModal";
import { Logo } from "./Logo";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isActiveSession, setIsActiveSession } = useStudySession();
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, targetHref: string}>({isOpen: false, targetHref: ''});

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (isActiveSession && pathname !== href) {
      e.preventDefault();
      setModalConfig({isOpen: true, targetHref: href});
    }
  };

  const confirmNavigation = () => {
    setIsActiveSession(false);
    setModalConfig(prev => ({...prev, isOpen: false}));
    router.push(modalConfig.targetHref);
  };

  return (
    <header className="bg-surface docked full-width top-0 shadow-sm z-40 sticky">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        <div className="flex items-center">
          <div className="md:hidden pt-1">
            <Logo className="h-[24px]" />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="테마 변경" 
              className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
            >
              {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          )}

          <Link href="/settings" onClick={(e) => handleLinkClick(e, "/settings")} aria-label="설정" className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <Settings size={24} />
          </Link>
          <FileOpenButton />
          
          {session?.user ? (
            <div className="flex items-center gap-1 ml-1">
              <button 
                onClick={() => signOut()}
                aria-label="로그아웃" 
                className="p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error rounded-full transition-colors"
                title="로그아웃"
              >
                <LogOut size={20} />
              </button>
              {session.user.image ? (
                <Image 
                  src={session.user.image} 
                  alt="Profile" 
                  width={32} 
                  height={32} 
                  className="rounded-full border-2 border-primary-container"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                  {session.user.name?.[0] || 'U'}
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => signIn('google')}
              aria-label="로그인" 
              className="p-1.5 text-on-surface-variant hover:bg-primary-container hover:text-primary rounded-full transition-colors ml-1"
              title="구글 로그인"
            >
              <User size={24} />
            </button>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title="학습 중단"
        message="학습 진행 상태가 초기화됩니다. 정말 이동하시겠습니까?"
        confirmText="이동하기"
        cancelText="취소"
        onConfirm={confirmNavigation}
        onCancel={() => setModalConfig(prev => ({...prev, isOpen: false}))}
        isDestructive={true}
      />
    </header>
  );
}
