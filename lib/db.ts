import Dexie, { Table } from 'dexie';

export interface WordList {
  id?: number;
  title: string;
  createdAt: Date;
  isActive?: boolean;
  lang?: 'en' | 'ja';
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
  serverId?: string;
  userEmail: string;
  createdAt: Date;
  type: 'study' | 'test';
  totalCount: number;
  completedCount: number;
  incompleteWords: string;
  completeWords: string;
  isSynced: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  lang?: 'en' | 'ja';
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
    this.version(3).stores({
      history: '++id, userEmail, createdAt, type, isSynced, isDeleted'
    }).upgrade(tx => {
      return tx.table('history').toCollection().modify(h => {
        if (h.isDeleted === undefined) h.isDeleted = false;
      });
    });
    this.version(4).stores({
      history: '++id, serverId, userEmail, createdAt, type, isSynced, isDeleted'
    });
    this.version(5).stores({
      wordLists: '++id, title, createdAt, isActive, lang'
    });
  }
}

export const db = new WordSmartDB();
