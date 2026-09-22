import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HabitFrequency = 'DAILY' | 'WEEKLY';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  weeklyTarget?: number; // Default 1
  reminderTime?: string; // HH:mm
  createdAt: string;
  isActive: boolean;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // Local YYYY-MM-DD for DAILY, or start-of-week YYYY-MM-DD for WEEKLY
  completedAt: number;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
}

interface HabitState {
  habits: Habit[];
  completions: HabitCompletion[];
  
  // Actions
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'isActive'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleCompletion: (habitId: string, date: string) => void; // date should be YYYY-MM-DD
  
  // Getters
  getHabitStats: (habitId: string) => HabitStats;
  getTodayHabits: () => { habit: Habit; completed: boolean; currentCount?: number }[];
}

// Helper to get local YYYY-MM-DD
export const getLocalISOString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(date.getTime() - offset)).toISOString().split('T')[0];
  return localISOTime;
};

// Helper to get Monday of the current week
export const getStartOfWeek = (date: Date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  return getLocalISOString(d);
};

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      completions: [],

      addHabit: (habitData) => {
        const newHabit: Habit = {
          ...habitData,
          id: `habit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          createdAt: new Date().toISOString(),
          isActive: true,
        };
        set((state) => ({ habits: [...state.habits, newHabit] }));
      },

      updateHabit: (id, updates) => {
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        }));
      },

      deleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
          // We could keep completions for historical data, but let's keep it clean
          completions: state.completions.filter((c) => c.habitId !== id),
        }));
      },

      toggleCompletion: (habitId, targetDate) => {
        set((state) => {
          const habit = state.habits.find(h => h.id === habitId);
          if (!habit) return state;

          const existingIndex = state.completions.findIndex(
            (c) => c.habitId === habitId && c.date === targetDate
          );

          if (habit.frequency === 'DAILY') {
            if (existingIndex >= 0) {
              // Undo
              const newCompletions = [...state.completions];
              newCompletions.splice(existingIndex, 1);
              return { completions: newCompletions };
            } else {
              // Complete
              return {
                completions: [
                  ...state.completions,
                  {
                    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    habitId,
                    date: targetDate,
                    completedAt: Date.now(),
                  }
                ]
              };
            }
          } else {
            // WEEKLY logic
            const weekStart = getStartOfWeek(new Date(targetDate)); 
            const thisWeekCompletions = state.completions.filter(c => c.habitId === habitId && c.date === weekStart);
            
            const target = habit.weeklyTarget || 1;
            
            if (thisWeekCompletions.length >= target) {
               // Undo (remove the most recent one for this week)
               const sorted = [...thisWeekCompletions].sort((a,b) => a.completedAt - b.completedAt);
               const lastCompletion = sorted[sorted.length - 1];
               return {
                 completions: state.completions.filter(c => c.id !== lastCompletion.id)
               };
            } else {
               // Complete (add one)
               return {
                completions: [
                  ...state.completions,
                  {
                    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    habitId,
                    date: weekStart, 
                    completedAt: Date.now(),
                  }
                ]
              };
            }
          }
        });
      },

      getHabitStats: (habitId) => {
        const state = get();
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit) return { currentStreak: 0, bestStreak: 0, totalCompletions: 0 };

        let currentStreak = 0;
        let bestStreak = 0;
        let totalCompletions = 0;

        if (habit.frequency === 'DAILY') {
            const completedDates = state.completions
                .filter(c => c.habitId === habitId)
                .map(c => c.date)
                // Deduplicate just in case
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort();
                
            totalCompletions = completedDates.length;

            if (totalCompletions > 0) {
                let tempStreak = 1;
                bestStreak = 1;

                for (let i = 1; i < completedDates.length; i++) {
                    const prevDate = new Date(completedDates[i - 1]);
                    const currDate = new Date(completedDates[i]);
                    const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        tempStreak++;
                        if (tempStreak > bestStreak) bestStreak = tempStreak;
                    } else if (diffDays > 1) {
                        tempStreak = 1; 
                    }
                }

                const lastDate = new Date(completedDates[completedDates.length - 1]);
                const today = new Date(getLocalISOString());
                
                const diffTime = today.getTime() - lastDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 1) {
                    currentStreak = tempStreak;
                } else {
                    currentStreak = 0;
                }
            }
        } else if (habit.frequency === 'WEEKLY') {
            const target = habit.weeklyTarget || 1;
            
            const weeklyCounts: Record<string, number> = {};
            state.completions.filter(c => c.habitId === habitId).forEach(c => {
               weeklyCounts[c.date] = (weeklyCounts[c.date] || 0) + 1;
            });
            
            const weeksCompleted = Object.keys(weeklyCounts)
               .filter(week => weeklyCounts[week] >= target)
               .sort();
               
            totalCompletions = weeksCompleted.length;
            
            if (totalCompletions > 0) {
                let tempStreak = 1;
                bestStreak = 1;
                
                for (let i = 1; i < weeksCompleted.length; i++) {
                    const prevWeek = new Date(weeksCompleted[i - 1]);
                    const currWeek = new Date(weeksCompleted[i]);
                    const diffTime = Math.abs(currWeek.getTime() - prevWeek.getTime());
                    const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));

                    if (diffWeeks === 1) {
                        tempStreak++;
                        if (tempStreak > bestStreak) bestStreak = tempStreak;
                    } else if (diffWeeks > 1) {
                        tempStreak = 1;
                    }
                }
                
                const lastWeekCompleted = new Date(weeksCompleted[weeksCompleted.length - 1]);
                const thisWeek = new Date(getStartOfWeek());
                
                const diffTime = thisWeek.getTime() - lastWeekCompleted.getTime();
                const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
                
                if (diffWeeks <= 1) {
                    currentStreak = tempStreak;
                } else {
                    currentStreak = 0;
                }
            }
        }

        return { currentStreak, bestStreak, totalCompletions };
      },

      getTodayHabits: () => {
        const state = get();
        const todayStr = getLocalISOString();
        const weekStr = getStartOfWeek();

        return state.habits.filter(h => h.isActive).map(habit => {
           if (habit.frequency === 'DAILY') {
               const completed = state.completions.some(c => c.habitId === habit.id && c.date === todayStr);
               return { habit, completed };
           } else {
               const completionsThisWeek = state.completions.filter(c => c.habitId === habit.id && c.date === weekStr).length;
               const target = habit.weeklyTarget || 1;
               return { habit, completed: completionsThisWeek >= target, currentCount: completionsThisWeek };
           }
        });
      }
    }),
    {
      name: 'fitso-habits-storage',
      version: 1,
    }
  )
);
