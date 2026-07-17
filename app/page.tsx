import Link from "next/link";
import { BookOpen, PlaySquare } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-8">
      <div className="text-center flex flex-col items-center">
        <Logo className="h-[48px] sm:h-[64px] mb-6" />
        <p className="text-body-lg text-on-surface-variant">워드 스마트 영단어 학습</p>
      </div>
      
      <div className="flex gap-4 w-full max-w-md">
        <Link href="/study" className="flex-1 h-touch-target bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 font-headline-md transition-all shadow-md">
          <BookOpen size={24} />
          학습 시작
        </Link>
        <Link href="/test" className="flex-1 h-touch-target bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl flex items-center justify-center gap-2 font-headline-md transition-colors border border-outline-variant">
          <PlaySquare size={24} />
          테스트
        </Link>
      </div>
    </div>
  );
}
