import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActivitySource = 'DEVICE' | 'MANUAL';

export interface DailyActivity {
  date: string; // YYYY-MM-DD local
  steps: number;
  stepGoal: number;
  distance: number | null; // meters
  activeTime: number | null; // seconds
  estimatedEnergy: number | null; // kcal
  source: ActivitySource;
  lastUpdated: number; // timestamp
}

interface ActivityState {
  dailyActivity: DailyActivity | null;
  history: DailyActivity[];
  stepGoal: number;
  
  // Actions
  initializeToday: () => void;
  checkRollover: () => void;
  setStepGoal: (goal: number) => void;
  addSteps: (steps: number, source: ActivitySource) => void;
  addManualActivity: (steps: number, distance?: number, activeTime?: number) => void;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

const createEmptyDay = (date: string, stepGoal: number): DailyActivity => ({
  date,
  steps: 0,
  stepGoal,
  distance: null,
  activeTime: null,
  estimatedEnergy: null,
  source: 'DEVICE',
  lastUpdated: Date.now()
});

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      dailyActivity: null,
      history: [],
      stepGoal: 8000,

      initializeToday: () => {
        const todayStr = getTodayStr();
        const { dailyActivity, stepGoal, checkRollover } = get();
        
        checkRollover(); // Make sure any past day is archived

        if (!dailyActivity || dailyActivity.date !== todayStr) {
          set({ dailyActivity: createEmptyDay(todayStr, stepGoal) });
        }
      },

      checkRollover: () => {
        const todayStr = getTodayStr();
        const { dailyActivity, history } = get();
        
        if (dailyActivity && dailyActivity.date !== todayStr) {
          // It's a new day, archive the old one
          // Prevent duplicates
          const existingHistoryIndex = history.findIndex(h => h.date === dailyActivity.date);
          const newHistory = [...history];
          if (existingHistoryIndex >= 0) {
            newHistory[existingHistoryIndex] = dailyActivity;
          } else {
            newHistory.unshift(dailyActivity); // Add to beginning
          }
          
          set({
            history: newHistory,
            dailyActivity: createEmptyDay(todayStr, get().stepGoal)
          });
        }
      },

      setStepGoal: (goal) => 
        set((state) => ({ 
          stepGoal: goal,
          dailyActivity: state.dailyActivity ? { ...state.dailyActivity, stepGoal: goal } : null
        })),

      addSteps: (steps, source) => {
        get().checkRollover();
        set((state) => {
          if (!state.dailyActivity) return state;
          
          const newSteps = state.dailyActivity.steps + steps;
          // Simple estimation: 1 step ≈ 0.75 meters
          const estimatedDistance = newSteps * 0.75;
          // Simple estimation: 1 step ≈ 0.04 kcal
          const estimatedEnergy = newSteps * 0.04;
          // Simple estimation: 100 steps per minute walking
          const estimatedActiveTime = Math.floor((newSteps / 100) * 60);

          return {
            dailyActivity: {
              ...state.dailyActivity,
              steps: newSteps,
              source,
              distance: state.dailyActivity.distance !== null ? state.dailyActivity.distance : estimatedDistance,
              estimatedEnergy: state.dailyActivity.estimatedEnergy !== null ? state.dailyActivity.estimatedEnergy : estimatedEnergy,
              activeTime: state.dailyActivity.activeTime !== null ? state.dailyActivity.activeTime : estimatedActiveTime,
              lastUpdated: Date.now()
            }
          };
        });
      },

      addManualActivity: (steps, distance, activeTime) => {
        get().checkRollover();
        set((state) => {
          if (!state.dailyActivity) return state;
          
          const newSteps = state.dailyActivity.steps + steps;
          const estimatedDistance = distance || (newSteps * 0.75);
          const estimatedEnergy = newSteps * 0.04;
          const estimatedActiveTime = activeTime || Math.floor((newSteps / 100) * 60);

          return {
            dailyActivity: {
              ...state.dailyActivity,
              steps: newSteps,
              source: 'MANUAL',
              distance: estimatedDistance,
              estimatedEnergy: estimatedEnergy,
              activeTime: estimatedActiveTime,
              lastUpdated: Date.now()
            }
          };
        });
      }
    }),
    {
      name: 'system-activity-data'
    }
  )
);
