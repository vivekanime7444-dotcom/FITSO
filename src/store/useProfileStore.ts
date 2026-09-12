import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced' | '';
export type PrimaryGoal = 'Build Muscle' | 'Build Strength' | 'Improve Endurance' | 'General Fitness' | 'Physique Goal' | '';
export type Equipment = 'No Equipment' | 'Pull-up Bar' | 'Dip Bar' | 'Dumbbells' | 'Barbell' | 'Bench' | 'Resistance Bands' | 'Kettlebell' | 'Cable Machine' | 'Custom / Other';
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type PreferredTime = 'Morning' | 'Afternoon' | 'Evening' | 'Custom time' | '';

export interface UserProfile {
  name: string;
  age: string;
  height: string;
  weight: string;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  equipment: Equipment[];
  trainingDaysCount: string;
  trainingDays: DayOfWeek[];
  preferredWorkoutTime: PreferredTime;
  customTime?: string;
  createdAt?: string;
  isCompleted: boolean;
}

interface ProfileState {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
  completeOnboarding: () => void;
}

const initialProfile: UserProfile = {
  name: '',
  age: '',
  height: '',
  weight: '',
  experienceLevel: '',
  primaryGoal: '',
  equipment: [],
  trainingDaysCount: '',
  trainingDays: [],
  preferredWorkoutTime: '',
  isCompleted: false,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: initialProfile,
      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      resetProfile: () => set({ profile: initialProfile }),
      completeOnboarding: () =>
        set((state) => ({
          profile: {
            ...state.profile,
            isCompleted: true,
            createdAt: state.profile.createdAt || new Date().toISOString(),
          },
        })),
    }),
    {
      name: 'system-player-profile',
    }
  )
);
