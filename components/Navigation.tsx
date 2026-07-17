"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, Settings, PlaySquare } from "lucide-react";
import clsx from "clsx";
import { Logo } from "./Logo";

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/study", label: "학습", icon: BookOpen },
    { href: "/test", label: "테스트", icon: PlaySquare },
    { href: "/pdf", label: "PDF 출력", icon: FileText },
    { href: "/settings", label: "설정", icon: Settings },
  ];

  return (
    <>
      {/* Desktop SideNavBar */}
      <nav className="fixed h-full left-0 top-0 w-64 hidden md:flex bg-surface-container-low shadow-md flex-col p-4 gap-2 z-50">
        <div className="mb-8 mt-4 px-4 flex items-center gap-3">
          <Link href="/" className="block">
            <Logo className="h-[28px]" />
          </Link>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href || (pathname === '/' && link.href === '/study');
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
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
          return (
            <Link
              key={link.href}
              href={link.href}
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
    </>
  );
}
