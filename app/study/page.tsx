"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";
import { Folder, Volume2, Quote, RotateCcw, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function StudyPage() {
  const lists = useLiveQuery(() => db.wordLists.orderBy('createdAt').reverse().toArray());
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  // Once lists are loaded, auto-select the first one if none selected
  useEffect(() => {
    if (lists && lists.length > 0 && selectedListId === null) {
      setSelectedListId(lists[0].id!);
    }
  }, [lists, selectedListId]);

  const words = useLiveQuery(
    () => selectedListId ? db.words.where('listId').equals(selectedListId).toArray() : [],
    [selectedListId]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showKoSentence, setShowKoSentence] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for right (next)

  // Reset index when changing list
  useEffect(() => {
    setCurrentIndex(0);
    setShowKoSentence(false);
  }, [selectedListId]);

  if (lists === undefined || words === undefined) {
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

  const selectedList = lists.find(l => l.id === selectedListId);
  const totalWords = words.length;
  const learnedCount = words.filter(w => w.isLearned).length;
  const progressPercent = totalWords === 0 ? 0 : Math.round((learnedCount / totalWords) * 100);

  const currentWord = words[currentIndex];

  const handleNext = async (learned: boolean) => {
    if (!currentWord) return;

    // Update DB if state changed
    if (learned !== currentWord.isLearned) {
      await db.words.update(currentWord.id!, { isLearned: learned });
    }

    setShowKoSentence(false);
    setDirection(1);
    
    // Find next word (cycle)
    if (currentIndex < totalWords - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reached the end
      alert("단어장의 마지막 단어입니다. 처음부터 다시 시작합니다.");
      setCurrentIndex(0);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      rotate: direction > 0 ? 10 : -10,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      rotate: 0,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      rotate: direction < 0 ? 10 : -10,
      scale: 0.9,
    }),
  };

  const playAudio = () => {
    if (currentWord && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full pb-8 pt-8 md:pt-4">
      {/* Deck Selector */}
      {lists.length > 1 && (
        <div className="mb-4">
          <select 
            value={selectedListId || ""}
            onChange={(e) => setSelectedListId(Number(e.target.value))}
            className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-label-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
          >
            {lists.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Study Deck Info */}
      <div className="w-full flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Folder size={20} />
          <span className="text-label-sm uppercase tracking-wider truncate max-w-[150px] md:max-w-[300px]">
            {selectedList?.title}
          </span>
        </div>
        <div className="text-label-sm text-primary-container font-bold bg-surface-container py-1 px-3 rounded-full">
          {totalWords > 0 ? `${currentIndex + 1} / ${totalWords} 단어` : "0 단어"}
        </div>
      </div>

      {totalWords === 0 ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">
          이 단어장에는 단어가 없습니다.
        </div>
      ) : (
        <>
          {/* Flashcard Container */}
          <div className="relative w-full flex-1 flex flex-col min-h-[420px] mb-8">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 bg-surface-container-lowest rounded-[32px] shadow-lg p-6 md:p-12 flex flex-col items-center text-center justify-center border border-surface-variant"
              >
                <button 
                  onClick={playAudio}
                  aria-label="발음 듣기" 
                  className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant text-primary transition-colors focus:ring-2 focus:ring-primary outline-none"
                >
                  <Volume2 size={24} />
                </button>
                
                <div className="mb-2">
                  <span className="text-label-sm text-outline tracking-widest uppercase font-bold">
                    {currentWord?.partOfSpeech || "단어"}
                  </span>
                </div>
                
                <h2 className="text-display-word-mobile md:text-display-word text-on-surface mb-4 font-bold break-words w-full px-4">
                  {currentWord?.word}
                </h2>
                
                <div className="w-16 h-1 bg-surface-variant rounded-full mb-8"></div>
                
                <div className="text-headline-lg text-primary mb-8 font-bold">
                  {currentWord?.meaningKo}
                </div>

                {/* Example Sentence Toggle Section */}
                {(currentWord?.exampleEn || currentWord?.exampleKo) && (
                  <div 
                    className="w-full mt-auto p-4 md:p-6 bg-surface-container rounded-2xl cursor-pointer hover:bg-surface-variant transition-colors text-left group"
                    onClick={() => setShowKoSentence(!showKoSentence)}
                  >
                    <div className="flex gap-4">
                      <Quote className="text-outline mt-1 shrink-0" size={24} />
                      <div>
                        {currentWord.exampleEn && (
                          <p 
                            className="text-body-md text-on-surface mb-2" 
                            dangerouslySetInnerHTML={{ 
                              __html: currentWord.exampleEn.replace(
                                new RegExp(`(${currentWord.word})`, 'gi'), 
                                match => `<strong>${match}</strong>`
                              ) 
                            }} 
                          />
                        )}
                        <p className={clsx(
                          "text-label-sm text-on-surface-variant transition-all duration-300 overflow-hidden",
                          showKoSentence ? "opacity-100 h-auto mt-2" : "opacity-0 h-0"
                        )}>
                          {currentWord.exampleKo}
                        </p>
                      </div>
                    </div>
                    <div className="text-center mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-outline font-bold uppercase tracking-widest">
                        터치하여 번역 {showKoSentence ? "숨기기" : "보기"}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex gap-4 mt-auto">
            <button 
              onClick={() => handleNext(false)}
              className="flex-1 h-touch-target md:h-14 bg-surface-container hover:bg-surface-variant text-on-surface rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold transition-colors border border-outline-variant focus:ring-2 focus:ring-primary outline-none"
            >
              <RotateCcw size={20} />
              학습 중
            </button>
            <button 
              onClick={() => handleNext(true)}
              className="flex-1 h-touch-target md:h-14 bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold shadow-md transition-all active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-primary outline-none"
            >
              <CheckCircle size={20} />
              학습 완료
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="w-full mt-8">
            <div className="flex justify-between text-label-sm text-outline mb-2">
              <span className="font-bold">학습 진행도</span>
              <span className="font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
