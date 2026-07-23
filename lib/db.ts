import Dexie, { Table } from 'dexie';

export interface WordList {
  id?: number;
  title: string;
  createdAt: Date;
  isActive?: boolean;
}

export interface Word {
  id?: number;
  listId: number;
  word: string;
  partOfSpeech: string;
  meaningKo: string;
  exampleEn: string;
  exampleKo: string;
  isLearned: boolean;
  testCount: number;
  correctCount: number;
  zipfScore?: number;
}

export interface StudyHistory {
  id?: number;
  userEmail: string;
  createdAt: Date;
  type: 'study' | 'test';
  totalCount: number;
  completedCount: number;
  incompleteWords: string;
  completeWords: string;
  isSynced: boolean;
}

export class WordSmartDB extends Dexie {
  wordLists!: Table<WordList, number>;
  words!: Table<Word, number>;
  history!: Table<StudyHistory, number>;

  constructor() {
    super('WordSmartDB');
    this.version(1).stores({
      wordLists: '++id, title, createdAt, isActive',
      words: '++id, listId, word, isLearned, testCount, correctCount'
    });
    this.version(2).stores({
      history: '++id, userEmail, createdAt, type, isSynced'
    });
  }
}

export const db = new WordSmartDB();
