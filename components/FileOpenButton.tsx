"use client";

import { FolderOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import Papa from "papaparse";
import DrivePickerModal from "./DrivePickerModal";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";

export function FileOpenButton() {
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const router = useRouter();

  const handleOpenClick = () => {
    if (status === "unauthenticated") {
      fileInputRef.current?.click();
    } else if (status === "authenticated") {
      setIsDriveModalOpen(true);
    }
  };

  const saveToDb = async (fileName: string, data: any[]) => {
    try {
      const listId = await db.wordLists.add({
        title: fileName.replace(/\.[^/.]+$/, ""), // remove extension
        createdAt: new Date(),
      });

      const words = data.map((row) => ({
        listId,
        word: row["Word"] || "",
        partOfSpeech: row["Part of Speech"] || "",
        meaningKo: row["Korean Meaning"] || "",
        exampleEn: row["Example Sentence"] || "",
        exampleKo: row["Korean Translation"] || "",
        isLearned: false,
        testCount: 0,
        correctCount: 0,
      })).filter(w => w.word !== "");

      if (words.length > 0) {
        await db.words.bulkAdd(words);
        alert(`단어장 '${fileName}'에 ${words.length}개의 단어가 추가되었습니다.`);
        router.push("/settings");
      } else {
        alert("유효한 단어 데이터가 없습니다.");
        // If empty, rollback list
        await db.wordLists.delete(listId);
      }
    } catch (error) {
      console.error("DB Save Error:", error);
      alert("단어장을 저장하는 데 실패했습니다.");
    }
  };

  const processCSVData = (fileName: string, csvText: string) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        saveToDb(fileName, results.data);
      },
      error: (error: any) => {
        console.error("CSV Parse Error:", error);
        alert("CSV 파일을 파싱하는 데 실패했습니다.");
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
      alert("파일을 불러오지 못했습니다.");
    }
  };

  return (
    <>
      <button 
        aria-label="폴더 열기" 
        onClick={handleOpenClick}
        className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
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
    </>
  );
}
