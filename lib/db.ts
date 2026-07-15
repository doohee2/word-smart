import Dexie, { Table } from 'dexie';

export interface WordList {
  id?: number;
  title: string;
  createdAt: Date;
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
}

export class WordSmartDB extends Dexie {
  wordLists!: Table<WordList, number>;
  words!: Table<Word, number>;

  constructor() {
    super('WordSmartDB');
    this.version(1).stores({
      wordLists: '++id, title, createdAt',
      words: '++id, listId, word, isLearned' // listId is indexed for fast lookups
    });
  }
}

export const db = new WordSmartDB();
