/**
 * 학습/테스트 단어 큐 생성 유틸리티
 */

/** Fisher-Yates 셔플 (편향 없는 균등 무작위). 원본 배열은 변경하지 않습니다. */
export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 단어 텍스트(공백/대소문자 무시) 기준으로 중복을 제거합니다. 먼저 나온 항목을 유지합니다. */
export function dedupeByWord<T extends { word: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of arr) {
    const key = (item.word || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * 중복 없는 무작위 큐를 만듭니다.
 * - count <= 고유 단어 수: 중복 없이 count개 추출
 * - count > 고유 단어 수: 전체 단어를 한 사이클씩 새로 섞어 이어 붙이며,
 *   사이클 경계에서 같은 단어가 연속으로 나오지 않도록 보정합니다.
 */
export function buildUniqueQueue<T extends { word: string }>(pool: T[], count: number): T[] {
  const unique = dedupeByWord(pool);
  if (unique.length === 0 || count <= 0) return [];

  if (count <= unique.length) {
    return shuffleArray(unique).slice(0, count);
  }

  const queue: T[] = [];
  while (queue.length < count) {
    const cycle = shuffleArray(unique);
    const last = queue[queue.length - 1];
    if (last && cycle.length > 1 && cycle[0].word === last.word) {
      [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    }
    queue.push(...cycle.slice(0, count - queue.length));
  }
  return queue;
}
