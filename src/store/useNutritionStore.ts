import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LoggedFood {
  id: string;
  name: string;
  estimatedPortion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Meal {
  id: string;
  type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  timestamp: number;
  items: LoggedFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface DailyNutrition {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface NutritionState {
  dailyNutrition: DailyNutrition | null;
  history: DailyNutrition[];
  calorieGoal: number;
  proteinGoal: number;
  
  initializeToday: () => void;
  checkRollover: () => void;
  setGoals: (calories: number, protein: number) => void;
  addMeal: (meal: Omit<Meal, 'id'>) => void;
  removeMeal: (mealId: string) => void;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

const createEmptyDay = (date: string): DailyNutrition => ({
  date,
  meals: [],
  dailyTotals: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }
});

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      dailyNutrition: null,
      history: [],
      calorieGoal: 2000,
      proteinGoal: 150,

      initializeToday: () => {
        const todayStr = getTodayStr();
        get().checkRollover();

        const { dailyNutrition } = get();
        if (!dailyNutrition || dailyNutrition.date !== todayStr) {
          set({ dailyNutrition: createEmptyDay(todayStr) });
        }
      },

      checkRollover: () => {
        const todayStr = getTodayStr();
        const { dailyNutrition, history } = get();
        
        if (dailyNutrition && dailyNutrition.date !== todayStr) {
          const existingHistoryIndex = history.findIndex(h => h.date === dailyNutrition.date);
          const newHistory = [...history];
          
          if (existingHistoryIndex >= 0) {
            newHistory[existingHistoryIndex] = dailyNutrition;
          } else {
            newHistory.unshift(dailyNutrition); 
          }
          
          set({
            history: newHistory,
            dailyNutrition: createEmptyDay(todayStr)
          });
        }
      },

      setGoals: (calories, protein) => set({ calorieGoal: calories, proteinGoal: protein }),

      addMeal: (mealData) => {
        get().checkRollover();
        
        set((state) => {
          if (!state.dailyNutrition) return state;
          
          const newMeal: Meal = {
            ...mealData,
            id: crypto.randomUUID()
          };
          
          const newMeals = [...state.dailyNutrition.meals, newMeal];
          // Recalculate totals
          const newTotals = newMeals.reduce((acc, meal) => {
            acc.calories += meal.totalCalories;
            acc.protein += meal.totalProtein;
            acc.carbs += meal.totalCarbs;
            acc.fat += meal.totalFat;
            return acc;
          }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

          return {
            dailyNutrition: {
              ...state.dailyNutrition,
              meals: newMeals,
              dailyTotals: newTotals
            }
          };
        });
      },

      removeMeal: (mealId) => {
        get().checkRollover();
        
        set((state) => {
          if (!state.dailyNutrition) return state;
          
          const newMeals = state.dailyNutrition.meals.filter(m => m.id !== mealId);
          // Recalculate totals
          const newTotals = newMeals.reduce((acc, meal) => {
            acc.calories += meal.totalCalories;
            acc.protein += meal.totalProtein;
            acc.carbs += meal.totalCarbs;
            acc.fat += meal.totalFat;
            return acc;
          }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

          return {
            dailyNutrition: {
              ...state.dailyNutrition,
              meals: newMeals,
              dailyTotals: newTotals
            }
          };
        });
      }
    }),
    {
      name: 'system-nutrition-data'
    }
  )
);
