import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DailyActivity {
  date: string; // YYYY-MM-DD local
  automaticSteps: number;
  manualSteps: number;
  totalSteps: number;
  stepGoal: number;
  distance: number | null; // meters
  activeTime: number | null; // seconds
  estimatedEnergy: number | null; // kcal
  source: string; // e.g., 'WEB_UNSUPPORTED', 'NATIVE_IOS', 'NATIVE_ANDROID'
  lastSyncedAt: number | null;
}

interface ActivityState {
  dailyActivity: DailyActivity | null;
  history: DailyActivity[];
  stepGoal: number;
  
  // Actions
  initializeToday: (source: string) => void;
  checkRollover: (source: string) => void;
  setStepGoal: (goal: number) => void;
  syncAutomaticSteps: (steps: number, source: string, distance?: number, activeTime?: number) => void;
  addManualActivity: (steps: number) => void;
  overwriteHistory: (historicalData: Record<string, number>, source: string) => void;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

const createEmptyDay = (date: string, stepGoal: number, source: string): DailyActivity => ({
  date,
  automaticSteps: 0,
  manualSteps: 0,
  totalSteps: 0,
  stepGoal,
  distance: null,
  activeTime: null,
  estimatedEnergy: null,
  source,
  lastSyncedAt: null
});

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      dailyActivity: null,
      history: [],
      stepGoal: 8000,

      initializeToday: (source) => {
        const todayStr = getTodayStr();
        const { dailyActivity, stepGoal, checkRollover } = get();
        
        checkRollover(source); 

        if (!dailyActivity || dailyActivity.date !== todayStr) {
          set({ dailyActivity: createEmptyDay(todayStr, stepGoal, source) });
        } else if (dailyActivity.source !== source) {
           set({ dailyActivity: { ...dailyActivity, source } });
        }
      },

      checkRollover: (source) => {
        const todayStr = getTodayStr();
        const { dailyActivity, history, stepGoal } = get();
        
        if (dailyActivity && dailyActivity.date !== todayStr) {
          const existingHistoryIndex = history.findIndex(h => h.date === dailyActivity.date);
          const newHistory = [...history];
          
          if (existingHistoryIndex >= 0) {
            newHistory[existingHistoryIndex] = dailyActivity;
          } else {
            newHistory.unshift(dailyActivity); 
          }
          
          set({
            history: newHistory,
            dailyActivity: createEmptyDay(todayStr, stepGoal, source)
          });
        }
      },

      setStepGoal: (goal) => 
        set((state) => ({ 
          stepGoal: goal,
          dailyActivity: state.dailyActivity ? { ...state.dailyActivity, stepGoal: goal } : null
        })),

      syncAutomaticSteps: (steps, source, distance, activeTime) => {
        get().checkRollover(source);
        set((state) => {
          if (!state.dailyActivity) return state;
          
          const totalSteps = steps + state.dailyActivity.manualSteps;
          const estimatedDistance = distance ?? (totalSteps * 0.75);
          const estimatedEnergy = totalSteps * 0.04;
          const estimatedActiveTime = activeTime ?? Math.floor((totalSteps / 100) * 60);

          return {
            dailyActivity: {
              ...state.dailyActivity,
              automaticSteps: steps,
              totalSteps: totalSteps,
              source,
              distance: estimatedDistance,
              estimatedEnergy: estimatedEnergy,
              activeTime: estimatedActiveTime,
              lastSyncedAt: Date.now()
            }
          };
        });
      },

      addManualActivity: (steps) => {
        const source = get().dailyActivity?.source || 'MANUAL';
        get().checkRollover(source);
        set((state) => {
          if (!state.dailyActivity) return state;
          
          const newManual = state.dailyActivity.manualSteps + steps;
          const totalSteps = state.dailyActivity.automaticSteps + newManual;
          
          const estimatedDistance = totalSteps * 0.75;
          const estimatedEnergy = totalSteps * 0.04;
          const estimatedActiveTime = Math.floor((totalSteps / 100) * 60);

          return {
            dailyActivity: {
              ...state.dailyActivity,
              manualSteps: newManual,
              totalSteps: totalSteps,
              distance: estimatedDistance,
              estimatedEnergy: estimatedEnergy,
              activeTime: estimatedActiveTime,
            }
          };
        });
      },

      overwriteHistory: (historicalData, source) => {
        set((state) => {
           const newHistory = [...state.history];
           Object.entries(historicalData).forEach(([dateStr, steps]) => {
              // Ignore today, as today is tracked in dailyActivity
              if (dateStr === getTodayStr()) return;
              
              const existingIdx = newHistory.findIndex(h => h.date === dateStr);
              if (existingIdx >= 0) {
                 newHistory[existingIdx] = {
                   ...newHistory[existingIdx],
                   automaticSteps: steps,
                   totalSteps: steps + newHistory[existingIdx].manualSteps,
                   source,
                   distance: (steps + newHistory[existingIdx].manualSteps) * 0.75,
                   estimatedEnergy: (steps + newHistory[existingIdx].manualSteps) * 0.04,
                   activeTime: Math.floor(((steps + newHistory[existingIdx].manualSteps) / 100) * 60)
                 };
              } else {
                 newHistory.unshift(createEmptyDay(dateStr, state.stepGoal, source));
                 newHistory[0].automaticSteps = steps;
                 newHistory[0].totalSteps = steps;
                 newHistory[0].distance = steps * 0.75;
                 newHistory[0].estimatedEnergy = steps * 0.04;
                 newHistory[0].activeTime = Math.floor((steps / 100) * 60);
              }
           });
           
           // Sort history descending
           newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           
           return { history: newHistory };
        });
      }
    }),
    {
      name: 'system-activity-data'
    }
  )
);
