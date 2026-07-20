"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useLiveQuery } from "dexie-react-hooks";
import { db, Word } from "@/lib/db";
import { useState, useEffect, useRef, useMemo } from "react";
import { Lightbulb, Send, Settings2, Play, X, Plus, Minus, Folder } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useStudySession } from "@/providers/StudySessionProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import { maskExampleHtml } from "@/lib/textUtils";

interface TestWord {
  wordData: Word;
  testMode: 'mcq' | 'spelling';
}

export default function TestPage() {
  const lists = useLiveQuery(() => db.wordLists.toArray());
  const activeLists = useLiveQuery(() => db.wordLists.filter(list => !!list.isActive).toArray());
  const rawWords = useLiveQuery(async () => {
    const activeListIds = (await db.wordLists.filter(l => !!l.isActive).toArray()).map(l => l.id!);
    if (activeListIds.length === 0) return [];
    return db.words.where('listId').anyOf(activeListIds).toArray();
  }, []);
  const listMap = useMemo(() => {
    return new Map((activeLists || []).map(l => [l.id, l]));
  }, [activeLists]);

  // Pre-start Configuration
  const [isStarted, setIsStarted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string, type: 'info'|'success'|'error', title: string, onCloseCallback?: () => void}>({isOpen: false, message: '', type: 'info', title: ''});
  const [testCount, setTestCount] = useState<number | string>(30);
  const [onlyUnlearned, setOnlyUnlearned] = useState(false);
  const [questionType, setQuestionType] = useState<'english' | 'korean' | 'random'>('random');
  const [zipfFilter, setZipfFilter] = useState<'all' | 'hard' | 'custom'>('all');
  const [customZipf, setCustomZipf] = useState<number | string>(4.0);

  // Load saved settings
  useEffect(() => {
    const savedCount = localStorage.getItem('setting_testCount');
    if (savedCount) setTestCount(savedCount);
    const savedOnly = localStorage.getItem('setting_testOnlyUnlearned');
    if (savedOnly) setOnlyUnlearned(savedOnly === 'true');
    const savedType = localStorage.getItem('setting_testQuestionType');
    if (savedType) setQuestionType(savedType as 'english' | 'korean' | 'random');
    const savedZipfFilter = localStorage.getItem('setting_testZipfFilter');
    if (savedZipfFilter === 'all' || savedZipfFilter === 'hard' || savedZipfFilter === 'custom') setZipfFilter(savedZipfFilter);
    const savedCustomZipf = localStorage.getItem('setting_testCustomZipf');
    if (savedCustomZipf) setCustomZipf(savedCustomZipf);
  }, []);

  // Save settings on change
  useEffect(() => {
    localStorage.setItem('setting_testCount', testCount.toString());
    localStorage.setItem('setting_testOnlyUnlearned', onlyUnlearned.toString());
    localStorage.setItem('setting_testQuestionType', questionType);
    localStorage.setItem('setting_testZipfFilter', zipfFilter);
    localStorage.setItem('setting_testCustomZipf', customZipf.toString());
  }, [testCount, onlyUnlearned, questionType, zipfFilter, customZipf]);

  // Runtime State
  const [testQueue, setTestQueue] = useState<TestWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalTested, setTotalTested] = useState(0);

  // MCQ state
  const [options, setOptions] = useState<string[]>([]);
  
  // Spelling state
  const [spellingInput, setSpellingInput] = useState("");
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Feedback state
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const { setIsActiveSession } = useStudySession();

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
    setTestQueue([]);
    setCurrentIndex(0);
  }, [activeListIdsString]);

  const handleStartTest = () => {
    if (!rawWords) return;
    
    let pool = [...rawWords];
    
    // Zipf filtering
    if (zipfFilter !== 'all') {
      const threshold = zipfFilter === 'hard' ? 4.0 : (typeof customZipf === 'number' ? customZipf : parseFloat(customZipf) || 4.0);
      pool = pool.filter(w => {
        if (w.zipfScore === undefined || w.zipfScore === null || w.zipfScore === 0) return true;
        return w.zipfScore < threshold;
      });
    }

    if (onlyUnlearned) pool = pool.filter(w => !w.isLearned);
    
    if (pool.length === 0) {
      setAlertConfig({ isOpen: true, message: "조건에 맞는 단어가 없습니다.", type: 'info', title: '알림' });
      return;
    }
    
    pool.sort(() => 0.5 - Math.random());
    const count = typeof testCount === 'number' ? testCount : parseInt(testCount) || 30;
    
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
    
    const queue: TestWord[] = selectedWords.map(w => {
      let m: 'mcq' | 'spelling' = 'mcq';
      if (questionType === 'english') m = 'mcq';
      else if (questionType === 'korean') m = 'spelling';
      else m = Math.random() > 0.5 ? 'mcq' : 'spelling';
      return { wordData: w, testMode: m };
    });
    
    setTestQueue(queue);
    setCurrentIndex(0);
    setScore(0);
    setTotalTested(0);
    setIsStarted(true);
    setIsModalOpen(false);
  };

  const currentItem = testQueue[currentIndex];
  const currentWord = currentItem?.wordData;
  const currentMode = currentItem?.testMode;

  // Prepare options for MCQ
  useEffect(() => {
    if (currentMode === 'mcq' && currentWord && rawWords && rawWords.length > 0) {
      const meanings = new Set<string>();
      meanings.add(currentWord.meaningKo);
      
      const pool = rawWords.filter(w => w.meaningKo !== currentWord.meaningKo).map(w => w.meaningKo);
      const shuffledPool = pool.sort(() => 0.5 - Math.random());
      
      for (const m of shuffledPool) {
        if (meanings.size >= 8) break;
        meanings.add(m);
      }
      
      while (meanings.size < 8 && meanings.size < rawWords.length) {
        meanings.add(`오답 ${meanings.size}`);
      }
      
      setOptions(Array.from(meanings).sort(() => 0.5 - Math.random()));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, currentMode]); // Do not include rawWords to prevent reshuffling on db.update

  // Reset spelling state on new word
  useEffect(() => {
    if (currentMode === 'spelling') {
      setSpellingInput("");
      setRevealedIndices([]);
      setFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentWord, currentMode]);

  const handleNextWord = async (isCorrect: boolean) => {
    if (!currentWord) return;
    
    // Update DB
    await db.words.update(currentWord.id!, {
      testCount: currentWord.testCount + 1,
      correctCount: isCorrect ? currentWord.correctCount + 1 : currentWord.correctCount
    });

    setTotalTested(prev => prev + 1);
    if (isCorrect) setScore(prev => prev + 1);

    setTimeout(() => {
      setFeedback(null);
      if (currentIndex < testQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setAlertConfig({ 
          isOpen: true, 
          message: `테스트 완료!\n최종 점수: ${isCorrect ? score + 1 : score} / ${testQueue.length}`, 
          type: 'success', 
          title: '테스트 완료',
          onCloseCallback: () => setIsStarted(false)
        });
      }
    }, isCorrect ? 1500 : 2500);
  };

  const handleMCQSelect = (selectedMeaning: string) => {
    if (feedback) return;
    
    const isCorrect = selectedMeaning === currentWord.meaningKo;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setCorrectAnswer(currentWord.meaningKo);
    handleNextWord(isCorrect);
  };

  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return;

    const isCorrect = spellingInput.toLowerCase().trim() === currentWord.word.toLowerCase();
    
    if (isCorrect) {
      setFeedback('correct');
      handleNextWord(true);
    } else {
      const wordLen = currentWord.word.length;
      const maxHints = Math.floor(wordLen / 2);
      
      if (revealedIndices.length < maxHints) {
        const available = Array.from({length: wordLen}, (_, i) => i).filter(i => !revealedIndices.includes(i) && currentWord.word[i] !== ' ');
        if (available.length > 0) {
          const toReveal = available[Math.floor(Math.random() * available.length)];
          setRevealedIndices(prev => [...prev, toReveal]);
        }
        setSpellingInput("");
      } else {
        setFeedback('incorrect');
        setCorrectAnswer(currentWord.word);
        handleNextWord(false);
      }
    }
  };

  const renderSpellingHint = () => {
    if (!currentWord) return null;
    
    const words = currentWord.word.split(' ');
    let globalIdx = 0;
    
    return words.map((word, wordIdx) => {
      const wordElements = word.split('').map((char) => {
        const idx = globalIdx++;
        if (revealedIndices.includes(idx)) {
          return <span key={idx} className="mx-[2px] sm:mx-1 font-bold text-primary">{char}</span>;
        }
        return <span key={idx} className="mx-[2px] sm:mx-1 text-outline">_</span>;
      });
      
      if (wordIdx < words.length - 1) {
        globalIdx++; 
      }
      
      return (
        <div key={wordIdx} className="inline-block whitespace-nowrap mx-1 sm:mx-2">
          {wordElements}
        </div>
      );
    });
  };

  const adjustCount = (delta: number) => {
    setTestCount(prev => {
      const current = typeof prev === 'number' ? prev : parseInt(prev) || 0;
      const next = current + delta;
      return next > 0 ? next : 1;
    });
  };

  const accuracy = totalTested === 0 ? 0 : Math.round((score / totalTested) * 100);

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


      {!isStarted ? (
        // --- Pre-start Screen ---
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mb-6">
              <Folder size={40} className="text-primary" />
            </div>
            <h2 className="text-headline-lg font-bold text-on-surface mb-2">선택된 단어장 {activeLists.length}개</h2>
            <p className="text-body-md text-on-surface-variant">총 {rawWords.length}개의 단어가 있습니다.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full h-14 mt-auto mb-4 bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 text-headline-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Play size={20} />
            테스트 시작
          </button>

          <div className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-4 text-xs text-on-surface break-words whitespace-pre-wrap leading-relaxed">
            선택된 단어장: {activeLists.map(l => l.title).join(', ')}
          </div>
        </div>
      ) : (
        // --- Test Screen ---
        <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto">
          <section className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full md:w-auto flex items-center gap-2 text-on-surface-variant">
              <Folder size={20} />
              <span className="text-label-sm uppercase tracking-wider font-bold truncate max-w-[200px]">
                {testQueue[currentIndex] ? listMap.get(testQueue[currentIndex].wordData.listId)?.title || '단어장' : '단어장'}
              </span>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="bg-surface-container-lowest shadow-sm rounded-xl p-3 flex-1 md:w-32 text-center border border-surface-variant">
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">점수</p>
                <p className="text-headline-md font-bold text-primary mt-1">{score} / {totalTested}</p>
              </div>
              <div className="bg-surface-container-lowest shadow-sm rounded-xl p-3 flex-1 md:w-32 text-center border border-surface-variant">
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">정확도</p>
                <p className="text-headline-md font-bold text-secondary mt-1">{accuracy}%</p>
              </div>
            </div>
          </section>

          {currentMode === 'mcq' && currentWord && (
            <div className="flex-1">
              <div className={clsx(
                "bg-surface-container-lowest shadow-sm rounded-2xl p-8 mb-6 border text-center transition-all",
                feedback === 'correct' ? "border-primary bg-primary-container/20" : 
                feedback === 'incorrect' ? "border-error bg-error-container/20" : "border-surface-variant"
              )}>
                <div className="flex justify-between items-center mb-4">
                  <span className="inline-block px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full text-label-sm font-bold">
                    문제 {totalTested + 1}
                  </span>
                  {currentWord?.zipfScore !== undefined && currentWord?.zipfScore !== null && currentWord?.zipfScore > 0 && (
                    <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold shadow-sm">
                      Zipf {currentWord.zipfScore.toFixed(1)}
                    </span>
                  )}
                </div>
                <h3 className="text-display-word-mobile md:text-display-word font-bold text-on-surface mb-2 tracking-tight break-words">
                  {currentWord.word}
                </h3>
                
                {currentWord.exampleEn && (
                  <div className="mt-6 bg-surface-container p-4 rounded-xl text-left border border-surface-variant">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="text-primary shrink-0 mt-0.5" size={20} />
                      <p 
                        className="text-body-md text-on-surface-variant italic"
                        dangerouslySetInnerHTML={{ 
                          __html: maskExampleHtml(currentWord.word, currentWord.exampleEn)
                        }} 
                      />
                    </div>
                  </div>
                )}
                
                {feedback && (
                  <div className={clsx("mt-4 font-bold text-headline-sm", feedback === 'correct' ? "text-primary" : "text-error")}>
                    {feedback === 'correct' ? "정답입니다!" : `오답입니다. 정답: ${correctAnswer}`}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {options.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => handleMCQSelect(opt)}
                    disabled={feedback !== null}
                    className={clsx(
                      "border-2 rounded-xl p-4 min-h-[80px] flex items-center justify-center text-body-md font-bold transition-all active:scale-95 outline-none focus:ring-2 focus:ring-primary",
                      feedback && opt === correctAnswer ? "border-primary bg-primary-container text-on-primary-container" :
                      feedback && opt !== correctAnswer ? "border-surface-variant bg-surface-container-lowest opacity-50" :
                      "border-surface-variant bg-surface-container-lowest hover:border-primary-container hover:bg-surface-container text-on-surface"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentMode === 'spelling' && currentWord && (
            <div className="flex-1 flex flex-col">
              <div className={clsx(
                "bg-surface-container-lowest shadow-sm rounded-2xl p-4 md:p-6 mb-4 border text-center transition-all",
                feedback === 'correct' ? "border-primary bg-primary-container/20" : 
                feedback === 'incorrect' ? "border-error bg-error-container/20" : "border-surface-variant"
              )}>
                <div className="flex justify-between items-center mb-2">
                  <span className="inline-block px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full text-label-sm font-bold">
                    문제 {totalTested + 1}
                  </span>
                  {currentWord?.zipfScore !== undefined && currentWord?.zipfScore !== null && currentWord?.zipfScore > 0 && (
                    <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold shadow-sm">
                      Zipf {currentWord.zipfScore.toFixed(1)}
                    </span>
                  )}
                </div>
                <h3 className="text-display-word-mobile md:text-display-word font-bold text-primary mb-2 tracking-tight">
                  {currentWord.meaningKo}
                </h3>
                
                {currentWord.exampleKo && (
                  <div className="mt-4 text-on-surface-variant text-body-lg">
                    &quot;{currentWord.exampleKo}&quot;
                  </div>
                )}

                <div className="mt-4 md:mt-6 bg-surface-container py-4 md:py-6 rounded-xl w-full flex justify-center items-center px-4 min-h-[104px]">
                  {feedback === 'incorrect' ? (
                    <span className={clsx("text-error font-bold text-center break-words", currentWord.word.length > 15 ? "text-headline-md" : "text-headline-lg tracking-widest")}>
                      {correctAnswer}
                    </span>
                  ) : (
                    <div className={clsx("flex flex-wrap justify-center items-center gap-y-3", currentWord.word.length > 15 ? "text-headline-sm sm:text-headline-md tracking-wider" : "text-headline-lg tracking-widest")}>
                      {renderSpellingHint()}
                    </div>
                  )}
                </div>

                {feedback && (
                  <div className={clsx("mt-4 font-bold text-headline-sm", feedback === 'correct' ? "text-primary" : "text-error")}>
                    {feedback === 'correct' ? "정답입니다!" : "오답입니다."}
                  </div>
                )}
              </div>

              <form onSubmit={handleSpellingSubmit} className="flex gap-4 mt-auto">
                <input 
                  ref={inputRef}
                  type="text"
                  value={spellingInput}
                  onChange={(e) => setSpellingInput(e.target.value)}
                  disabled={feedback !== null}
                  placeholder="영어 단어를 입력하세요"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="flex-1 bg-surface-container border-2 border-outline-variant focus:border-primary rounded-xl px-6 py-4 text-headline-sm font-bold text-on-surface outline-none transition-colors"
                />
                <button 
                  type="submit"
                  disabled={feedback !== null}
                  className="bg-primary hover:bg-primary-container text-on-primary rounded-xl px-8 flex items-center justify-center transition-all disabled:opacity-50 shadow-md active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-primary outline-none"
                >
                  <Send size={28} />
                </button>
              </form>
            </div>
          )}
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
                  테스트 설정
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-surface-container rounded-full text-on-surface-variant hover:bg-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-6 mb-8">
                {/* 단어 수 조절 */}
                <div>
                  <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">테스트 단어 수</label>
                  <div className="flex items-center gap-4 bg-surface-container p-2 rounded-2xl">
                    <button onClick={() => adjustCount(-10)} className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-variant transition-colors shadow-sm text-primary">
                      <Minus size={20} />
                    </button>
                    <input 
                      type="number" 
                      value={testCount}
                      onChange={(e) => setTestCount(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-center text-headline-lg font-bold text-on-surface outline-none"
                    />
                    <button onClick={() => adjustCount(10)} className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-variant transition-colors shadow-sm text-primary">
                      <Plus size={20} />
                    </button>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-2 px-1">
                    단어장에 있는 수({rawWords.length}개)보다 많은 수를 입력하면 랜덤하게 반복 출제됩니다.
                  </p>
                </div>

                {/* 미완료 필터 */}
                <label className="flex items-center justify-between p-4 bg-surface-container rounded-2xl cursor-pointer hover:bg-surface-variant transition-colors">
                  <span className="text-body-lg font-bold text-on-surface">미완료 단어만 출제하기</span>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={onlyUnlearned} 
                      onChange={(e) => setOnlyUnlearned(e.target.checked)} 
                    />
                    <div className={clsx("w-12 h-6 rounded-full transition-colors", onlyUnlearned ? "bg-primary" : "bg-outline-variant")}>
                      <div className={clsx("w-4 h-4 rounded-full bg-white absolute top-1 transition-transform", onlyUnlearned ? "translate-x-7" : "translate-x-1")}></div>
                    </div>
                  </div>
                </label>

                {/* 난이도 필터 (Zipf) */}
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

                {/* 출제 유형 */}
                <div>
                  <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">출제 유형</label>
                  <div className="flex bg-surface-container rounded-xl p-1">
                    <button 
                      onClick={() => setQuestionType('english')}
                      className={clsx("flex-1 py-2 text-label-sm font-bold rounded-lg transition-colors", questionType === 'english' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
                    >
                      영어만 (객관식)
                    </button>
                    <button 
                      onClick={() => setQuestionType('korean')}
                      className={clsx("flex-1 py-2 text-label-sm font-bold rounded-lg transition-colors", questionType === 'korean' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
                    >
                      한글만 (주관식)
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
                onClick={handleStartTest}
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
