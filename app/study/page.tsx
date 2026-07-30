"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability */

import { useLiveQuery } from "dexie-react-hooks";
import { db, Word } from "@/lib/db";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { Play, Volume2, Settings2, X, Info, Folder, Check, History, RotateCcw, CheckCircle, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useStudySession } from "@/providers/StudySessionProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { highlightExampleSentence } from "@/lib/textUtils";
import { ZipfBadge } from "@/components/ZipfBadge";
import { useLanguageMode } from "@/providers/LanguageModeProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function StudyPage() {
  const { langMode } = useLanguageMode();
  const isJa = langMode === 'ja';
  const lists = useLiveQuery(() => db.wordLists.toArray());
  const activeLists = useLiveQuery(async () => {
    const all = await db.wordLists.filter(list => !!list.isActive).toArray();
    return all.filter(l => isJa ? l.lang === 'ja' : (!l.lang || l.lang === 'en'));
  }, [langMode]);
  const { data: session } = useSession();
  const completedWordsRef = useRef<string[]>([]);
  const incompleteWordsRef = useRef<string[]>([]);

  const rawWords = useLiveQuery(async () => {
    const allActive = await db.wordLists.filter(l => !!l.isActive).toArray();
    const activeListIds = allActive.filter(l => isJa ? l.lang === 'ja' : (!l.lang || l.lang === 'en')).map(l => l.id!);
    if (activeListIds.length === 0) return [];
    return db.words.where('listId').anyOf(activeListIds).toArray();
  }, [langMode]);
  const listMap = useMemo(() => {
    return new Map((activeLists || []).map(l => [l.id, l]));
  }, [activeLists]);

  // Pre-start Configuration
  const [isStarted, setIsStarted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string, type: 'info'|'success'|'error', title: string, onCloseCallback?: () => void}>({isOpen: false, message: '', type: 'info', title: ''});
  const [studyCount, setStudyCount] = useState<number | string>(30);
  const [onlyUnlearned, setOnlyUnlearned] = useState(false);
  const [revealMode, setRevealMode] = useState<'2sec' | 'touch'>('2sec');
  const [zipfFilter, setZipfFilter] = useState<'all' | 'hard' | 'custom'>('all');
  const [customZipf, setCustomZipf] = useState<number | string>(4.0);

  // Load saved settings
  useEffect(() => {
    const savedCount = localStorage.getItem('setting_studyCount');
    if (savedCount) setStudyCount(savedCount);
    const savedOnly = localStorage.getItem('setting_studyOnlyUnlearned');
    if (savedOnly) setOnlyUnlearned(savedOnly === 'true');
    const savedRevealMode = localStorage.getItem('setting_studyRevealMode');
    if (savedRevealMode === '2sec' || savedRevealMode === 'touch') setRevealMode(savedRevealMode);
    const savedZipfFilter = localStorage.getItem('setting_studyZipfFilter');
    if (savedZipfFilter === 'all' || savedZipfFilter === 'hard' || savedZipfFilter === 'custom') setZipfFilter(savedZipfFilter);
    const savedCustomZipf = localStorage.getItem('setting_studyCustomZipf');
    if (savedCustomZipf) setCustomZipf(savedCustomZipf);
  }, []);

  // Save settings on change
  useEffect(() => {
    localStorage.setItem('setting_studyCount', studyCount.toString());
    localStorage.setItem('setting_studyOnlyUnlearned', onlyUnlearned.toString());
    localStorage.setItem('setting_studyRevealMode', revealMode);
    localStorage.setItem('setting_studyZipfFilter', zipfFilter);
    localStorage.setItem('setting_studyCustomZipf', customZipf.toString());
  }, [studyCount, onlyUnlearned, revealMode, zipfFilter, customZipf]);
  
  // Runtime State
  const [studyQueue, setStudyQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showKoSentence, setShowKoSentence] = useState(false);
  const [direction, setDirection] = useState(1);
  const [sessionLearnedCount, setSessionLearnedCount] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<{ [index: number]: boolean }>({});
  const [isRevealed, setIsRevealed] = useState(false);
  const [primarySide, setPrimarySide] = useState<'english' | 'korean'>('english');
  const { setIsActiveSession } = useStudySession();

  // Reset state on new card
  useEffect(() => {
    setIsRevealed(false);
    setPrimarySide(Math.random() > 0.5 ? 'english' : 'korean');
    setShowKoSentence(false);
  }, [currentIndex, studyQueue]);

  // Handle 2sec reveal timer
  useEffect(() => {
    if (!isStarted || isRevealed || revealMode !== '2sec' || studyQueue.length === 0) return;
    const timer = setTimeout(() => {
      setIsRevealed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isStarted, isRevealed, revealMode, currentIndex, studyQueue]);

  useEffect(() => {
    setIsActiveSession(isStarted);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStarted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStarted, setIsActiveSession]);

  const activeListIdsString = activeLists?.map(l => l.id).join(',') || '';

  useEffect(() => {
    // Reset state when lists change
    setIsStarted(false);
    setIsModalOpen(false);
    setStudyQueue([]);
    setCurrentIndex(0);
    setSessionLearnedCount(0);
  }, [activeListIdsString]);

  const handleStartStudy = () => {
    if (!rawWords) return;
    
    let pool = [...rawWords];
    
    // Zipf filtering
    if (zipfFilter !== 'all') {
      const threshold = zipfFilter === 'hard' ? 4.0 : (typeof customZipf === 'number' ? customZipf : parseFloat(customZipf) || 4.0);
      pool = pool.filter(w => {
        // Zipf가 아예 없는 경우(undefined, 0, null)는 무조건 포함 (하위 호환성)
        if (w.zipfScore === undefined || w.zipfScore === null || w.zipfScore === 0) return true;
        // Zipf 값이 있는 경우 threshold보다 작은(어려운) 단어만 포함
        return w.zipfScore < threshold;
      });
    }

    if (onlyUnlearned) {
      pool = pool.filter(w => !w.isLearned);
    }
    
    if (pool.length === 0) {
      setAlertConfig({ isOpen: true, message: "조건에 맞는 단어가 없습니다.", type: 'info', title: '알림' });
      return;
    }
    
    // Shuffle pool
    pool.sort(() => 0.5 - Math.random());
    
    const count = typeof studyCount === 'number' ? studyCount : parseInt(studyCount) || 30;
    
    let queue: Word[] = [];
    if (count <= pool.length) {
      queue = pool.slice(0, count);
    } else {
      // Need more than pool size
      queue = [...pool]; // Ensure all appear once
      let remaining = count - pool.length;
      while (remaining > 0) {
        queue.push(pool[Math.floor(Math.random() * pool.length)]);
        remaining--;
      }
    }
    
    setStudyQueue(queue);
    setCurrentIndex(0);
    setSessionLearnedCount(0);
    setMaxReachedIndex(0);
    setSessionAnswers({});
    completedWordsRef.current = [];
    incompleteWordsRef.current = [];
    setIsStarted(true);
    setIsModalOpen(false);
  };

  const handleBack = () => {
    if (currentIndex <= 0) return;
    setShowKoSentence(false);
    setDirection(-1);
    setCurrentIndex(prev => prev - 1);
  };

  const handleForward = () => {
    if (currentIndex >= maxReachedIndex || currentIndex >= studyQueue.length - 1) return;
    setShowKoSentence(false);
    setDirection(1);
    setCurrentIndex(prev => prev + 1);
  };

  const handleNext = async (learned: boolean) => {
    const currentWord = studyQueue[currentIndex];
    if (!currentWord) return;

    if (learned && !currentWord.isLearned) {
      await db.words.update(currentWord.id!, { isLearned: true });
      // Update local object to reflect for duplicate instances in queue
      currentWord.isLearned = true;
    } else if (!learned && currentWord.isLearned) {
      await db.words.update(currentWord.id!, { isLearned: false });
      currentWord.isLearned = false;
    }

    const updatedAnswers = { ...sessionAnswers, [currentIndex]: learned };
    setSessionAnswers(updatedAnswers);

    let totalLearned = 0;
    for (const idx in updatedAnswers) {
      if (updatedAnswers[idx] === true) totalLearned++;
    }
    setSessionLearnedCount(totalLearned);

    if (learned) {
      if (!completedWordsRef.current.includes(currentWord.word)) {
        completedWordsRef.current.push(currentWord.word);
      }
      incompleteWordsRef.current = incompleteWordsRef.current.filter(w => w !== currentWord.word);
    } else {
      if (!incompleteWordsRef.current.includes(currentWord.word)) {
        incompleteWordsRef.current.push(currentWord.word);
      }
      completedWordsRef.current = completedWordsRef.current.filter(w => w !== currentWord.word);
    }

    setShowKoSentence(false);
    setDirection(1);
    
    const nextIndex = currentIndex + 1;
    if (nextIndex > maxReachedIndex && nextIndex < studyQueue.length) {
      setMaxReachedIndex(nextIndex);
    }

    const isLast = currentIndex === studyQueue.length - 1;

    if (isLast) {
      const finalCompleted: string[] = [];
      const finalIncomplete: string[] = [];
      studyQueue.forEach((w, idx) => {
        const ans = (idx === currentIndex) ? learned : updatedAnswers[idx];
        if (ans === true) {
          finalCompleted.push(w.word);
        } else {
          finalIncomplete.push(w.word);
        }
      });

      completedWordsRef.current = finalCompleted;
      incompleteWordsRef.current = finalIncomplete;

      // Save history
      if (session?.user?.email) {
        const payload = {
          userEmail: session.user.email,
          createdAt: new Date(),
          type: 'study' as const,
          totalCount: studyQueue.length,
          completedCount: finalCompleted.length,
          incompleteWords: finalIncomplete.join(', '),
          completeWords: finalCompleted.join(', '),
          isSynced: false
        };
        
        db.history.add(payload).then(id => {
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            fetch('/api/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).then(res => res.json()).then(data => {
              if (data.success && data.history?.id) {
                db.history.update(id, { isSynced: true, serverId: data.history.id });
              }
            }).catch(err => console.error("History sync error:", err));
          }
        }).catch(err => console.error("History local save error:", err));
      }

      setAlertConfig({ 
        isOpen: true, 
        message: `학습이 완료되었습니다!\n(세션 완료 단어: ${finalCompleted.length} / ${studyQueue.length})`, 
        type: 'success', 
        title: '학습 완료',
        onCloseCallback: () => setIsStarted(false)
      });
      return;
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const currentWord = studyQueue[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / studyQueue.length) * 100) || 0;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      rotate: direction > 0 ? 10 : -10,
      scale: 0.9,
    }),
    center: { zIndex: 1, x: 0, opacity: 1, rotate: 0, scale: 1 },
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
      const textToSpeak = isJa ? (currentWord.partOfSpeech || currentWord.word) : currentWord.word;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = isJa ? 'ja-JP' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const playExampleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentWord?.exampleEn && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.exampleEn);
      utterance.lang = isJa ? 'ja-JP' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const adjustCount = (delta: number) => {
    setStudyCount(prev => {
      const current = typeof prev === 'number' ? prev : parseInt(prev) || 0;
      const next = current + delta;
      return next > 0 ? next : 1;
    });
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
      <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-12 gap-6">
        <LanguageToggle />
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface mb-2">{isJa ? '선택된 일본어 단어장이 없습니다.' : '선택된 영어 단어장이 없습니다.'}</h2>
          <p className="text-body-md text-on-surface-variant">
            설정 메뉴에서 학습할 단어장의 좌측 체크박스를 선택해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full pb-8 pt-8 md:pt-4 relative">


      {!isStarted ? (
        // --- Pre-start Screen ---
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <LanguageToggle className="mb-6" />
            <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mb-6">
              <Folder size={40} className="text-primary" />
            </div>
            <h2 className="text-headline-lg font-bold text-on-surface mb-2">선택된 {isJa ? '일본어' : '영어'} 단어장 {activeLists.length}개</h2>
            <p className="text-body-md text-on-surface-variant">총 {rawWords.length}개의 단어가 있습니다.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full h-14 mt-auto mb-4 bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Play size={20} />
            학습 시작
          </button>
          
          <div className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-4 text-xs text-on-surface break-words whitespace-pre-wrap leading-relaxed">
            선택된 단어장: {activeLists.map(l => l.title).join(', ')}
          </div>
        </div>
      ) : (
        // --- Study Screen ---
        <div className="flex-1 flex flex-col">
          <div className="w-full flex justify-between items-center mb-6 px-1">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Folder size={20} />
              <span className="text-label-sm uppercase tracking-wider truncate max-w-[150px] md:max-w-[300px]">
                {studyQueue[currentIndex] ? listMap.get(studyQueue[currentIndex].listId)?.title || '단어장' : '단어장'}
              </span>
            </div>
            <div className="text-label-sm text-primary-container font-bold bg-surface-container py-1 px-3 rounded-full">
              {currentIndex + 1} / {studyQueue.length} 단어
            </div>
          </div>

          <div className="relative w-full flex-1 flex flex-col min-h-[420px] mb-8">
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBack();
                }}
                aria-label="이전 단어"
                title="이전 단어로 이동 (오른쪽으로 스와이프)"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-surface-container-high/90 hover:bg-surface-variant text-on-surface transition-all hover:scale-105 shadow-md border border-outline-variant active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <ChevronLeft size={26} />
              </button>
            )}
            {currentIndex < maxReachedIndex && currentIndex < studyQueue.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleForward();
                }}
                aria-label="다음 단어"
                title="다음 단어로 이동 (왼쪽으로 스와이프)"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-surface-container-high/90 hover:bg-surface-variant text-on-surface transition-all hover:scale-105 shadow-md border border-outline-variant active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <ChevronRight size={26} />
              </button>
            )}
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_e, { offset, velocity }) => {
                  const threshold = 50;
                  if (offset.x > threshold || velocity.x > 500) {
                    if (currentIndex > 0) {
                      handleBack();
                    }
                  } else if (offset.x < -threshold || velocity.x < -500) {
                    if (currentIndex < maxReachedIndex && currentIndex < studyQueue.length - 1) {
                      handleForward();
                    }
                  }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={clsx(
                  "absolute inset-0 bg-surface-container-lowest rounded-[32px] shadow-lg p-6 md:p-12 flex flex-col items-center text-center justify-center border border-surface-variant",
                  !isRevealed && "cursor-pointer"
                )}
                onClick={() => !isRevealed && setIsRevealed(true)}
              >
                <ZipfBadge score={currentWord?.zipfScore} className="absolute top-6 left-6" />
                
                <button 
                  onClick={(e) => { e.stopPropagation(); playAudio(); }}
                  aria-label="발음 듣기" 
                  className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-variant text-primary transition-colors focus:ring-2 focus:ring-primary outline-none"
                >
                  <Volume2 size={24} />
                </button>
                
                <div className="mb-2">
                  <span className={clsx(
                    isJa ? "text-title-sm text-primary font-bold tracking-normal" : "text-label-sm text-outline tracking-widest uppercase font-bold"
                  )}>
                    {currentWord?.partOfSpeech || (isJa ? "일본어" : "단어")}
                  </span>
                </div>
                
                <h2 className={clsx(
                  "text-display-word-mobile md:text-display-word text-on-surface mb-4 font-bold break-words w-full px-10 md:px-16 transition-all duration-300",
                  (!isRevealed && primarySide === 'korean') ? "blur-md opacity-20 select-none text-transparent" : ""
                )}>
                  {currentWord?.word}
                </h2>
                
                <div className="w-16 h-1 bg-surface-variant rounded-full mb-8"></div>
                
                <div className={clsx(
                  "mb-8 font-bold px-6 md:px-16 transition-all duration-300 flex flex-col items-center gap-1.5",
                  isJa ? "text-title-lg md:text-headline-sm text-primary" : "text-headline-lg text-primary",
                  (!isRevealed && primarySide === 'english') ? "blur-md opacity-20 select-none text-transparent" : ""
                )}>
                  {(() => {
                    const text = currentWord?.meaningKo || "";
                    if (isJa && text.includes("(")) {
                      const idx = text.indexOf("(");
                      const mainMeaning = text.substring(0, idx).trim();
                      const hanjaReading = text.substring(idx).trim();
                      return (
                        <>
                          <span>{mainMeaning}</span>
                          <span className="text-xs md:text-sm text-on-surface-variant/90 font-medium break-all mt-1">{hanjaReading}</span>
                        </>
                      );
                    }
                    return <span>{text}</span>;
                  })()}
                </div>

                {(currentWord?.exampleEn || currentWord?.exampleKo) && (
                  <div 
                    className="w-full mt-auto p-4 md:p-6 bg-surface-container rounded-2xl cursor-pointer hover:bg-surface-variant transition-colors text-left group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowKoSentence(!showKoSentence);
                    }}
                  >
                    <div className="flex gap-4 items-start">
                      <button 
                        onClick={playExampleAudio}
                        className="text-outline hover:text-primary mt-1 shrink-0 transition-colors"
                        title="예문 듣기"
                      >
                        <Volume2 size={24} />
                      </button>
                      <div>
                        {currentWord.exampleEn && (
                          <p 
                            className="text-body-md text-on-surface mb-2" 
                            dangerouslySetInnerHTML={{ 
                              __html: highlightExampleSentence(currentWord.word, currentWord.exampleEn)
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

          <div className="w-full flex gap-4 mt-auto">
            <button 
              onClick={() => handleNext(false)}
              className={clsx(
                "flex-1 h-touch-target md:h-14 rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold transition-all border outline-none focus:ring-2 focus:ring-primary",
                sessionAnswers[currentIndex] === false
                  ? "bg-surface-variant text-on-surface border-primary ring-2 ring-primary/50 font-extrabold shadow-md scale-[1.02]"
                  : "bg-surface-container hover:bg-surface-variant text-on-surface border-outline-variant"
              )}
            >
              <RotateCcw size={20} />
              <span>학습 중{sessionAnswers[currentIndex] === false && " (선택됨)"}</span>
            </button>
            <button 
              onClick={() => handleNext(true)}
              className={clsx(
                "flex-1 h-touch-target md:h-14 rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold shadow-md transition-all active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-primary outline-none",
                sessionAnswers[currentIndex] === true
                  ? "bg-primary-container text-on-primary-container ring-2 ring-primary font-extrabold scale-[1.02]"
                  : "bg-primary hover:bg-primary-container text-on-primary"
              )}
            >
              <CheckCircle size={20} />
              <span>학습 완료{sessionAnswers[currentIndex] === true && " (선택됨)"}</span>
            </button>
          </div>

          <div className="w-full mt-8">
            <div className="flex justify-between text-label-sm text-outline mb-2">
              <span className="font-bold">학습 진행도</span>
              <span className="font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progressPercent}%` }}></div>
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
                  학습 설정
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-surface-container rounded-full text-on-surface-variant hover:bg-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-6 mb-8">
                {/* 단어 수 조절 */}
                <div>
                  <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">학습할 단어 수</label>
                  <div className="flex items-center gap-4 bg-surface-container p-2 rounded-2xl">
                    <button onClick={() => adjustCount(-10)} className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-variant transition-colors shadow-sm text-primary">
                      <Minus size={20} />
                    </button>
                    <input 
                      type="number" 
                      value={studyCount}
                      onChange={(e) => setStudyCount(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-center text-headline-lg font-bold text-on-surface outline-none"
                    />
                    <button onClick={() => adjustCount(10)} className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-variant transition-colors shadow-sm text-primary">
                      <Plus size={20} />
                    </button>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-2 px-1">
                    단어장에 있는 수({rawWords.length}개)보다 많은 수를 입력하면 랜덤하게 반복 학습합니다.
                  </p>
                </div>

                {/* 미완료 필터 */}
                <label className="flex items-center justify-between p-4 bg-surface-container rounded-2xl cursor-pointer hover:bg-surface-variant transition-colors">
                  <span className="text-body-lg font-bold text-on-surface">미완료 단어만 학습하기</span>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={onlyUnlearned} 
                      onChange={(e) => setOnlyUnlearned(e.target.checked)} 
                    />
                    <div className="w-14 h-8 bg-surface-variant rounded-full p-1 flex items-center shrink-0" style={{ justifyContent: onlyUnlearned ? 'flex-end' : 'flex-start' }}>
                      <div className={clsx("w-6 h-6 rounded-full shadow-sm transition-colors", onlyUnlearned ? "bg-primary" : "bg-outline")} />
                    </div>
                  </div>
                </label>

                {/* 난이도 필터 (Zipf) */}
                {!isJa && (
                  <div>
                    <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">난이도 필터 (Zipf)</label>
                    <select 
                      value={zipfFilter}
                      onChange={(e) => setZipfFilter(e.target.value as 'all' | 'hard' | 'custom')}
                      className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-body-lg font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                    >
                      <option value="all">전체 단어 (기본)</option>
                      <option value="hard">어려운 단어 (Zipf 4.0 미만)</option>
                      <option value="custom">직접 입력 (입력값 미만)</option>
                    </select>
                    
                    {zipfFilter === 'custom' && (
                      <div className="mt-3 flex items-center gap-3 bg-surface-container px-4 py-2 rounded-xl">
                        <span className="text-body-sm font-bold text-on-surface">Zipf 스코어 기준:</span>
                        <input 
                          type="number"
                          step="0.1"
                          value={customZipf}
                          onChange={(e) => setCustomZipf(e.target.value)}
                          className="w-20 bg-transparent text-headline-sm font-bold text-primary outline-none border-b-2 border-outline focus:border-primary px-1 text-center"
                        />
                        <span className="text-body-sm text-on-surface-variant">미만</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 단어/뜻 공개 방식 */}
                <div>
                  <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">단어 뜻 보이기</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setRevealMode('2sec')}
                      className={clsx("flex-1 py-3 px-2 rounded-xl font-bold transition-colors text-sm", 
                        revealMode === '2sec' ? "bg-primary text-on-primary shadow-md" : "bg-surface-container hover:bg-surface-variant text-on-surface"
                      )}
                    >
                      2초 후에 보이기
                    </button>
                    <button 
                      onClick={() => setRevealMode('touch')}
                      className={clsx("flex-1 py-3 px-2 rounded-xl font-bold transition-colors text-sm", 
                        revealMode === 'touch' ? "bg-primary text-on-primary shadow-md" : "bg-surface-container hover:bg-surface-variant text-on-surface"
                      )}
                    >
                      터치 후에 보이기
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleStartStudy}
                className="w-full h-14 bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold shadow-md transition-all active:scale-95"
              >
                설정 완료 및 시작
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={alertConfig.isOpen}
        onClose={() => {
          setAlertConfig(prev => ({...prev, isOpen: false}));
          if (alertConfig.onCloseCallback) alertConfig.onCloseCallback();
        }}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}
