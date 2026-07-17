"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import clsx from "clsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PDFPage() {
  const lists = useLiveQuery(() => db.wordLists.orderBy('createdAt').reverse().toArray());
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  const rawWords = useLiveQuery(
    () => selectedListId ? db.words.where('listId').equals(selectedListId).toArray() : [],
    [selectedListId]
  );

  const [mode, setMode] = useState<'study' | 'test'>('study');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (lists && lists.length > 0 && selectedListId === null) {
      setSelectedListId(lists[0].id!);
    }
  }, [lists, selectedListId]);

  const generatePDF = async () => {
    if (!rawWords || rawWords.length === 0) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      
      // Fetch NanumGothic TTF and add to VFS
      // Using a reliable CDN for NanumGothic TTF
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

      // Title
      const selectedList = lists?.find(l => l.id === selectedListId);
      const title = `${selectedList?.title || '단어장'} - ${mode === 'study' ? '학습지' : '시험지'}`;
      doc.setFontSize(16);
      doc.text(title, 14, 15);

      // Prepare data
      const tableData = rawWords.map((word, idx) => {
        let displayWord = word.word;
        let displayMeaning = word.meaningKo;
        
        if (mode === 'test') {
          // Randomly blank out word or meaning
          if (Math.random() > 0.5) {
            displayWord = "";
          } else {
            displayMeaning = "";
          }
        }
        
        return [
          (idx + 1).toString(),
          displayWord,
          word.partOfSpeech || "-",
          displayMeaning,
          word.exampleEn || "-"
        ];
      });

      autoTable(doc, {
        startY: 20,
        head: [['No', '단어', '품사', '뜻', '예문']],
        body: tableData,
        styles: { font: 'NanumGothic', fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 108, 73], textColor: 255 }, // Primary color
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 40 },
          2: { cellWidth: 15 },
          3: { cellWidth: 40 },
          4: { cellWidth: 'auto' }
        },
        margin: { left: 10, right: 10 },
        // optimize for max words per page
        theme: 'grid'
      });

      doc.save(`${title}.pdf`);
    } catch (error) {
      console.error(error);
      alert("PDF 생성 중 오류가 발생했습니다. (인터넷 연결을 확인해주세요)");
    } finally {
      setIsGenerating(false);
    }
  };

  // HTML Preview Data
  const previewData = rawWords?.slice(0, 10).map(word => {
    let displayWord = word.word;
    let displayMeaning = word.meaningKo;
    
    if (mode === 'test') {
      // Mock random blank for preview
      if (Math.random() > 0.5) displayWord = "";
      else displayMeaning = "";
    }
    
    return { ...word, displayWord, displayMeaning };
  });

  if (lists === undefined || rawWords === undefined) {
    return <div className="flex-1 flex items-center justify-center">로딩 중...</div>;
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

  return (
    <div className="flex-1 flex flex-col w-full h-full pb-8 pt-8 md:pt-4">
      <section className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-headline-lg font-bold text-on-surface mb-2">PDF 인쇄</h2>
          <select 
            value={selectedListId || ""}
            onChange={(e) => setSelectedListId(Number(e.target.value))}
            className="w-full md:w-auto bg-surface-container border border-outline-variant rounded-xl px-4 py-2 text-label-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
          >
            {lists.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={generatePDF}
          disabled={isGenerating || rawWords.length === 0}
          className="w-full md:w-auto bg-primary hover:bg-primary-container text-on-primary px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-label-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {isGenerating ? "PDF 생성 중..." : <><Download size={20} /> PDF 다운로드</>}
        </button>
      </section>

      <div className="flex justify-center mb-8">
        <div className="bg-surface-container shadow-sm rounded-full p-1 inline-flex">
          <button 
            onClick={() => setMode('study')}
            className={clsx("px-6 py-2 rounded-full text-label-sm font-bold transition-all", mode === 'study' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
          >
            학습지 (정답 포함)
          </button>
          <button 
            onClick={() => setMode('test')}
            className={clsx("px-6 py-2 rounded-full text-label-sm font-bold transition-all", mode === 'test' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
          >
            시험지 (랜덤 빈칸)
          </button>
        </div>
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm overflow-hidden flex flex-col">
        <div className="bg-surface-variant px-4 py-3 border-b border-outline-variant flex items-center gap-2">
          <FileText size={18} className="text-on-surface-variant" />
          <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">미리보기 (최대 10개)</span>
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          {rawWords.length === 0 ? (
            <div className="text-center text-on-surface-variant py-12">선택한 단어장에 단어가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-outline-variant text-label-sm uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-1/4">단어</th>
                    <th className="py-3 px-4 w-16 text-center">품사</th>
                    <th className="py-3 px-4 w-1/4">뜻</th>
                    <th className="py-3 px-4">예문</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData?.map((w, idx) => (
                    <tr key={w.id} className="border-b border-surface-variant hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-4 text-center text-label-sm text-outline font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 text-body-md font-bold text-on-surface">
                        {w.displayWord ? w.displayWord : <div className="w-16 h-px bg-on-surface/50 my-3"></div>}
                      </td>
                      <td className="py-3 px-4 text-center text-label-sm text-outline">{w.partOfSpeech || "-"}</td>
                      <td className="py-3 px-4 text-body-md text-on-surface">
                        {w.displayMeaning ? w.displayMeaning : <div className="w-16 h-px bg-on-surface/50 my-3"></div>}
                      </td>
                      <td className="py-3 px-4 text-body-md text-on-surface-variant truncate max-w-[200px]" title={w.exampleEn}>
                        {w.exampleEn || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
