import { WifiOff, RefreshCw } from "lucide-react";

export const metadata = {
  title: "오프라인 모드 | 워드 스마트",
  description: "인터넷 연결이 끊어졌습니다.",
};

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-4 text-center">
      <div className="bg-surface-container rounded-3xl p-8 max-w-md w-full shadow-lg border border-surface-variant flex flex-col items-center">
        <div className="w-20 h-20 bg-error-container/20 rounded-full flex items-center justify-center text-error mb-6">
          <WifiOff size={40} />
        </div>
        
        <h1 className="text-display-sm font-bold text-on-surface mb-3">
          인터넷 연결 끊김
        </h1>
        
        <p className="text-body-lg text-on-surface-variant mb-8">
          네트워크 연결이 불안정하여 새로운 페이지를 불러올 수 없습니다.<br/>
          (이전에 방문한 적 있는 학습, 테스트 화면 등은 캐시를 통해 접근 가능합니다.)
        </p>

        <a 
          href="/"
          className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={20} />
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}
