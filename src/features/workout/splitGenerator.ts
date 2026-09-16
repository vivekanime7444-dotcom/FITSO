import type { DayOfWeek, UserProfile } from '../../store/useProfileStore';
import type { TrainingDayPlan } from '../../store/useWorkoutStore';

const DAYS_ORDER: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const generateWeeklySplit = (profile: UserProfile): TrainingDayPlan[] => {
  const { trainingDays, primaryGoal, experienceLevel } = profile;
  const count = trainingDays.length;

  let splitSequence: Omit<TrainingDayPlan, 'dayOfWeek' | 'isRestDay'>[] = [];

  // Determine the sequence of training protocols based on frequency
  if (profile.physiqueAnalysis && profile.physiqueAnalysis.muscleGroups) {
    const analysis = profile.physiqueAnalysis;
    const focusMuscles = analysis.muscleGroups.length > 0 ? analysis.muscleGroups : ['Full Body'];
    
    // Dynamic split based on AI analysis
    if (count <= 2) {
      splitSequence = Array(count).fill(0).map((_, i) => ({
        protocolName: `PHYSIQUE FOCUS ${String.fromCharCode(65 + i)}`,
        targetMuscles: [...focusMuscles, 'Core']
      }));
    } else if (count === 3) {
      splitSequence = [
        { protocolName: 'AI PRIMARY FOCUS', targetMuscles: focusMuscles },
        { protocolName: 'SECONDARY DEVELOPMENT', targetMuscles: ['Legs', 'Back', 'Core'].filter(m => !focusMuscles.includes(m)) },
        { protocolName: 'FULL BODY INTEGRATION', targetMuscles: ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'] }
      ];
    } else if (count === 4) {
      splitSequence = [
        { protocolName: 'AI PRIMARY FOCUS A', targetMuscles: focusMuscles },
        { protocolName: 'SECONDARY DEVELOPMENT A', targetMuscles: ['Legs', 'Glutes', 'Core'] },
        { protocolName: 'AI PRIMARY FOCUS B', targetMuscles: focusMuscles },
        { protocolName: 'SECONDARY DEVELOPMENT B', targetMuscles: ['Back', 'Chest', 'Shoulders'].filter(m => !focusMuscles.includes(m)) }
      ];
    } else {
      splitSequence = [
        { protocolName: 'AI PRIMARY FOCUS A', targetMuscles: focusMuscles },
        { protocolName: 'SUPPORTING MUSCLES', targetMuscles: ['Legs', 'Back', 'Core'].filter(m => !focusMuscles.includes(m)) },
        { protocolName: 'AI PRIMARY FOCUS B', targetMuscles: focusMuscles },
        { protocolName: 'HYPERTROPHY VOLUME', targetMuscles: ['Chest', 'Shoulders', 'Arms'].filter(m => !focusMuscles.includes(m)) },
        { protocolName: 'CONDITIONING & CORE', targetMuscles: ['Conditioning', 'Core'] }
      ];
      // Pad to exact count if needed
      while (splitSequence.length < count) {
        splitSequence.push({ protocolName: 'FULL BODY BURN', targetMuscles: ['Chest', 'Back', 'Legs', 'Core'] });
      }
    }
  } else if (count === 1 || count === 2) {
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

  // Ensure targetMuscles are not empty due to filter
  splitSequence.forEach(seq => {
    if (seq.targetMuscles.length === 0) seq.targetMuscles = ['Core', 'Conditioning'];
  });

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
