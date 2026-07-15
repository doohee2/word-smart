"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, Word } from "@/lib/db";
import { useState, useEffect, useRef } from "react";
import { Lightbulb, Send } from "lucide-react";
import clsx from "clsx";

export default function TestPage() {
  const lists = useLiveQuery(() => db.wordLists.orderBy('createdAt').reverse().toArray());
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  const rawWords = useLiveQuery(
    () => selectedListId ? db.words.where('listId').equals(selectedListId).toArray() : [],
    [selectedListId]
  );

  const [mode, setMode] = useState<'mcq' | 'spelling'>('mcq');
  const [testWords, setTestWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Stats
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

  // Auto select list
  useEffect(() => {
    if (lists && lists.length > 0 && selectedListId === null) {
      setSelectedListId(lists[0].id!);
    }
  }, [lists, selectedListId]);

  // Shuffle words for test
  useEffect(() => {
    if (rawWords && rawWords.length > 0) {
      const shuffled = [...rawWords].sort(() => 0.5 - Math.random());
      setTestWords(shuffled);
      setCurrentIndex(0);
      setScore(0);
      setTotalTested(0);
    } else {
      setTestWords([]);
    }
  }, [rawWords, selectedListId, mode]);

  const currentWord = testWords[currentIndex];

  // Prepare options for MCQ
  useEffect(() => {
    if (mode === 'mcq' && currentWord && rawWords && rawWords.length > 0) {
      const meanings = new Set<string>();
      meanings.add(currentWord.meaningKo);
      
      const pool = rawWords.filter(w => w.meaningKo !== currentWord.meaningKo).map(w => w.meaningKo);
      const shuffledPool = pool.sort(() => 0.5 - Math.random());
      
      for (const m of shuffledPool) {
        if (meanings.size >= 8) break;
        meanings.add(m);
      }
      
      // If pool is too small, fallback
      while (meanings.size < 8 && meanings.size < rawWords.length) {
        meanings.add(`오답 ${meanings.size}`);
      }
      
      setOptions(Array.from(meanings).sort(() => 0.5 - Math.random()));
    }
  }, [currentWord, mode, rawWords]);

  // Reset spelling state on new word
  useEffect(() => {
    if (mode === 'spelling') {
      setSpellingInput("");
      setRevealedIndices([]);
      setFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentWord, mode]);

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
      if (currentIndex < testWords.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Reshuffle or end
        const shuffled = [...testWords].sort(() => 0.5 - Math.random());
        setTestWords(shuffled);
        setCurrentIndex(0);
      }
    }, 1500);
  };

  const handleMCQSelect = (selectedMeaning: string) => {
    if (feedback) return; // Prevent multiple clicks
    
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
      // Reveal a hint
      const wordLen = currentWord.word.length;
      if (revealedIndices.length < wordLen - 1) {
        const available = Array.from({length: wordLen}, (_, i) => i).filter(i => !revealedIndices.includes(i) && currentWord.word[i] !== ' ');
        if (available.length > 0) {
          const toReveal = available[Math.floor(Math.random() * available.length)];
          setRevealedIndices(prev => [...prev, toReveal]);
        }
        setSpellingInput(""); // Clear input to try again
      } else {
        // Failed completely
        setFeedback('incorrect');
        setCorrectAnswer(currentWord.word);
        handleNextWord(false);
      }
    }
  };

  // Helper to render spelling hint
  const renderSpellingHint = () => {
    if (!currentWord) return null;
    return currentWord.word.split('').map((char, idx) => {
      if (revealedIndices.includes(idx) || char === ' ') {
        return <span key={idx} className="mx-1 font-bold text-primary">{char}</span>;
      }
      return <span key={idx} className="mx-1 text-outline">_</span>;
    });
  };

  const accuracy = totalTested === 0 ? 0 : Math.round((score / totalTested) * 100);

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
      {/* Header & Stats */}
      <section className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-headline-lg font-bold text-on-surface mb-2">단어 테스트</h2>
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
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-surface-container-lowest shadow-sm rounded-xl p-4 flex-1 md:w-32 text-center border border-surface-variant">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">점수</p>
            <p className="text-headline-md font-bold text-primary mt-1">{score} / {totalTested}</p>
          </div>
          <div className="bg-surface-container-lowest shadow-sm rounded-xl p-4 flex-1 md:w-32 text-center border border-surface-variant">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">정확도</p>
            <p className="text-headline-md font-bold text-secondary mt-1">{accuracy}%</p>
          </div>
        </div>
      </section>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-surface-container shadow-sm rounded-full p-1 inline-flex">
          <button 
            onClick={() => setMode('mcq')}
            className={clsx("px-6 py-2 rounded-full text-label-sm font-bold transition-all", mode === 'mcq' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
          >
            객관식
          </button>
          <button 
            onClick={() => setMode('spelling')}
            className={clsx("px-6 py-2 rounded-full text-label-sm font-bold transition-all", mode === 'spelling' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface")}
          >
            주관식
          </button>
        </div>
      </div>

      {testWords.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">
          이 단어장에는 테스트할 단어가 없습니다.
        </div>
      ) : (
        <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
          {mode === 'mcq' && currentWord && (
            <div className="flex-1">
              <div className={clsx(
                "bg-surface-container-lowest shadow-sm rounded-2xl p-8 mb-6 border text-center transition-all",
                feedback === 'correct' ? "border-primary bg-primary-container/20" : 
                feedback === 'incorrect' ? "border-error bg-error-container/20" : "border-surface-variant"
              )}>
                <span className="inline-block px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full text-label-sm font-bold mb-4">
                  문제 {totalTested + 1}
                </span>
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
                          __html: currentWord.exampleEn.replace(
                            new RegExp(`(${currentWord.word})`, 'gi'), 
                            `<span class="font-semibold text-on-surface">______</span>`
                          ) 
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

          {mode === 'spelling' && currentWord && (
            <div className="flex-1 flex flex-col">
              <div className={clsx(
                "bg-surface-container-lowest shadow-sm rounded-2xl p-8 mb-6 border text-center transition-all",
                feedback === 'correct' ? "border-primary bg-primary-container/20" : 
                feedback === 'incorrect' ? "border-error bg-error-container/20" : "border-surface-variant"
              )}>
                <span className="inline-block px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full text-label-sm font-bold mb-4">
                  문제 {totalTested + 1}
                </span>
                <h3 className="text-display-word-mobile md:text-display-word font-bold text-primary mb-2 tracking-tight">
                  {currentWord.meaningKo}
                </h3>
                
                {currentWord.exampleKo && (
                  <div className="mt-4 text-on-surface-variant text-body-lg">
                    "{currentWord.exampleKo}"
                  </div>
                )}

                <div className="mt-8 text-headline-lg tracking-widest bg-surface-container py-6 rounded-xl overflow-x-auto whitespace-nowrap px-4">
                  {feedback === 'incorrect' ? <span className="text-error">{correctAnswer}</span> : renderSpellingHint()}
                </div>

                {feedback && (
                  <div className={clsx("mt-6 font-bold text-headline-sm", feedback === 'correct' ? "text-primary" : "text-error")}>
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
                  disabled={feedback !== null || !spellingInput.trim()}
                  className="bg-primary hover:bg-primary-container text-on-primary rounded-xl px-8 flex items-center justify-center transition-all disabled:opacity-50 shadow-md active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-primary outline-none"
                >
                  <Send size={28} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
