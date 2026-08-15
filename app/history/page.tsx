"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { BookOpen, PlaySquare, Calendar, ChevronDown, ChevronUp, RefreshCw, Trash2 } from "lucide-react";
import clsx from "clsx";

export default function HistoryPage() {
  const { data: session } = useSession();
  
  // Format to YYYY-MM
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const rawHistory = useLiveQuery(() => db.history.toArray());

  useEffect(() => {
    if (!session?.user?.email || !selectedMonth || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    
    setIsSyncing(true);
    // 1. Fetch keys (id, created_at, type) for the selected month
    fetch(`/api/history?month=${selectedMonth}&keysOnly=true`, {
      signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined
    })
      .then(res => res.json())
      .then(async data => {
        if (data.history && data.history.length > 0) {
          const localItems = await db.history.toArray();
          const localServerIds = new Set(localItems.map(h => h.serverId).filter(Boolean));
          const localKeys = new Set(localItems.map(h => `${new Date(h.createdAt).getTime()}_${h.type}`));
          
          // Attach serverId to legacy records if missing
          for (const h of data.history) {
            if (!localServerIds.has(h.id)) {
              const key = `${new Date(h.created_at).getTime()}_${h.type}`;
              const localItem = localItems.find(item => `${new Date(item.createdAt).getTime()}_${item.type}` === key);
              if (localItem && !localItem.serverId) {
                await db.history.update(localItem.id!, { serverId: h.id });
                localServerIds.add(h.id);
              }
            }
          }

          // Find records we don't have locally
          const missingIds = data.history.filter((h: any) => {
            if (localServerIds.has(h.id)) return false;
            const key = `${new Date(h.created_at).getTime()}_${h.type}`;
            if (localKeys.has(key)) return false;
            return true;
          }).map((h: any) => h.id);

          if (missingIds.length > 0) {
            // 2. Fetch full records for missing IDs
            const fetchRes = await fetch('/api/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'fetch', ids: missingIds }),
              signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined
            });
            if (!fetchRes.ok) return;
            const fetchData = await fetchRes.json();
            
            if (fetchData.history && fetchData.history.length > 0) {
              const newRecords = fetchData.history.map((h: any) => ({
                serverId: h.id,
                userEmail: h.user_email,
                createdAt: new Date(h.created_at),
                type: h.type,
                totalCount: h.total_count,
                completedCount: h.completed_count,
                incompleteWords: h.incomplete_words,
                completeWords: h.complete_words,
                isSynced: true
              }));

              await db.history.bulkAdd(newRecords);
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  }, [session?.user?.email, selectedMonth]);

  const userHistory = useMemo(() => {
    if (!rawHistory || !session?.user?.email) return [];
    
    const sorted = rawHistory
      .filter(h => h.userEmail === session.user?.email && !h.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const deduped: typeof sorted = [];
    for (const record of sorted) {
      const isDuplicate = deduped.some(d => 
        d.type === record.type &&
        d.totalCount === record.totalCount &&
        d.completedCount === record.completedCount &&
        Math.abs(new Date(d.createdAt).getTime() - new Date(record.createdAt).getTime()) < 60000 // 1분 이내 동일 유형/개수면 중복으로 간주
      );
      if (!isDuplicate) {
        deduped.push(record);
      }
    }
    return deduped;
  }, [rawHistory, session?.user?.email]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    userHistory.forEach(h => {
      months.add(new Date(h.createdAt).toISOString().slice(0, 7));
    });
    if (months.size === 0) months.add(currentMonthStr);
    return Array.from(months).sort().reverse();
  }, [userHistory, currentMonthStr]);

  const filteredHistory = useMemo(() => {
    return userHistory.filter(h => new Date(h.createdAt).toISOString().slice(0, 7) === selectedMonth);
  }, [userHistory, selectedMonth]);

  const stats = useMemo(() => {
    let studySessions = 0;
    let testSessions = 0;
    let totalWords = 0;

    filteredHistory.forEach(h => {
      if (h.type === 'study') studySessions++;
      if (h.type === 'test') testSessions++;
      totalWords += h.totalCount;
    });

    return { studySessions, testSessions, totalWords };
  }, [filteredHistory]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("이 기록을 삭제하시겠습니까?")) {
      const record = await db.history.get(id);
      if (!record) return;

      await db.history.update(id, { isDeleted: true, deletedAt: new Date(), isSynced: false });
      
      if (record.serverId && typeof navigator !== 'undefined' && navigator.onLine) {
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', keys: [record.serverId] })
        }).then(res => {
          if (res.ok) {
            db.history.update(id, { isSynced: true });
          }
        }).catch(console.error);
      }
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-20">
        <h2 className="text-headline-lg font-bold text-on-surface mb-4">로그인이 필요합니다</h2>
        <p className="text-body-md text-on-surface-variant">
          학습 기록을 보려면 로그인을 진행해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col pt-8 pb-32 md:pb-8 px-4 h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-display-sm font-bold text-on-surface">학습 기록</h1>
          {isSyncing && (
            <div className="flex items-center gap-1.5 text-label-sm text-primary bg-primary-container/20 px-2.5 py-1 rounded-full animate-pulse border border-primary/20">
              <RefreshCw size={14} className="animate-spin" />
              <span>동기화 중...</span>
            </div>
          )}
        </div>
        <div className="relative">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-surface-container py-2 pl-4 pr-10 rounded-xl font-bold text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer border border-outline-variant"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{m.replace('-', '년 ')}월</option>
            ))}
          </select>
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={18} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-surface-variant shadow-sm">
          <BookOpen className="text-primary mb-2" size={24} />
          <span className="text-label-sm text-on-surface-variant mb-1 font-bold">학습 횟수</span>
          <span className="text-headline-sm font-bold text-on-surface">{stats.studySessions}</span>
        </div>
        <div className="bg-surface-container rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-surface-variant shadow-sm">
          <PlaySquare className="text-primary mb-2" size={24} />
          <span className="text-label-sm text-on-surface-variant mb-1 font-bold">테스트 횟수</span>
          <span className="text-headline-sm font-bold text-on-surface">{stats.testSessions}</span>
        </div>
        <div className="bg-surface-container rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-surface-variant shadow-sm">
          <div className="text-primary mb-2 font-black text-xl">W</div>
          <span className="text-label-sm text-on-surface-variant mb-1 font-bold">진행 단어 수</span>
          <span className="text-headline-sm font-bold text-on-surface">{stats.totalWords}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-surface-variant">
            해당 월의 기록이 없습니다.
          </div>
        ) : (
          filteredHistory.map(history => {
            const isExpanded = expandedId === history.id;
            const dateStr = new Date(history.createdAt).toLocaleString('ko-KR', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div key={history.id} className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden shadow-sm">
                <button 
                  onClick={() => setExpandedId(isExpanded ? null : history.id!)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container transition-colors text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm",
                      history.type === 'study' ? "bg-emerald-500" : "bg-blue-500"
                    )}>
                      {history.type === 'study' ? <BookOpen size={20} /> : <PlaySquare size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-body-md font-bold text-on-surface">
                          {history.type === 'study' ? '단어 학습' : '단어 테스트'}
                          {history.lang && (
                            <span className="text-body-sm font-normal text-on-surface-variant ml-1">
                              {history.lang === 'ja' ? '(일본어한자)' : '(영어)'}
                            </span>
                          )}
                        </span>
                        {!history.isSynced && (
                          <span className="text-[10px] bg-surface-variant px-2 py-0.5 rounded-full text-on-surface-variant">
                            미동기화
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-on-surface-variant flex items-center gap-2">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{history.completedCount} / {history.totalCount} 단어 완료</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-on-surface-variant p-2">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-3 pt-3 border-t border-surface-variant bg-surface-container-lowest">
                    <div className="flex justify-end mb-3">
                      <button 
                        onClick={(e) => handleDelete(e, history.id!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error bg-error-container/20 hover:bg-error-container/40 rounded-full transition-colors"
                      >
                        <Trash2 size={14} />
                        기록 삭제
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {history.incompleteWords && (
                        <div>
                          <h4 className="text-label-sm font-bold text-error mb-1 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-error inline-block" />
                            {history.type === 'study' ? '미완료 단어' : '오답 단어'}
                          </h4>
                          <p className="text-xs leading-relaxed text-on-surface-variant bg-error-container/10 p-2 rounded-xl border border-error-container/30">
                            {history.incompleteWords}
                          </p>
                        </div>
                      )}
                      
                      {history.completeWords && (
                        <div>
                          <h4 className="text-label-sm font-bold text-primary mb-1 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                            {history.type === 'study' ? '완료 단어' : '정답 단어'}
                          </h4>
                          <p className="text-xs leading-relaxed text-on-surface-variant bg-primary-container/10 p-2 rounded-xl border border-primary-container/30">
                            {history.completeWords}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
