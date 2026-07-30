// lib/textUtils.ts

const IRREGULAR_VERBS: Record<string, string[]> = {
  eat: ['eat', 'ate', 'eaten', 'eating', 'eats'],
  take: ['take', 'took', 'taken', 'taking', 'takes'],
  make: ['make', 'made', 'making', 'makes'],
  find: ['find', 'found', 'finding', 'finds'],
  go: ['go', 'went', 'gone', 'going', 'goes'],
  come: ['come', 'came', 'coming', 'comes'],
  see: ['see', 'saw', 'seen', 'seeing', 'sees'],
  get: ['get', 'got', 'gotten', 'getting', 'gets'],
  keep: ['keep', 'kept', 'keeping', 'keeps'],
  give: ['give', 'gave', 'given', 'giving', 'gives'],
  know: ['know', 'knew', 'known', 'knowing', 'knows'],
  throw: ['throw', 'threw', 'thrown', 'throwing', 'throws'],
  write: ['write', 'wrote', 'written', 'writing', 'writes'],
  break: ['break', 'broke', 'broken', 'breaking', 'breaks'],
  speak: ['speak', 'spoke', 'spoken', 'speaking', 'speaks'],
  choose: ['choose', 'chose', 'chosen', 'choosing', 'chooses'],
  fall: ['fall', 'fell', 'fallen', 'falling', 'falls'],
  feel: ['feel', 'felt', 'feeling', 'feels'],
  leave: ['leave', 'left', 'leaving', 'leaves'],
  lose: ['lose', 'lost', 'losing', 'loses'],
  meet: ['meet', 'met', 'meeting', 'meets'],
  pay: ['pay', 'paid', 'paying', 'pays'],
  say: ['say', 'said', 'saying', 'says'],
  sell: ['sell', 'sold', 'selling', 'sells'],
  tell: ['tell', 'told', 'telling', 'tells'],
  think: ['think', 'thought', 'thinking', 'thinks'],
  bring: ['bring', 'brought', 'bringing', 'brings'],
  buy: ['buy', 'bought', 'buying', 'buys'],
  catch: ['catch', 'caught', 'catching', 'catches'],
  fight: ['fight', 'fought', 'fighting', 'fights'],
  teach: ['teach', 'taught', 'teaching', 'teaches'],
  hold: ['hold', 'held', 'holding', 'holds'],
  stand: ['stand', 'stood', 'standing', 'stands'],
  understand: ['understand', 'understood', 'understanding', 'understands'],
  bear: ['bear', 'bore', 'born', 'borne', 'bearing', 'bears'],
  run: ['run', 'ran', 'running', 'runs'],
  sit: ['sit', 'sat', 'sitting', 'sits'],
  win: ['win', 'won', 'winning', 'wins'],
  lead: ['lead', 'led', 'leading', 'leads'],
  build: ['build', 'built', 'building', 'builds']
};

const STOP_WORDS = ['sb', 'sth', 'someone', "one's", 'to', 'a', 'an', 'the', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'about', 'as', 'and', 'or', 'but'];

function getMatchRange(wordStr: string, exampleStr: string): { start: number, end: number } | null {
  if (!exampleStr || exampleStr === '-') return null;

  // 1. Exact match
  const escapedWord = wordStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactRegex = new RegExp(`(${escapedWord})`, 'gi');
  const match = exactRegex.exec(exampleStr);
  if (match) {
    return { start: match.index, end: match.index + match[0].length };
  }

  // 1.5. Kanji stem match for Japanese vocabulary inflections (e.g. 行く -> 行います)
  if (/[\u3400-\u4dbf\u4e00-\u9fff]/.test(wordStr)) {
    const kanjiMatches = wordStr.match(/[\u3400-\u4dbf\u4e00-\u9fff]+/g);
    if (kanjiMatches && kanjiMatches.length > 0) {
      const longestKanji = kanjiMatches.reduce((a, b) => a.length >= b.length ? a : b);
      if (longestKanji.length > 0) {
        const kanjiRegex = new RegExp(longestKanji, 'g');
        const m = kanjiRegex.exec(exampleStr);
        if (m) {
          return { start: m.index, end: m.index + m[0].length };
        }
      }
    }
  }

  // 2. Fuzzy match
  const rawWords = wordStr.split(/[\s-]+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const searchTerms: string[] = [];
  
  rawWords.forEach((w, i) => {
    if (w.length < 2 || STOP_WORDS.includes(w)) return;
    if (i === 0 && IRREGULAR_VERBS[w]) {
      searchTerms.push(...IRREGULAR_VERBS[w]);
    } else {
      searchTerms.push(w);
      const stem = w.replace(/(ing|ed|es|s)$/, '');
      if (stem.length >= 3 && stem !== w) searchTerms.push(stem);
    }
  });

  let minIdx = -1;
  let maxIdx = -1;

  searchTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}[a-z]*\\b`, 'gi');
    let m;
    while ((m = regex.exec(exampleStr)) !== null) {
      if (minIdx === -1 || m.index < minIdx) minIdx = m.index;
      const end = m.index + m[0].length;
      if (end > maxIdx) maxIdx = end;
    }
  });

  if (minIdx !== -1 && maxIdx !== -1 && minIdx < maxIdx) {
    return { start: minIdx, end: maxIdx };
  }

  return null;
}

export function maskExampleSentence(wordStr: string, exampleStr: string, replacementChar = '_'): string {
  const range = getMatchRange(wordStr, exampleStr);
  if (!range) return exampleStr;

  const before = exampleStr.substring(0, range.start);
  const middle = exampleStr.substring(range.start, range.end);
  const after = exampleStr.substring(range.end);
  
  const maskedMiddle = middle.replace(/[a-zA-Z]/g, replacementChar);
  return before + maskedMiddle + after;
}

export function highlightExampleSentence(wordStr: string, exampleStr: string): string {
  const range = getMatchRange(wordStr, exampleStr);
  if (!range) return exampleStr;

  const before = exampleStr.substring(0, range.start);
  const middle = exampleStr.substring(range.start, range.end);
  const after = exampleStr.substring(range.end);
  
  return `${before}<strong>${middle}</strong>${after}`;
}

export function maskExampleHtml(wordStr: string, exampleStr: string): string {
  const range = getMatchRange(wordStr, exampleStr);
  if (!range) return exampleStr;

  const before = exampleStr.substring(0, range.start);
  const middle = exampleStr.substring(range.start, range.end);
  const after = exampleStr.substring(range.end);
  
  const maskedMiddle = middle.replace(/[a-zA-Z]/g, '_');
  return `${before}<span class="font-semibold text-on-surface">${maskedMiddle}</span>${after}`;
}
