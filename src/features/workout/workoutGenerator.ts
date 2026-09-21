import type { UserProfile, Equipment, DayOfWeek } from '../../store/useProfileStore';
import type { WorkoutSession, WorkoutExercise, ExerciseDef } from '../../store/useWorkoutStore';
import { EXERCISE_DATABASE } from './exerciseDatabase';
import { generateWeeklySplit } from './splitGenerator';

// Helper to check if user has required equipment
const hasRequiredEquipment = (userEquip: Equipment[], requiredEquip: string[]): boolean => {
  if (requiredEquip.length === 0 || requiredEquip.includes('No Equipment')) {
    return true;
  }
  return requiredEquip.every(eq => userEquip.includes(eq as Equipment));
};

// Select random items from an array
const getRandomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const generateWorkout = (profile: UserProfile): WorkoutSession | null => {
  if (!profile.isCompleted) return null;

  // 1. Determine today's day of week
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayStr = days[new Date().getDay()];

  // 2. Generate the weekly plan to find today's protocol
  const weeklyPlan = generateWeeklySplit(profile);
  const todayPlan = weeklyPlan.find(p => p.dayOfWeek === todayStr);

  if (!todayPlan || todayPlan.isRestDay) {
    return null; // The UI handles Rest Days separately
  }

  // 3. Filter database by available equipment AND target muscles for today's protocol
  const availableExercises = EXERCISE_DATABASE.filter(ex => 
    hasRequiredEquipment(profile.equipment, ex.equipmentRequired) &&
    (todayPlan.targetMuscles.includes(ex.muscleGroup) || 
     ex.secondaryMuscles.some(sm => todayPlan.targetMuscles.includes(sm)))
  );

  if (availableExercises.length === 0) return null;

  // 4. Determine Workout Structure based on Goal and Level
  let targetExercises = 5;
  if (profile.experienceLevel === 'Beginner') targetExercises = 4;
  else if (profile.experienceLevel === 'Advanced') targetExercises = 6;

  let selectedDefs: ExerciseDef[] = [];
  
  const activeAnalysis = profile.physiqueReferences?.find(r => r.id === profile.currentPhysiqueReferenceId);

  // If Physique Goal, prioritize exercises that match the recommended categories/muscles
  let prioritizedExercises = availableExercises;
  if (profile.primaryGoal === 'Physique Goal' && activeAnalysis) {
    const { muscleGroups, recommendedExerciseCategories } = activeAnalysis;
    prioritizedExercises = availableExercises.sort((a, b) => {
       const aMatch = muscleGroups.includes(a.muscleGroup) || recommendedExerciseCategories.some(c => a.name.toLowerCase().includes(c.toLowerCase())) ? 1 : 0;
       const bMatch = muscleGroups.includes(b.muscleGroup) || recommendedExerciseCategories.some(c => b.name.toLowerCase().includes(c.toLowerCase())) ? 1 : 0;
       return bMatch - aMatch;
    });
  }

  // Try to get at least one exercise for each target muscle
  for (const muscle of todayPlan.targetMuscles) {
    if (selectedDefs.length >= targetExercises) break;
    
    const candidates = prioritizedExercises.filter(ex => ex.muscleGroup === muscle && !selectedDefs.find(s => s.id === ex.id));
    if (candidates.length > 0) {
      selectedDefs.push(getRandomItems(candidates, 1)[0]);
    }
  }

  // Fill remaining slots
  while (selectedDefs.length < targetExercises) {
    const remaining = prioritizedExercises.filter(ex => !selectedDefs.find(s => s.id === ex.id));
    if (remaining.length === 0) break; 
    // If physique goal, just take the top remaining from sorted list, else random
    if (profile.primaryGoal === 'Physique Goal') {
       selectedDefs.push(remaining[0]);
    } else {
       selectedDefs.push(getRandomItems(remaining, 1)[0]);
    }
  }

  // 5. Build WorkoutSession Object
  const exercises: WorkoutExercise[] = selectedDefs.map(def => {
    // Adjust sets/reps based on goals
    let sets = def.defaultSets;
    let reps = def.defaultReps;

    if (profile.primaryGoal === 'Build Strength' && def.movementType === 'repetition') {
      sets = def.defaultSets + 1;
      reps = Math.max(5, def.defaultReps - 4);
    } else if (profile.primaryGoal === 'Improve Endurance' && def.movementType === 'repetition') {
      reps = def.defaultReps + 5;
    } else if (profile.primaryGoal === 'Physique Goal' && activeAnalysis && def.movementType === 'repetition') {
      // Analyze emphasis
      const emphasisStr = activeAnalysis.trainingEmphasis.join(' ').toLowerCase();
      if (emphasisStr.includes('hypertrophy') || emphasisStr.includes('muscle')) {
         sets = 4;
         reps = 10;
      } else if (emphasisStr.includes('strength')) {
         sets = 5;
         reps = 6;
      }
    }

    const generatedSets = Array(sets).fill(null).map((_, i) => ({
      setNumber: i + 1,
      targetReps: def.movementType === 'repetition' ? reps : undefined,
      targetDuration: def.movementType === 'timed' ? def.defaultDuration : undefined,
      completed: false,
    }));

    return {
      exerciseId: def.id,
      sets: generatedSets
    };
  });

  return {
    id: `wk_${Date.now()}`,
    workoutName: todayPlan.protocolName,
    targetMuscles: todayPlan.targetMuscles,
    date: new Date().toISOString(),
    startTime: Date.now(),
    exercises,
    completed: false
  };
};
