"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { Settings, User, LogOut, Moon, Sun, CloudOff } from "lucide-react";
import { FileOpenButton } from "./FileOpenButton";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStudySession } from "@/providers/StudySessionProvider";
import { ConfirmModal } from "./ConfirmModal";
import { Logo } from "./Logo";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useDataSync } from "@/hooks/useDataSync";
import { resetFatalSessionError } from "@/lib/fetchAuth";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isActiveSession, setIsActiveSession } = useStudySession();
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, targetHref: string}>({isOpen: false, targetHref: ''});
  const [isSessionExpiredOpen, setIsSessionExpiredOpen] = useState(false);
  const isHandlingExpiryRef = useRef(false);
  const isOnline = useNetworkStatus();
  useDataSync();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 세션 만료 감지 (온라인 상태일 때만 처리, 오프라인 시 PWA 캐시 보호를 위해 유보)
  useEffect(() => {
    if (!isOnline) return;

    if (session?.error === "RefreshAccessTokenError") {
      if (!isHandlingExpiryRef.current) {
        isHandlingExpiryRef.current = true;
        setIsSessionExpiredOpen(true);
      }
    } else if (session?.user && !session?.error) {
      isHandlingExpiryRef.current = false;
      resetFatalSessionError();
    }
  }, [session, isOnline]);

  const handleReSignIn = () => {
    setIsSessionExpiredOpen(false);
    resetFatalSessionError();
    signIn("google");
  };

  const handleCloseExpiryModal = () => {
    setIsSessionExpiredOpen(false);
    // isHandlingExpiryRef.current = true 상태를 유지하여 반복 팝업 없이 로컬 데이터 조회를 유지
  };

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

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => window.caches.delete(cacheName))
        );
      }
    } catch (error) {
      console.error("Cache purge error on logout:", error);
    } finally {
      signOut();
    }
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

          {!isOnline && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-error/10 text-error border border-error/20 font-medium text-xs shadow-xs ml-1 mr-0.5" title="현재 오프라인 상태입니다. 로컬 기기의 학습 기록은 다시 연결되면 서버에 저장됩니다.">
              <CloudOff size={14} className="animate-pulse shrink-0 text-error/80" />
              <span className="hidden sm:inline">오프라인 모드</span>
            </div>
          )}

          <Link href="/settings" onClick={(e) => handleLinkClick(e, "/settings")} aria-label="설정" className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <Settings size={24} />
          </Link>
          <FileOpenButton />
          
          {session?.user ? (
            <div className="flex items-center gap-1 ml-1">
              <button 
                onClick={handleSignOut}
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
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))}
      />

      <ConfirmModal 
        isOpen={isSessionExpiredOpen}
        title="Google 계정 연결 만료"
        message={"Google 계정 연결이 만료되었습니다.\n최신 데이터를 동기화하려면 다시 로그인해 주세요."}
        type="warning"
        confirmText="다시 로그인"
        cancelText="나중에 (조회 유지)"
        onConfirm={handleReSignIn}
        onClose={handleCloseExpiryModal}
      />
    </header>
  );
}
