import { UserProfile, Equipment } from '../../store/useProfileStore';
import { WorkoutSession, WorkoutExercise, ExerciseDef } from '../../store/useWorkoutStore';
import { EXERCISE_DATABASE } from './exerciseDatabase';

// Helper to check if user has required equipment
const hasRequiredEquipment = (userEquip: Equipment[], requiredEquip: string[]): boolean => {
  if (requiredEquip.length === 0 || requiredEquip.includes('No Equipment')) {
    return true;
  }
  
  // If an exercise requires multiple pieces of equipment (e.g. ['Dumbbells', 'Bench']),
  // the user must have ALL of them. Or we can just say "at least one primary".
  // Let's enforce strict: User must have all required equipment.
  // Exception: 'Bench' can sometimes be skipped for floor press, but we've separated those.
  return requiredEquip.every(eq => userEquip.includes(eq as Equipment));
};

// Select random items from an array
const getRandomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const generateWorkout = (profile: UserProfile): WorkoutSession | null => {
  if (!profile.isCompleted) return null;

  // 1. Filter database by available equipment
  const availableExercises = EXERCISE_DATABASE.filter(ex => 
    hasRequiredEquipment(profile.equipment, ex.equipmentRequired)
  );

  if (availableExercises.length === 0) return null;

  // 2. Determine Workout Structure based on Goal and Level
  let workoutName = 'GENERAL PROTOCOL';
  let targetExercises = 5;
  let focusGroups: string[] = [];

  switch (profile.primaryGoal) {
    case 'Build Muscle':
      workoutName = 'HYPERTROPHY PROTOCOL';
      targetExercises = profile.experienceLevel === 'Beginner' ? 4 : 6;
      break;
    case 'Build Strength':
      workoutName = 'STRENGTH PROTOCOL';
      targetExercises = profile.experienceLevel === 'Beginner' ? 4 : 5;
      break;
    case 'Improve Endurance':
      workoutName = 'ENDURANCE PROTOCOL';
      targetExercises = 6;
      focusGroups = ['Conditioning', 'Legs', 'Core'];
      break;
    default:
      workoutName = 'SYSTEM TRAINING';
      targetExercises = 5;
  }

  // Very basic "Full Body" split for now
  // In a real system, we'd check what day of the week it is, but for Phase 2 we just generate a balanced session.
  
  const selectedDefs: ExerciseDef[] = [];
  
  // Try to get 1 Chest, 1 Back, 1 Leg, 1 Shoulder, 1 Core if possible
  const categories = ['Chest', 'Back', 'Legs', 'Shoulders', 'Core', 'Conditioning'];
  
  for (const cat of categories) {
    if (selectedDefs.length >= targetExercises) break;
    
    const candidates = availableExercises.filter(ex => ex.muscleGroup === cat);
    if (candidates.length > 0) {
      selectedDefs.push(getRandomItems(candidates, 1)[0]);
    }
  }

  // Fill remaining slots with random exercises
  while (selectedDefs.length < targetExercises) {
    const remaining = availableExercises.filter(ex => !selectedDefs.find(s => s.id === ex.id));
    if (remaining.length === 0) break; // Exhausted available exercises
    selectedDefs.push(getRandomItems(remaining, 1)[0]);
  }

  // 3. Build WorkoutSession Object
  const exercises: WorkoutExercise[] = selectedDefs.map(def => {
    // Adjust sets/reps based on goals (Simplified)
    let sets = def.defaultSets;
    let reps = def.defaultReps;
    let rest = def.defaultRest;

    if (profile.primaryGoal === 'Build Strength' && def.movementType === 'repetition') {
      sets = def.defaultSets + 1;
      reps = Math.max(5, def.defaultReps - 4);
      rest = 120;
    } else if (profile.primaryGoal === 'Improve Endurance' && def.movementType === 'repetition') {
      reps = def.defaultReps + 5;
      rest = 45;
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
    workoutName,
    date: new Date().toISOString(),
    startTime: Date.now(),
    exercises,
    completed: false
  };
};
