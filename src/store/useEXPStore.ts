import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EXPSourceType = 'WORKOUT' | 'HABIT' | 'QUEST' | 'ACHIEVEMENT' | 'MANUAL';

export interface EXPTransaction {
  id: string;
  sourceType: EXPSourceType;
  sourceId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface EXPState {
  totalEXP: number;
  currentLevel: number;
  transactions: EXPTransaction[];
  
  // Internal actions
  _addTransaction: (tx: EXPTransaction, newTotal: number, newLevel: number) => void;
  _reset: () => void;
}

export const useEXPStore = create<EXPState>()(
  persist(
    (set) => ({
      totalEXP: 0,
      currentLevel: 1,
      transactions: [],

      _addTransaction: (tx, newTotal, newLevel) =>
        set((state) => ({
          transactions: [tx, ...state.transactions],
          totalEXP: newTotal,
          currentLevel: newLevel
        })),
        
      _reset: () => set({ totalEXP: 0, currentLevel: 1, transactions: [] })
    }),
    {
      name: 'fitso-exp-storage',
      version: 1
    }
  )
);
