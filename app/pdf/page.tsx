"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useLiveQuery } from "dexie-react-hooks";
import { db, Word } from "@/lib/db";
import { useState, useEffect } from "react";
import { Download, Settings2, X, Plus, Minus, FileText, ChevronLeft } from "lucide-react";
import clsx from "clsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/ConfirmModal";
import { maskExampleSentence } from "@/lib/textUtils";

export default function PDFPage() {
  const lists = useLiveQuery(() => db.wordLists.toArray());
  const activeLists = useLiveQuery(() => db.wordLists.filter(list => !!list.isActive).toArray());
  const rawWords = useLiveQuery(async () => {
    const activeListIds = (await db.wordLists.filter(l => !!l.isActive).toArray()).map(l => l.id!);
    if (activeListIds.length === 0) return [];
    return db.words.where('listId').anyOf(activeListIds).toArray();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string, type: 'info'|'success'|'error', title: string}>({isOpen: false, message: '', type: 'info', title: ''});

  // PDF Settings
  const [wordCount, setWordCount] = useState<number | string>(50);
  const [questionType, setQuestionType] = useState<'english' | 'korean' | 'random'>('random');

  // Load saved settings
  useEffect(() => {
    const savedCount = localStorage.getItem('setting_pdfWordCount');
    if (savedCount) setWordCount(savedCount);
    const savedType = localStorage.getItem('setting_pdfQuestionType');
    if (savedType) setQuestionType(savedType as 'english' | 'korean' | 'random');
  }, []);

  // Save settings on change
  useEffect(() => {
    localStorage.setItem('setting_pdfWordCount', wordCount.toString());
    localStorage.setItem('setting_pdfQuestionType', questionType);
  }, [wordCount, questionType]);

  // Preview State
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewWords, setPreviewWords] = useState<Word[]>([]);
  const [previewTab, setPreviewTab] = useState<'test' | 'study'>('test');

  const adjustCount = (delta: number) => {
    setWordCount(prev => {
      const current = typeof prev === 'number' ? prev : parseInt(prev) || 0;
      const next = current + delta;
      return next > 0 ? next : 25;
    });
  };

  const currentCount = typeof wordCount === 'number' ? wordCount : parseInt(wordCount) || 0;
  const estimatedPages = Math.ceil(currentCount / 25);

  const startPreview = () => {
    if (!rawWords) return;
    const pool = [...rawWords];
    pool.sort(() => 0.5 - Math.random());
    const count = currentCount > 0 ? currentCount : 50;
    
    let selectedWords: Word[] = [];
    if (count <= pool.length) {
      selectedWords = pool.slice(0, count);
    } else {
      selectedWords = [...pool];
      let remaining = count - pool.length;
      while (remaining > 0) {
        selectedWords.push(pool[Math.floor(Math.random() * pool.length)]);
        remaining--;
      }
    }
    
    setPreviewWords(selectedWords);
    setIsPreviewMode(true);
    setIsModalOpen(false);
  };

  const getProcessedWord = (word: Word, mode: 'study' | 'test') => {
    let displayWord = word.word;
    let displayMeaning = word.meaningKo;
    let displayExample = word.exampleEn || "-";
    
    if (mode === 'test') {
      let blankType: 'english' | 'korean' = 'english';
      if (questionType === 'english') blankType = 'korean'; 
      else if (questionType === 'korean') blankType = 'english'; 
      else blankType = Math.random() > 0.5 ? 'english' : 'korean';
      
      if (blankType === 'english') {
        displayWord = word.word.replace(/[a-zA-Z]/g, '·');
        if (displayExample !== "-") {
          displayExample = maskExampleSentence(word.word, displayExample, '_');
        }
      } else {
        displayMeaning = "";
      }
    }
    return { displayWord, displayMeaning, displayExample, partOfSpeech: word.partOfSpeech || "-" };
  };

  const generatePDF = async (mode: 'study' | 'test') => {
    if (previewWords.length === 0) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      
      const response = await fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf");
      if (!response.ok) throw new Error("Failed to fetch font");
      
      const buffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Font = window.btoa(binary);
      
      doc.addFileToVFS('NanumGothic.ttf', base64Font);
      doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
      doc.setFont('NanumGothic');

      const baseTitle = activeLists && activeLists.length > 1 
        ? `${activeLists[0].title} 외 ${activeLists.length - 1}개 단어장` 
        : (activeLists?.[0]?.title || '단어장');
      
      const title = `${baseTitle} - ${mode === 'study' ? '학습지' : '시험지'}`;
      const subtitle = `(총 ${rawWords?.length || 0}개 단어 중 ${previewWords.length}개 출제)`;

      doc.setFontSize(16);
      doc.text(title, 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, 14, 22);

      // Pre-process for consistent random blanking across rows
      const tableData = previewWords.map((word, idx) => {
        const { displayWord, displayMeaning, displayExample, partOfSpeech } = getProcessedWord(word, mode);
        return [
          (idx + 1).toString(),
          displayWord,
          partOfSpeech,
          displayMeaning,
          displayExample
        ];
      });

      autoTable(doc, {
        startY: 26,
        head: [['No', '단어', '품사', '뜻', '예문']],
        body: tableData,
        styles: { font: 'NanumGothic', fontSize: 10, cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 }, minCellHeight: 9.5, valign: 'middle' },
        headStyles: { font: 'NanumGothic', fontStyle: 'normal', fillColor: [0, 108, 73], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 248] }, // Zebra striping
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 40 },
          2: { cellWidth: 12, halign: 'center', fontSize: 8 }, 
          3: { cellWidth: 40 },
          4: { cellWidth: 'auto', fontSize: 8 } 
        },
        margin: { left: 10, right: 10, bottom: 10 },
        theme: 'grid',
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1 && typeof data.cell.raw === 'string' && data.cell.raw.includes('·')) {
            data.cell.styles.textColor = [160, 160, 160];
          }
        }
      });

      doc.save(`${title}.pdf`);
    } catch (error) {
      console.error(error);
      setAlertConfig({ isOpen: true, message: "PDF 생성 중 오류가 발생했습니다.\n(인터넷 연결을 확인해주세요)", type: 'error', title: '오류' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (lists === undefined || activeLists === undefined || rawWords === undefined) {
    return <div className="p-6 text-center text-on-surface-variant">로딩 중...</div>;
  }

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-20">
        <h2 className="text-headline-lg font-bold text-on-surface mb-4">단어장이 없습니다.</h2>
        <p className="text-body-md text-on-surface-variant">
          우측 상단의 폴더 버튼을 눌러 CSV 단어장을 추가해주세요.
        </p>
      </div>
    );
  }

  if (activeLists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-20">
        <h2 className="text-headline-lg font-bold text-on-surface mb-4">선택된 단어장이 없습니다.</h2>
        <p className="text-body-md text-on-surface-variant">
          설정 메뉴에서 학습할 단어장의 좌측 체크박스를 선택해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full pb-8 pt-8 md:pt-4 relative">


      {!isPreviewMode ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mb-6">
              <FileText size={40} className="text-primary" />
            </div>
            <h2 className="text-headline-lg font-bold text-on-surface mb-2">선택된 단어장 {activeLists.length}개</h2>
            <p className="text-body-md text-on-surface-variant">총 {rawWords.length}개의 단어가 준비되었습니다.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full h-14 mt-auto mb-4 bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold shadow-md transition-all active:scale-95"
          >
            <FileText size={20} />
            PDF 학습지 만들기
          </button>

          <div className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-4 text-xs text-on-surface break-words whitespace-pre-wrap leading-relaxed">
            선택된 단어장: {activeLists.map(l => l.title).join(', ')}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex justify-end md:justify-between items-center mb-4 gap-4">
            <h2 className="text-title-lg font-bold text-on-surface hidden md:flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              미리보기
            </h2>
            <div className="flex flex-1 md:flex-none gap-2">
              <button 
                onClick={() => setIsPreviewMode(false)} 
                className="bg-surface-container hover:bg-surface-variant text-on-surface px-4 py-3 rounded-xl flex items-center justify-center gap-1 text-label-sm font-bold shadow-sm transition-all active:scale-95"
              >
                <ChevronLeft size={18} /> <span className="hidden md:inline">이전</span>
              </button>
              <button 
                onClick={() => generatePDF(previewTab)}
                disabled={isGenerating}
                className="flex-1 md:flex-none bg-primary hover:bg-primary-container text-on-primary px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-label-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? "생성 중..." : <><Download size={18} /> PDF 파일 저장하기</>}
              </button>
            </div>
          </div>

          <div className="flex bg-surface-container rounded-xl p-1 mb-4">
            <button 
              onClick={() => setPreviewTab('test')}
              className={clsx("flex-1 py-3 text-label-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2", previewTab === 'test' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
            >
              시험지 (빈칸)
            </button>
            <button 
              onClick={() => setPreviewTab('study')}
              className={clsx("flex-1 py-3 text-label-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2", previewTab === 'study' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
            >
              학습지 (정답)
            </button>
          </div>

          <div className="flex-1 bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm flex flex-col min-h-0">
            <div className="bg-surface-variant px-4 py-3 border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-on-surface-variant" />
                <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                  미리보기 (처음 10개)
                </span>
              </div>
              <span className="text-[10px] text-outline font-bold">
                총 {previewWords.length}단어 / 예상 {estimatedPages}쪽
              </span>
            </div>
            
            <div className="overflow-auto flex-1 p-4 relative">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-outline-variant text-label-sm uppercase tracking-wider text-on-surface-variant bg-surface-container-lowest sticky top-0 shadow-sm z-10">
                    <th className="py-2 px-3 w-12 text-center bg-surface-container-lowest">No</th>
                    <th className="py-2 px-3 w-1/4 bg-surface-container-lowest">단어</th>
                    <th className="py-2 px-3 w-16 text-center bg-surface-container-lowest">품사</th>
                    <th className="py-2 px-3 w-1/4 bg-surface-container-lowest">뜻</th>
                    <th className="py-2 px-3 bg-surface-container-lowest">예문</th>
                  </tr>
                </thead>
                <tbody>
                  {previewWords.slice(0, 10).map((w, idx) => {
                    const { displayWord, displayMeaning, displayExample, partOfSpeech } = getProcessedWord(w, previewTab);
                    return (
                      <tr key={idx} className={clsx("border-b border-surface-variant hover:bg-surface-container/50 transition-colors", idx % 2 === 1 ? "bg-surface-container-lowest" : "bg-surface-container/30")}>
                        <td className="py-2 px-3 text-center text-label-sm text-outline font-bold">{idx + 1}</td>
                        <td className={clsx("py-2 px-3 text-body-md", displayWord.includes('·') ? "text-outline/70" : "font-bold text-on-surface")}>
                          {displayWord}
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] text-outline font-semibold">{partOfSpeech}</td>
                        <td className="py-2 px-3 text-body-md text-on-surface">
                          {displayMeaning}
                        </td>
                        <td className="py-2 px-3 text-body-sm text-on-surface-variant max-w-[200px]" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                          {displayExample}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {previewWords.length > 10 && (
                <div className="text-center py-4 text-label-sm text-outline font-bold">
                  ... 외 {previewWords.length - 10}개 단어 생략됨
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
            <motion.div 
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              className="bg-surface w-full max-w-md rounded-t-[32px] md:rounded-[32px] p-6 shadow-xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
                  <Settings2 size={24} className="text-primary" />
                  PDF 출제 설정
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-surface-container rounded-full text-on-surface-variant hover:bg-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-6 mb-8">
                {/* 단어 수 조절 */}
                <div>
                  <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">출제 단어 수</label>
                  <div className="flex items-center gap-4 bg-surface-container p-2 rounded-2xl">
                    <button onClick={() => adjustCount(-25)} className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-variant transition-colors shadow-sm text-primary">
                      <Minus size={20} />
                    </button>
                    <div className="flex-1 min-w-0 flex flex-col items-center">
                      <input 
                        type="number" 
                        value={wordCount}
                        onChange={(e) => setWordCount(e.target.value)}
                        className="w-full bg-transparent text-center text-headline-lg font-bold text-on-surface outline-none"
                      />
                      <span className="text-label-sm text-primary">예상 페이지 수: {estimatedPages}쪽</span>
                    </div>
                    <button onClick={() => adjustCount(25)} className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-variant transition-colors shadow-sm text-primary">
                      <Plus size={20} />
                    </button>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-2 px-1">
                    단어장에 있는 수({rawWords.length}개)보다 많은 수를 입력하면 랜덤하게 반복 출제됩니다. (1페이지 당 25단어)
                  </p>
                </div>

                {/* 시험지 출제 유형 */}
                <div>
                  <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">시험지 출제 유형</label>
                  <div className="flex bg-surface-container rounded-xl p-1">
                    <button 
                      onClick={() => setQuestionType('english')}
                      className={clsx("flex-1 py-2 text-label-sm font-bold rounded-lg transition-colors", questionType === 'english' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
                    >
                      영어만 (뜻 빈칸)
                    </button>
                    <button 
                      onClick={() => setQuestionType('korean')}
                      className={clsx("flex-1 py-2 text-label-sm font-bold rounded-lg transition-colors", questionType === 'korean' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
                    >
                      한글만 (영어 빈칸)
                    </button>
                    <button 
                      onClick={() => setQuestionType('random')}
                      className={clsx("flex-1 py-2 text-label-sm font-bold rounded-lg transition-colors", questionType === 'random' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
                    >
                      무작위 섞어서
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={startPreview}
                className="w-full h-14 bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold shadow-md transition-all active:scale-95"
              >
                미리보기 생성
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({...prev, isOpen: false}))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}
