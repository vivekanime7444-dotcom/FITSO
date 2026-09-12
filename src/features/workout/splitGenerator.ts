import type { DayOfWeek, UserProfile } from '../../store/useProfileStore';
import type { TrainingDayPlan } from '../../store/useWorkoutStore';

const DAYS_ORDER: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const generateWeeklySplit = (profile: UserProfile): TrainingDayPlan[] => {
  const { trainingDays, primaryGoal, experienceLevel } = profile;
  const count = trainingDays.length;

  let splitSequence: Omit<TrainingDayPlan, 'dayOfWeek' | 'isRestDay'>[] = [];

  // Determine the sequence of training protocols based on frequency
  if (count === 1 || count === 2) {
    splitSequence = [
      { protocolName: 'FULL BODY A', targetMuscles: ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'] },
      { protocolName: 'FULL BODY B', targetMuscles: ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'] },
    ];
  } else if (count === 3) {
    if (experienceLevel === 'Beginner' || primaryGoal === 'General Fitness') {
      splitSequence = [
        { protocolName: 'FULL BODY A', targetMuscles: ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'] },
        { protocolName: 'FULL BODY B', targetMuscles: ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'] },
        { protocolName: 'FULL BODY C', targetMuscles: ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'] },
      ];
    } else {
      splitSequence = [
        { protocolName: 'PUSH PROTOCOL', targetMuscles: ['Chest', 'Shoulders', 'Triceps'] },
        { protocolName: 'PULL PROTOCOL', targetMuscles: ['Back', 'Biceps'] },
        { protocolName: 'LEG PROTOCOL', targetMuscles: ['Legs', 'Glutes', 'Core'] },
      ];
    }
  } else if (count === 4) {
    splitSequence = [
      { protocolName: 'UPPER PROTOCOL', targetMuscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] },
      { protocolName: 'LOWER PROTOCOL', targetMuscles: ['Legs', 'Glutes', 'Core'] },
      { protocolName: 'UPPER PROTOCOL', targetMuscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] },
      { protocolName: 'LOWER PROTOCOL', targetMuscles: ['Legs', 'Glutes', 'Core'] },
    ];
  } else if (count === 5) {
    splitSequence = [
      { protocolName: 'PUSH PROTOCOL', targetMuscles: ['Chest', 'Shoulders', 'Triceps'] },
      { protocolName: 'PULL PROTOCOL', targetMuscles: ['Back', 'Biceps'] },
      { protocolName: 'LEG PROTOCOL', targetMuscles: ['Legs', 'Glutes', 'Core'] },
      { protocolName: 'UPPER PROTOCOL', targetMuscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] },
      { protocolName: 'LOWER PROTOCOL', targetMuscles: ['Legs', 'Glutes', 'Core'] },
    ];
  } else if (count >= 6) {
    splitSequence = [
      { protocolName: 'PUSH PROTOCOL A', targetMuscles: ['Chest', 'Shoulders', 'Triceps'] },
      { protocolName: 'PULL PROTOCOL A', targetMuscles: ['Back', 'Biceps'] },
      { protocolName: 'LEG PROTOCOL A', targetMuscles: ['Legs', 'Glutes', 'Core'] },
      { protocolName: 'PUSH PROTOCOL B', targetMuscles: ['Chest', 'Shoulders', 'Triceps'] },
      { protocolName: 'PULL PROTOCOL B', targetMuscles: ['Back', 'Biceps'] },
      { protocolName: 'LEG PROTOCOL B', targetMuscles: ['Legs', 'Glutes', 'Core'] },
      // 7th day will be forced rest later if needed, or conditioning
      { protocolName: 'CONDITIONING', targetMuscles: ['Conditioning', 'Core'] }, 
    ];
  }

  // Map the sequence to the actual days of the week the user selected
  const weeklyPlan: TrainingDayPlan[] = [];
  let seqIndex = 0;

  DAYS_ORDER.forEach(day => {
    if (trainingDays.includes(day)) {
      // It's a training day, assign the next protocol from the sequence
      const protocol = splitSequence[seqIndex % splitSequence.length];
      weeklyPlan.push({
        dayOfWeek: day,
        isRestDay: false,
        protocolName: protocol.protocolName,
        targetMuscles: protocol.targetMuscles,
      });
      seqIndex++;
    } else {
      // It's a rest day
      weeklyPlan.push({
        dayOfWeek: day,
        isRestDay: true,
        protocolName: 'RECOVERY PROTOCOL',
        targetMuscles: [],
      });
    }
  });

  return weeklyPlan;
};
