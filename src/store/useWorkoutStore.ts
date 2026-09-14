import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Legs' | 'Glutes' | 'Core' | 'Full Body' | 'Conditioning';
export type MovementType = 'repetition' | 'timed';

export interface ExerciseDef {
  id: string;
  name: string;
  voiceName: string; // NEW
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipmentRequired: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  movementType: MovementType;
  defaultSets: number;
  defaultReps: number;
  defaultDuration?: number; // seconds
  defaultRest: number; // seconds
  instructions?: string;
}

export interface WorkoutSet {
  setNumber: number;
  targetReps?: number;
  actualReps?: number;
  targetWeight?: number;
  actualWeight?: number;
  targetDuration?: number; // seconds
  actualDuration?: number; // seconds
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  workoutName: string;
  targetMuscles: string[]; // NEW
  date: string; // ISO string
  startTime: number; // timestamp
  endTime?: number; // timestamp
  duration?: number; // seconds
  exercises: WorkoutExercise[];
  completed: boolean;
}

export interface TrainingDayPlan {
  dayOfWeek: string;
  protocolName: string;
  isRestDay: boolean;
  targetMuscles: string[];
}

interface WorkoutState {
  workoutHistory: WorkoutSession[];
  activeWorkout: WorkoutSession | null;
  voiceEnabled: boolean;
  soundsEnabled: boolean;
  cameraEnabled: boolean;
  weeklyPlan: TrainingDayPlan[];
  
  // Actions
  setVoiceEnabled: (enabled: boolean) => void;
  setSoundsEnabled: (enabled: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
  setWeeklyPlan: (plan: TrainingDayPlan[]) => void;
  startWorkout: (session: WorkoutSession) => void;
  updateActiveSet: (exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet>) => void;
  completeActiveWorkout: () => void;
  cancelActiveWorkout: () => void;
  clearHistory: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      workoutHistory: [],
      activeWorkout: null,
      voiceEnabled: true,
      soundsEnabled: true,
      cameraEnabled: true,
      weeklyPlan: [],

      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      setSoundsEnabled: (enabled) => set({ soundsEnabled: enabled }),
      setCameraEnabled: (enabled) => set({ cameraEnabled: enabled }),
      setWeeklyPlan: (plan) => set({ weeklyPlan: plan }),

      startWorkout: (session) => set({ activeWorkout: session }),

      updateActiveSet: (exerciseIndex, setIndex, data) => 
        set((state) => {
          if (!state.activeWorkout) return state;

          const updatedExercises = [...state.activeWorkout.exercises];
          const exercise = updatedExercises[exerciseIndex];
          
          if (!exercise) return state;

          const updatedSets = [...exercise.sets];
          updatedSets[setIndex] = { ...updatedSets[setIndex], ...data };
          
          updatedExercises[exerciseIndex] = { ...exercise, sets: updatedSets };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: updatedExercises
            }
          };
        }),

      completeActiveWorkout: () => 
        set((state) => {
          if (!state.activeWorkout) return state;
          
          const completedWorkout = {
            ...state.activeWorkout,
            endTime: Date.now(),
            duration: Math.floor((Date.now() - state.activeWorkout.startTime) / 1000),
            completed: true
          };

          return {
            workoutHistory: [completedWorkout, ...state.workoutHistory],
            activeWorkout: null
          };
        }),

      cancelActiveWorkout: () => set({ activeWorkout: null }),
      
      clearHistory: () => set({ workoutHistory: [] }),
    }),
    {
      name: 'system-workout-data',
    }
  )
);
