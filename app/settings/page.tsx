"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, WordList } from "@/lib/db";
import { useState } from "react";
import { Check, Edit, Trash2, X, Download, CloudUpload, CloudDownload, ChevronDown, ChevronUp } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);

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
      "Korean Translation": w.exampleKo,
      "zipf_score": w.zipfScore !== undefined && w.zipfScore !== null ? w.zipfScore : ""
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
    <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-3 md:p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-2xl"></div>
      
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 w-full min-w-0">
        <div className="flex items-start gap-4 flex-1 w-full min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {/* Checkbox */}
          <div className="mt-1 shrink-0" title="학습/테스트 범위에 포함하기" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center justify-center w-6 h-6 rounded border border-outline-variant cursor-pointer hover:bg-surface-variant has-[:checked]:bg-primary has-[:checked]:border-primary transition-colors">
              <input className="sr-only" type="checkbox" checked={list.isActive || false} onChange={handleToggleActive} />
              <Check size={16} className="text-white opacity-0 group-has-[:checked]:opacity-100" />
            </label>
          </div>
          
          <div className="flex-1 min-w-0 w-full">
            {isEditing ? (
              <div className="flex items-center gap-2 mb-1 w-full" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="border-b border-primary bg-transparent outline-none text-headline-md font-bold text-on-surface flex-1 min-w-0"
                  autoFocus
                />
                <button onClick={handleRename} className="text-primary hover:bg-surface-variant rounded-full p-1 shrink-0">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsEditing(false)} className="text-error hover:bg-error-container rounded-full p-1 shrink-0">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1 w-full min-w-0">
                <h3 className="text-title-md font-bold text-on-surface truncate flex-1 group-hover:text-primary transition-colors" title={list.title}>
                  {list.title}
                </h3>
                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-outline shrink-0 hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-variant opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <Edit size={18} />
                </button>
              </div>
            )}
            <p className="text-label-sm text-on-surface-variant truncate">생성일: {Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(list.createdAt)}</p>
          </div>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="shrink-0 text-outline hover:text-primary transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-variant"
        >
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="flex flex-row items-center justify-between gap-2 w-full mt-3 pt-3 border-t border-surface-variant animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-row items-center gap-1 md:gap-4 flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-[32px] md:min-w-[60px]">
              <span className="text-[13px] md:text-headline-sm font-bold text-on-surface">{stats.total}</span>
              <span className="text-[9px] md:text-[10px] text-outline font-semibold">단어</span>
            </div>
            <div className="w-px h-6 bg-surface-variant"></div>
            <div className="flex flex-col items-center min-w-[32px] md:min-w-[60px]">
              <span className="text-[13px] md:text-headline-sm font-bold text-on-surface">{stats.testCount}</span>
              <span className="text-[9px] md:text-[10px] text-outline font-semibold">테스트</span>
            </div>
            <div className="w-px h-6 bg-surface-variant"></div>
            
            {/* Mobile Rate (No Bar) */}
            <div className="flex md:hidden flex-col items-center min-w-[32px]">
              <span className="text-[13px] font-bold text-primary">{stats.rate}%</span>
              <span className="text-[9px] text-outline font-semibold">완료율</span>
            </div>
            
            {/* PC Rate (With Bar) */}
            <div className="hidden md:flex flex-1 md:w-32 flex-col gap-1 justify-center">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-outline font-semibold">완료율</span>
                <span className="text-label-sm font-bold text-primary">{stats.rate}%</span>
              </div>
              <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${stats.rate}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-1 shrink-0">
            <button onClick={handleExportCSV} className="text-outline hover:text-primary transition-colors flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-surface-variant" title="CSV로 내보내기">
              <Download className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            {status === "authenticated" && (
              <button onClick={handleUploadDB} className="text-outline hover:text-primary transition-colors flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-surface-variant" title="DB로 업로드">
                <CloudUpload className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
            <button onClick={handleDelete} className="text-outline hover:text-error transition-colors flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-error-container" title="삭제">
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { status } = useSession();
  const lists = useLiveQuery(() => db.wordLists.orderBy('title').toArray());
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, listToDelete: WordList | null}>({isOpen: false, listToDelete: null});
  const [uploadStatus, setUploadStatus] = useState<{isOpen: boolean, message: string, type: 'info'|'success'|'error', isUploading: boolean}>({isOpen: false, message: '', type: 'info', isUploading: false});
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const isAllActive = lists && lists.length > 0 && lists.every(l => l.isActive);

  const handleToggleAll = async () => {
    if (!lists) return;
    const newValue = !isAllActive;
    await Promise.all(
      lists.map(list => {
        if (list.id) {
          return db.wordLists.update(list.id, { isActive: newValue });
        }
      })
    );
  };

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
    <div className="w-full h-full flex flex-col pt-4">
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <label className="group flex items-center justify-center w-7 h-7 rounded border-2 border-outline-variant cursor-pointer hover:bg-surface-variant has-[:checked]:bg-primary has-[:checked]:border-primary transition-colors shrink-0" title="전체 선택 / 해제">
              <input className="sr-only" type="checkbox" checked={isAllActive || false} onChange={handleToggleAll} />
              <Check size={18} className="text-white opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
            </label>
            <h1 className="text-headline-lg font-bold text-on-surface">단어장 관리</h1>
          </div>
          <p className="text-body-md text-on-surface-variant">저장된 단어장을 관리하고 학습 현황을 확인하세요.</p>
        </div>
        <button 
          onClick={() => setIsDownloadModalOpen(true)} 
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <CloudDownload size={18} />
          DB에서 다운로드
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
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
