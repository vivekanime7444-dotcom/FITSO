import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ScheduleStatus = 'UPCOMING' | 'TODAY' | 'WORKOUT' | 'REST' | 'COMPLETED' | 'MISSED';

export interface WorkoutScheduleDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // 'MON', 'TUE', etc.
  protocolName: string;
  isRestDay: boolean;
  status: ScheduleStatus;
  targetMuscles: string[];
}

interface SchedulerState {
  weeklySchedule: WorkoutScheduleDay[];
  lastGeneratedDate: string | null;
  notificationsEnabled: boolean;
  
  // Actions
  setWeeklySchedule: (schedule: WorkoutScheduleDay[]) => void;
  updateDayStatus: (date: string, status: ScheduleStatus) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  rescheduleWorkout: (fromDate: string, toDate: string) => void;
}

export const useSchedulerStore = create<SchedulerState>()(
  persist(
    (set) => ({
      weeklySchedule: [],
      lastGeneratedDate: null,
      notificationsEnabled: false,

      setWeeklySchedule: (schedule) => set({ 
        weeklySchedule: schedule, 
        lastGeneratedDate: new Date().toISOString().split('T')[0] 
      }),

      updateDayStatus: (date, status) => 
        set((state) => ({
          weeklySchedule: state.weeklySchedule.map(day => 
            day.date === date ? { ...day, status } : day
          )
        })),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      rescheduleWorkout: (fromDate, toDate) => 
        set((state) => {
          const newSchedule = [...state.weeklySchedule];
          const fromIndex = newSchedule.findIndex(d => d.date === fromDate);
          const toIndex = newSchedule.findIndex(d => d.date === toDate);
          
          if (fromIndex !== -1 && toIndex !== -1) {
            // Swap the protocol and rest status between the two days
            const tempProtocol = newSchedule[fromIndex].protocolName;
            const tempIsRest = newSchedule[fromIndex].isRestDay;
            const tempMuscles = newSchedule[fromIndex].targetMuscles;
            
            newSchedule[fromIndex] = { 
              ...newSchedule[fromIndex], 
              protocolName: newSchedule[toIndex].protocolName,
              isRestDay: newSchedule[toIndex].isRestDay,
              targetMuscles: newSchedule[toIndex].targetMuscles,
              status: newSchedule[toIndex].isRestDay ? 'REST' : (newSchedule[fromIndex].date === new Date().toISOString().split('T')[0] ? 'TODAY' : 'UPCOMING')
            };
            
            newSchedule[toIndex] = { 
              ...newSchedule[toIndex], 
              protocolName: tempProtocol,
              isRestDay: tempIsRest,
              targetMuscles: tempMuscles,
              status: tempIsRest ? 'REST' : (newSchedule[toIndex].date === new Date().toISOString().split('T')[0] ? 'TODAY' : 'UPCOMING')
            };
          }
          
          return { weeklySchedule: newSchedule };
        })
    }),
    {
      name: 'system-scheduler-data'
    }
  )
);
