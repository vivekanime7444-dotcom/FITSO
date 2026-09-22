import { useProfileStore } from '../../store/useProfileStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useSchedulerStore, type WorkoutScheduleDay, type ScheduleStatus } from '../../store/useSchedulerStore';
import { useHabitStore } from '../../store/useHabitStore';
import { SystemVoiceService } from './SystemVoiceService';

export class WorkoutSchedulerService {
  private static timerId: ReturnType<typeof setInterval> | null = null;
  private static lastNotificationDate: string | null = null;

  public static initialize() {
    this.syncSchedule();
    this.startTimeCheck();
  }

  // 1. Synchronize the weekly plan with actual dates
  public static syncSchedule() {
    const profile = useProfileStore.getState().profile;
    const weeklyPlan = useWorkoutStore.getState().weeklyPlan;
    const scheduler = useSchedulerStore.getState();

    if (!profile.isCompleted || weeklyPlan.length === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // If we already generated this week (based on last generated date), we only need to update statuses
    let currentSchedule = [...scheduler.weeklySchedule];
    const daysOrder = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // Generate a fresh 7-day schedule starting from today if empty or too old (e.g. past week)
    const needsNewSchedule = currentSchedule.length === 0 || 
      (scheduler.lastGeneratedDate && new Date(todayStr).getTime() - new Date(scheduler.lastGeneratedDate).getTime() > 6 * 24 * 60 * 60 * 1000);

    if (needsNewSchedule) {
      currentSchedule = [];
      
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const targetDateStr = targetDate.toISOString().split('T')[0];
        const dayOfWeekStr = daysOrder[targetDate.getDay()];
        
        const template = weeklyPlan.find(p => p.dayOfWeek === dayOfWeekStr);
        
        if (template) {
          let status: ScheduleStatus = template.isRestDay ? 'REST' : 'UPCOMING';
          if (i === 0) status = 'TODAY'; // First day is always today
          
          currentSchedule.push({
            date: targetDateStr,
            dayOfWeek: dayOfWeekStr,
            protocolName: template.protocolName,
            isRestDay: template.isRestDay,
            targetMuscles: template.targetMuscles,
            status: status
          });
        }
      }
      scheduler.setWeeklySchedule(currentSchedule);
    } else {
      // Update statuses based on current date
      let hasChanges = false;
      
      currentSchedule = currentSchedule.map(day => {
        const dayDate = new Date(day.date);
        dayDate.setHours(0,0,0,0);
        const todayZero = new Date(todayStr);
        todayZero.setHours(0,0,0,0);
        
        let newStatus = day.status;
        
        if (dayDate < todayZero && (day.status === 'UPCOMING' || day.status === 'TODAY')) {
          newStatus = day.isRestDay ? 'REST' : 'MISSED'; // Missed a workout
          hasChanges = true;
        } else if (day.date === todayStr && day.status !== 'COMPLETED' && day.status !== 'MISSED') {
          newStatus = 'TODAY';
          hasChanges = true;
        }
        
        return { ...day, status: newStatus };
      });

      if (hasChanges) {
        scheduler.setWeeklySchedule(currentSchedule);
      }
    }
  }

  // 2. Request Notification Permission
  public static async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') {
      useSchedulerStore.getState().setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      useSchedulerStore.getState().setNotificationsEnabled(granted);
      return granted;
    }
    
    return false;
  }

  // 3. Start interval to check time for reminders
  private static startTimeCheck() {
    if (this.timerId) clearInterval(this.timerId);
    
    // Check every minute
    this.timerId = setInterval(() => {
      this.checkAndFireReminder();
    }, 60000);
    
    // Check immediately on start too
    this.checkAndFireReminder();
  }

  private static firedHabits: Set<string> | null = null;
  private static firedHabitsDate: string | null = null;

  private static checkAndFireReminder() {
    const profile = useProfileStore.getState().profile;
    const scheduler = useSchedulerStore.getState();
    
    if (!scheduler.notificationsEnabled) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentHour = today.getHours();
    const currentMin = today.getMinutes();
    
    // 1. Check Workout Reminder
    if (profile.preferredWorkoutTime && this.lastNotificationDate !== todayStr) {
      const todaySchedule = scheduler.weeklySchedule.find(d => d.date === todayStr);
      if (todaySchedule && todaySchedule.status !== 'COMPLETED') {
        const [prefHour, prefMin] = profile.preferredWorkoutTime.split(':').map(Number);
        if (currentHour === prefHour && currentMin === prefMin) {
          this.fireNotification(todaySchedule);
          this.lastNotificationDate = todayStr;
        }
      }
    }

    // 2. Check Habit Reminders
    const { getTodayHabits } = useHabitStore.getState();
    const todayHabits = getTodayHabits();
    
    todayHabits.forEach(({ habit, completed }) => {
      if (!completed && habit.reminderTime) {
        const [hHour, hMin] = habit.reminderTime.split(':').map(Number);
        if (currentHour === hHour && currentMin === hMin) {
           if (!this.firedHabits) this.firedHabits = new Set();
           if (this.firedHabitsDate !== todayStr) {
               this.firedHabits.clear();
               this.firedHabitsDate = todayStr;
           }
           if (!this.firedHabits.has(habit.id)) {
               this.fireHabitNotification(habit);
               this.firedHabits.add(habit.id);
           }
        }
      }
    });
  }

  private static fireHabitNotification(habit: any) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    
    new Notification('HABIT REMINDER', {
      body: `It's time to: ${habit.name}`,
      icon: '/sl_avatar.jpg',
      badge: '/sl_avatar.jpg'
    });
    
    SystemVoiceService.init();
    const utterance = new SpeechSynthesisUtterance(`Reminder: ${habit.name}`);
    utterance.pitch = 0.85; 
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  private static fireNotification(day: WorkoutScheduleDay) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const title = day.isRestDay ? 'RECOVERY PROTOCOL' : 'TRAINING PROTOCOL READY';
    const body = day.isRestDay 
      ? 'Today is a scheduled recovery day.'
      : `${day.protocolName} is scheduled for today. Prepare for your mission.`;

    new Notification(title, {
      body,
      icon: '/sl_avatar.jpg',
      badge: '/sl_avatar.jpg'
    });

    // We can also trigger the voice if they happen to have the app open
    if (!day.isRestDay) {
      SystemVoiceService.init();
      // We will just do a standard voice announce if app is open
      const utterance = new SpeechSynthesisUtterance("Your training protocol is ready.");
      // Apply same settings as SystemVoiceService internally
      utterance.pitch = 0.85; 
      utterance.rate = 0.95;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      SystemVoiceService.init();
      const utterance = new SpeechSynthesisUtterance("Recovery protocol active.");
      utterance.pitch = 0.85; 
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }

  public static stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
