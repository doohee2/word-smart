"use client";

import { FolderOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import Papa from "papaparse";
import DrivePickerModal from "./DrivePickerModal";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "./ConfirmModal";
import { useLanguageMode } from "@/providers/LanguageModeProvider";

export function FileOpenButton() {
  const { status } = useSession();
  const { setLangMode } = useLanguageMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error'|'info', onConfirm?: () => void}>({isOpen: false, title: '', message: '', type: 'info'});
  const router = useRouter();

  const handleOpenClick = () => {
    if (status === "unauthenticated") {
      fileInputRef.current?.click();
    } else if (status === "authenticated") {
      setIsDriveModalOpen(true);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveToDb = async (fileName: string, data: any[]) => {
    try {
      const listTitle = fileName.replace(/\.[^/.]+$/, ""); // remove extension
      
      // Check if list already exists
      const list = await db.wordLists.where('title').equals(listTitle).first();
      let listId = list?.id;
      let isNewList = false;

      // Detect language from CSV header or character codes
      let detectedLang: 'en' | 'ja' | 'zh' = 'en';
      if (data.length > 0) {
        const firstRow = data[0];
        if ("한자" in firstRow && "훈음" in firstRow) {
          detectedLang = 'zh';
        } else if ("일본어한자" in firstRow || "일본어발음" in firstRow || "한글 뜻과 한자별 한글독음" in firstRow) {
          detectedLang = 'ja';
        } else {
          const firstWord = String(firstRow["Word"] || firstRow["일본어한자"] || Object.values(firstRow)[0] || "");
          if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(firstWord)) {
            detectedLang = 'ja';
          }
        }
      }

      if (!listId) {
        listId = await db.wordLists.add({
          title: listTitle,
          createdAt: new Date(),
          lang: detectedLang,
        });
        isNewList = true;
      } else if (list && list.lang !== detectedLang) {
        await db.wordLists.update(listId, { lang: detectedLang });
      }

      const parsedWords = data.map((row) => {
        let zipfScore: number | string | undefined = undefined;
        let word = "";
        let partOfSpeech = "";
        let meaningKo = "";
        let exampleEn = "";
        let exampleKo = "";

        if (detectedLang === 'zh') {
          word = String(row["한자"] || "").trim();
          partOfSpeech = String(row["부수와 형성원리"] || "").trim();
          meaningKo = String(row["훈음"] || "").trim();
          exampleEn = String(row["한자 단어"] || "").trim();
          exampleKo = String(row["한자 단어 독음"] || "").trim();
          zipfScore = row["급수 난이도"] ? String(row["급수 난이도"]).trim() : undefined;
        } else {
          const rawZipf = row["zipf_score"] || row["Zipf Score"];
          zipfScore = rawZipf && !isNaN(parseFloat(rawZipf)) ? parseFloat(rawZipf) : undefined;
          word = String(row["Word"] || row["일본어한자"] || "").trim();
          partOfSpeech = String(row["Part of Speech"] || row["일본어발음"] || "").trim();
          meaningKo = String(row["Korean Meaning"] || row["한글 뜻과 한자별 한글독음"] || "").trim();
          exampleEn = String(row["Example Sentence"] || row["일본어예문"] || "").trim();
          exampleKo = String(row["Korean Translation"] || row["예문한글번역문"] || "").trim();
        }
        return {
          listId: listId!,
          word,
          partOfSpeech,
          meaningKo,
          exampleEn,
          exampleKo,
          isLearned: false,
          testCount: 0,
          correctCount: 0,
          zipfScore,
        };
      }).filter(w => w.word !== "");

      // Get existing words to check for duplicates
      const existingWords = await db.words.where('listId').equals(listId).toArray();
      const existingWordSet = new Set(existingWords.map(w => w.word));

      const newWords = parsedWords.filter(w => !existingWordSet.has(w.word));
      const duplicateCount = parsedWords.length - newWords.length;

      if (newWords.length > 0) {
        await db.words.bulkAdd(newWords);
        
        let message = `단어장 '${listTitle}'에 ${newWords.length}개의 단어가 추가되었습니다.`;
        if (duplicateCount > 0) {
          message += `\n(중복되어 추가되지 않은 단어: ${duplicateCount}개)`;
        }

        setModalConfig({
          isOpen: true,
          title: '추가 완료',
          message: message,
          type: 'success',
          onConfirm: () => {
            setModalConfig(prev => ({...prev, isOpen: false}));
            setLangMode(detectedLang);
            router.push("/settings");
          }
        });
      } else {
        setModalConfig({
          isOpen: true, 
          title: '추가된 단어 없음', 
          message: duplicateCount > 0 
            ? `모든 단어(${duplicateCount}개)가 이미 단어장에 존재합니다.` 
            : "유효한 단어 데이터가 없습니다.", 
          type: 'info',
          onConfirm: () => setModalConfig(prev => ({...prev, isOpen: false}))
        });
        // If it was a newly created list but no words were added, clean it up
        if (isNewList) {
          await db.wordLists.delete(listId);
        }
      }
    } catch (error) {
      console.error("DB Save Error:", error);
      setModalConfig({
        isOpen: true, title: '저장 실패', message: "단어장을 저장하는 데 실패했습니다.", type: 'error',
        onConfirm: () => setModalConfig(prev => ({...prev, isOpen: false}))
      });
    }
  };

  const processCSVData = (fileName: string, csvText: string) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      complete: (results: Papa.ParseResult<any>) => {
        saveToDb(fileName, results.data);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (error: any) => {
        console.error("CSV Parse Error:", error);
        setModalConfig({
          isOpen: true, title: '파싱 실패', message: "CSV 파일을 파싱하는 데 실패했습니다.", type: 'error',
          onConfirm: () => setModalConfig(prev => ({...prev, isOpen: false}))
        });
      }
    });
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        processCSVData(file.name, text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDriveFileSelect = async (fileId: string, fileName: string) => {
    setIsDriveModalOpen(false);
    try {
      const res = await fetch(`/api/drive/download?fileId=${fileId}`);
      if (!res.ok) throw new Error("Failed to download file from Drive");
      
      const buffer = await res.arrayBuffer();
      const text = new TextDecoder("utf-8").decode(buffer);
      processCSVData(fileName, text);
    } catch (error) {
      console.error(error);
      setModalConfig({
        isOpen: true, title: '오류', message: "파일을 불러오지 못했습니다.", type: 'error',
        onConfirm: () => setModalConfig(prev => ({...prev, isOpen: false}))
      });
    }
  };

  return (
    <>
      <button 
        aria-label="폴더 열기" 
        onClick={handleOpenClick}
        className="p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
      >
        <FolderOpen size={24} />
      </button>

      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleLocalFileChange} 
        className="hidden" 
      />

      {isDriveModalOpen && (
        <DrivePickerModal 
          isOpen={isDriveModalOpen} 
          onClose={() => setIsDriveModalOpen(false)} 
          onSelectFile={handleDriveFileSelect} 
        />
      )}

      <ConfirmModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))}
      />
    </>
  );
}
