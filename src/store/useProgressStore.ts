import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PhotoType = 'GENERAL_STANDING' | 'TARGETED_MUSCLE';

export interface ProgressPhoto {
  id: string;
  workoutSessionId: string;
  date: string; // ISO Date String
  timestamp: number;
  photoType: PhotoType;
  muscleGroups: string[]; // e.g. ["Chest", "Shoulders", "Triceps"]
  imageUri: string; // Base64 string
  workoutName: string;
}

interface ProgressState {
  photos: ProgressPhoto[];
  addPhoto: (photo: ProgressPhoto) => void;
  deletePhoto: (id: string) => void;
  getPhotosBySession: (sessionId: string) => ProgressPhoto[];
  clearAllPhotos: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      photos: [],
      addPhoto: (photo) => set((state) => ({
        photos: [photo, ...state.photos] // newest first
      })),
      deletePhoto: (id) => set((state) => ({
        photos: state.photos.filter((p) => p.id !== id)
      })),
      getPhotosBySession: (sessionId) => {
        return get().photos.filter((p) => p.workoutSessionId === sessionId);
      },
      clearAllPhotos: () => set({ photos: [] }),
    }),
    {
      name: 'system-progress-photos',
    }
  )
);
