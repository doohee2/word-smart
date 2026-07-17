"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, WordList } from "@/lib/db";
import { useState } from "react";
import { Check, Edit, Trash2, X } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

function WordListItem({ list, onDeleteRequest }: { list: WordList, onDeleteRequest: (list: WordList) => void }) {
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
              <button onClick={() => setIsEditing(true)} className="text-outline hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-variant opacity-0 group-hover:opacity-100 focus:opacity-100">
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
        <div className="flex items-center ml-auto md:ml-4">
          <button onClick={handleDelete} className="text-outline hover:text-error transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-error-container min-h-touch-target min-w-touch-target">
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const lists = useLiveQuery(() => db.wordLists.orderBy('createdAt').reverse().toArray());
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, listToDelete: WordList | null}>({isOpen: false, listToDelete: null});

  const confirmDelete = async () => {
    const list = modalConfig.listToDelete;
    if (list?.id) {
      await db.words.where('listId').equals(list.id).delete();
      await db.wordLists.delete(list.id);
    }
    setModalConfig({isOpen: false, listToDelete: null});
  };

  return (
    <div className="w-full h-full flex flex-col pt-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">단어장 관리</h1>
          <p className="text-body-md text-on-surface-variant">저장된 단어장을 관리하고 학습 현황을 확인하세요.</p>
        </div>
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
            <WordListItem key={list.id} list={list} onDeleteRequest={(l) => setModalConfig({isOpen: true, listToDelete: l})} />
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
    </div>
  );
}
