"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, WordList } from "@/lib/db";
import { useState } from "react";
import { Check, Edit, Trash2, X, Download, CloudUpload, CloudDownload } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import Papa from "papaparse";
import { useSession } from "next-auth/react";
import { DBDownloadModal } from "@/components/DBDownloadModal";

function WordListItem({ 
  list, 
  onDeleteRequest, 
  onUploadRequest 
}: { 
  list: WordList, 
  onDeleteRequest: (list: WordList) => void,
  onUploadRequest: (list: WordList) => void 
}) {
  const { status } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);

  const stats = useLiveQuery(async () => {
    if (!list.id) return { total: 0, testCount: 0, rate: 0 };
    const words = await db.words.where('listId').equals(list.id).toArray();
    const total = words.length;
    const learned = words.filter(w => w.isLearned).length;
    const testCount = words.reduce((acc, w) => acc + w.testCount, 0);
    return {
      total,
      testCount,
      rate: total === 0 ? 0 : Math.round((learned / total) * 100)
    };
  }, [list.id]);

  const handleDelete = () => {
    onDeleteRequest(list);
  };

  const handleToggleActive = async () => {
    if (list.id) {
      await db.wordLists.update(list.id, { isActive: !list.isActive });
    }
  };

  const handleRename = async () => {
    if (list.id && editTitle.trim() !== '') {
      await db.wordLists.update(list.id, { title: editTitle.trim() });
      setIsEditing(false);
    }
  };

  const handleExportCSV = async () => {
    if (!list.id) return;
    const words = await db.words.where('listId').equals(list.id).toArray();
    const csvData = words.map(w => ({
      "Word": w.word,
      "Part of Speech": w.partOfSpeech,
      "Korean Meaning": w.meaningKo,
      "Example Sentence": w.exampleEn,
      "Korean Translation": w.exampleKo
    }));
    
    const csvStr = Papa.unparse(csvData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadDB = () => {
    onUploadRequest(list);
  };

  if (!stats) return null; // loading

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-2xl"></div>
      <div className="flex items-start gap-4 flex-1 w-full">
        {/* Checkbox (placeholder for active list selection in future) */}
        <div className="mt-1" title="학습/테스트 범위에 포함하기">
          <label className="flex items-center justify-center w-6 h-6 rounded border border-outline-variant cursor-pointer hover:bg-surface-variant has-[:checked]:bg-primary has-[:checked]:border-primary transition-colors">
            <input className="sr-only" type="checkbox" checked={list.isActive || false} onChange={handleToggleActive} />
            <Check size={16} className="text-white opacity-0 group-has-[:checked]:opacity-100" />
          </label>
        </div>
        
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2 mb-1">
              <input 
                type="text" 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="border-b border-primary bg-transparent outline-none text-headline-md font-bold text-on-surface w-full max-w-[200px]"
                autoFocus
              />
              <button onClick={handleRename} className="text-primary hover:bg-surface-variant rounded-full p-1">
                <Check size={18} />
              </button>
              <button onClick={() => setIsEditing(false)} className="text-error hover:bg-error-container rounded-full p-1">
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-headline-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                {list.title}
              </h3>
              <button onClick={() => setIsEditing(true)} className="text-outline hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-variant opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100">
                <Edit size={18} />
              </button>
            </div>
          )}
          <p className="text-label-sm text-on-surface-variant">생성일: {list.createdAt.toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex flex-row items-center gap-6 w-full md:w-auto pl-10 md:pl-0 border-t border-surface-variant md:border-none pt-4 md:pt-0">
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-headline-sm font-bold text-on-surface">{stats.total}</span>
          <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">단어 수</span>
        </div>
        <div className="w-px h-8 bg-surface-variant hidden md:block"></div>
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-headline-sm font-bold text-on-surface">{stats.testCount}</span>
          <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">테스트 횟수</span>
        </div>
        <div className="w-px h-8 bg-surface-variant hidden md:block"></div>
        <div className="flex-1 md:w-40 flex flex-col gap-1.5">
          <div className="flex justify-between items-end">
            <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">학습 완료율</span>
            <span className="text-label-sm font-bold text-primary">{stats.rate}%</span>
          </div>
          <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${stats.rate}%` }}></div>
          </div>
        </div>
        <div className="flex items-center ml-auto md:ml-4 gap-1">
          <button onClick={handleExportCSV} className="text-outline hover:text-primary transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant min-h-touch-target min-w-touch-target" title="CSV로 내보내기">
            <Download size={20} />
          </button>
          {status === "authenticated" && (
            <button onClick={handleUploadDB} className="text-outline hover:text-primary transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant min-h-touch-target min-w-touch-target" title="DB로 업로드">
              <CloudUpload size={20} />
            </button>
          )}
          <button onClick={handleDelete} className="text-outline hover:text-error transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-error-container min-h-touch-target min-w-touch-target" title="삭제">
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { status } = useSession();
  const lists = useLiveQuery(() => db.wordLists.orderBy('title').toArray());
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, listToDelete: WordList | null}>({isOpen: false, listToDelete: null});
  const [uploadStatus, setUploadStatus] = useState<{isOpen: boolean, message: string, type: 'info'|'success'|'error', isUploading: boolean}>({isOpen: false, message: '', type: 'info', isUploading: false});
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const confirmDelete = async () => {
    const list = modalConfig.listToDelete;
    if (list?.id) {
      await db.words.where('listId').equals(list.id).delete();
      await db.wordLists.delete(list.id);
    }
    setModalConfig({isOpen: false, listToDelete: null});
  };

  const handleUploadRequest = async (list: WordList) => {
    if (!list.id) return;
    setUploadStatus({ isOpen: true, message: `'${list.title}' 단어장을 업로드하는 중...`, type: 'info', isUploading: true });
    try {
      const words = await db.words.where('listId').equals(list.id).toArray();
      const res = await fetch('/api/db/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: list.title, words })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setUploadStatus({ isOpen: true, message: `'${list.title}' 단어장이 성공적으로 업로드되었습니다!`, type: 'success', isUploading: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setUploadStatus({ isOpen: true, message: `업로드 실패: ${error.message}`, type: 'error', isUploading: false });
    }
  };

  return (
    <div className="w-full h-full flex flex-col pt-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">단어장 관리</h1>
          <p className="text-body-md text-on-surface-variant">저장된 단어장을 관리하고 학습 현황을 확인하세요.</p>
        </div>
        {status === "authenticated" && (
          <button 
            onClick={() => setIsDownloadModalOpen(true)} 
            className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <CloudDownload size={20} />
            DB에서 다운로드
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {lists === undefined ? (
          <p className="text-on-surface-variant">로딩 중...</p>
        ) : lists.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant border-2 border-dashed border-outline-variant rounded-2xl">
            <p>등록된 단어장이 없습니다.</p>
            <p className="text-sm mt-2">우측 상단의 폴더 아이콘을 눌러 CSV 파일을 불러오세요.</p>
          </div>
        ) : (
          lists.map(list => (
            <WordListItem 
              key={list.id} 
              list={list} 
              onDeleteRequest={(l) => setModalConfig({isOpen: true, listToDelete: l})} 
              onUploadRequest={handleUploadRequest}
            />
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({isOpen: false, listToDelete: null})}
        title="단어장 삭제"
        message={`정말 '${modalConfig.listToDelete?.title}' 단어장을 삭제하시겠습니까?`}
        type="error"
        onConfirm={confirmDelete}
        confirmText="삭제"
      />

      <ConfirmModal
        isOpen={uploadStatus.isOpen}
        onClose={() => { if (!uploadStatus.isUploading) setUploadStatus(prev => ({...prev, isOpen: false})) }}
        title={uploadStatus.isUploading ? "업로드 중..." : (uploadStatus.type === 'success' ? "완료" : "오류")}
        message={uploadStatus.message}
        type={uploadStatus.type}
      />

      {isDownloadModalOpen && (
        <DBDownloadModal 
          isOpen={isDownloadModalOpen} 
          onClose={() => setIsDownloadModalOpen(false)} 
        />
      )}
    </div>
  );
}
