import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { X, DownloadCloud, Trash2 } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import clsx from "clsx";

interface DBList {
  id: string;
  title: string;
  user_email: string;
  created_at: string;
  count: number;
}

export function DBDownloadModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [lists, setLists] = useState<DBList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusConfig, setStatusConfig] = useState<{isOpen: boolean, message: string, type: 'success'|'error'|'info'}>({isOpen: false, message: '', type: 'info'});
  
  const { data: session } = useSession();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const localLists = useLiveQuery(() => db.wordLists.toArray()) || [];
  const localListTitles = new Set(localLists.map(l => l.title));

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch('/api/db/list')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setLists(data.lists || []);
      })
      .catch(err => {
        setError("단어장 목록을 불러오지 못했습니다.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleDownload = async (dbList: DBList) => {
    setDownloadingId(dbList.id);
    try {
      const res = await fetch(`/api/db/download?listId=${dbList.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const words = data.words || [];
      if (words.length === 0) {
        setStatusConfig({ isOpen: true, message: "다운로드할 단어가 없습니다.", type: 'info' });
        return;
      }

      // Check existing list in local Dexie DB
      const list = await db.wordLists.where('title').equals(dbList.title).first();
      let localListId = list?.id;
      let isNewList = false;

      if (!localListId) {
        localListId = await db.wordLists.add({
          title: dbList.title,
          createdAt: new Date(),
        });
        isNewList = true;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedWords = words.map((w: any) => ({
        listId: localListId!,
        word: w.word || "",
        partOfSpeech: w.part_of_speech || "",
        meaningKo: w.meaning_ko || "",
        exampleEn: w.example_en || "",
        exampleKo: w.example_ko || "",
        isLearned: false,
        testCount: 0,
        correctCount: 0,
      }));

      // Find existing words to avoid duplicates
      const existingLocalWords = await db.words.where('listId').equals(localListId).toArray();
      const existingWordSet = new Set(existingLocalWords.map(w => w.word));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newWords = parsedWords.filter((w: any) => !existingWordSet.has(w.word));
      const duplicateCount = parsedWords.length - newWords.length;

      if (newWords.length > 0) {
        await db.words.bulkAdd(newWords);
        
        let message = `단어장 '${dbList.title}'에 ${newWords.length}개의 단어가 다운로드되었습니다.`;
        if (duplicateCount > 0) {
          message += `\n(중복되어 추가되지 않은 단어: ${duplicateCount}개)`;
        }
        setStatusConfig({ isOpen: true, message, type: 'success' });
      } else {
        setStatusConfig({
          isOpen: true, 
          message: duplicateCount > 0 
            ? `모든 단어(${duplicateCount}개)가 이미 단어장에 존재합니다.` 
            : "유효한 단어 데이터가 없습니다.", 
          type: 'info'
        });
        if (isNewList) {
          await db.wordLists.delete(localListId);
        }
      }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Download Error:", err);
      setStatusConfig({ isOpen: true, message: `다운로드 실패: ${err.message}`, type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/db/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listId: id })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLists(prev => prev.filter(l => l.id !== id));
      setStatusConfig({ isOpen: true, message: '단어장이 성공적으로 삭제되었습니다.', type: 'success' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Delete Error:", err);
      setStatusConfig({ isOpen: true, message: `삭제 실패: ${err.message}`, type: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-3xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-surface-variant">
          <h2 className="text-title-lg font-bold text-on-surface">DB에서 단어장 다운로드</h2>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-on-surface-variant">불러오는 중...</div>
          ) : error ? (
            <div className="text-center py-8 text-error">{error}</div>
          ) : lists.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">DB에 저장된 단어장이 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {lists.map(list => {
                const isDuplicate = localListTitles.has(list.title);
                return (
                  <div key={list.id} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-surface-variant hover:border-primary/30 transition-colors group">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-label-lg font-bold text-on-surface truncate">{list.title}</h3>
                      <p className="text-label-sm text-on-surface-variant truncate">단어 {list.count}개 • 업로더: {list.user_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session?.user?.email === list.user_email && (
                        <button 
                          onClick={() => setDeleteConfirmId(list.id)}
                          disabled={isDeleting || downloadingId === list.id}
                          className="p-2 text-error hover:bg-error-container rounded-xl transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownload(list)} 
                        disabled={downloadingId === list.id}
                        className={clsx(
                          "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50",
                          isDuplicate 
                            ? "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80 opacity-70"
                            : "bg-primary-container text-on-primary-container hover:bg-primary/20"
                        )}
                        title={isDuplicate ? "이미 같은 이름의 단어장이 존재합니다" : "단어장 다운로드"}
                      >
                        {downloadingId === list.id ? (
                          <span>다운로드 중...</span>
                        ) : (
                          <>
                            <DownloadCloud size={18} />
                            <span className="hidden sm:inline">다운로드</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={statusConfig.isOpen}
        onClose={() => setStatusConfig(prev => ({...prev, isOpen: false}))}
        title={statusConfig.type === 'success' ? '다운로드 완료' : statusConfig.type === 'error' ? '실패' : '알림'}
        message={statusConfig.message}
        type={statusConfig.type}
      />

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="단어장 삭제"
        message="DB에서 삭제한 단어장은 다시 복구할 수 없습니다. 정말로 삭제하시겠습니까?"
        type="error"
        confirmText="삭제"
        cancelText="취소"
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
      />
    </div>
  );
}
