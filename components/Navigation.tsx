"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, HelpCircle, FileText, Settings, PlaySquare } from "lucide-react";
import clsx from "clsx";

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
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary font-bold text-xl">W</div>
          <div>
            <h1 className="text-headline-md font-black text-primary">Word Smart</h1>
            <p className="text-label-sm text-on-surface-variant opacity-80">스마트 학습</p>
          </div>
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
                <Icon size={24} className={isActive ? "fill-current" : ""} />
                <span className="text-label-sm">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile BottomNavBar */}
      <nav className="bg-surface border-t border-outline-variant fixed bottom-0 w-full md:hidden z-50 shadow-lg pb-safe h-[80px] flex justify-around items-center px-2">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname === '/' && link.href === '/study');
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex flex-col items-center justify-center rounded-2xl px-4 py-2 transition-transform",
                isActive
                  ? "bg-primary-container text-on-primary-container w-16 h-14 scale-95"
                  : "text-on-surface-variant hover:bg-surface-variant"
              )}
            >
              <Icon size={24} className={isActive ? "fill-current" : ""} />
              <span className="text-label-sm mt-1">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
